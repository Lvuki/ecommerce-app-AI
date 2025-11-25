#!/usr/bin/env node
/**
 * mapProductsToCategories.js
 *
 * Idempotent script to map existing Product.category free-text values
 * to an existing Category.name (including subcategories). Runs in dry-run
 * mode by default. Use --apply to perform updates. A backup of affected
 * products is written before applying.
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { Product, Category, sequelize } = require('../models');

function normalize(s) {
  if (!s && s !== 0) return '';
  return String(s)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[\s\u00A0]+/g, ' ')
    .replace(/["'’`\-_.(),\/\\]/g, ' ')
    .trim()
    .toLowerCase();
}

function tokens(s) {
  return normalize(s).split(/\s+/).filter(Boolean);
}

async function buildCategoryMap() {
  const rows = await Category.findAll();
  const map = []; // { id, name, parentId, normalized }
  for (const r of rows) {
    const obj = r.toJSON ? r.toJSON() : r;
    map.push({ id: obj.id, name: obj.name, parentId: obj.parentId, normalized: normalize(obj.name) });
  }
  return map;
}

function scoreMatch(prodNorm, catNorm) {
  if (!prodNorm || !catNorm) return 0;
  if (prodNorm === catNorm) return 1.0;
  if (prodNorm.includes(catNorm) || catNorm.includes(prodNorm)) return 0.9;
  const pTokens = new Set(tokens(prodNorm));
  const cTokens = new Set(tokens(catNorm));
  if (!pTokens.size || !cTokens.size) return 0;
  let common = 0;
  for (const t of cTokens) if (pTokens.has(t)) common++;
  const overlap = common / Math.max(cTokens.size, pTokens.size);
  return overlap; // between 0 and 1
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const limit = args.find(a => a.startsWith('--limit=')) ? Number(args.find(a => a.startsWith('--limit=') ).split('=')[1]) : null;

  console.log('Building category map...');
  const cats = await buildCategoryMap();
  const catByNorm = new Map(cats.map(c => [c.normalized, c]));

  console.log(`Loaded ${cats.length} categories`);

  const products = await Product.findAll();
  console.log(`Loaded ${products.length} products`);

  const plan = [];
  for (const p of products) {
    const prod = p.toJSON ? p.toJSON() : p;
    const orig = prod.category || '';
    const norm = normalize(orig);
    if (!norm) continue;

    // try exact normalized match
    let best = null;
    let bestScore = 0;
    for (const c of cats) {
      const sc = scoreMatch(norm, c.normalized);
      if (sc > bestScore) {
        bestScore = sc;
        best = c;
      }
    }

    if (best && bestScore >= 0.6) {
      // ready to map
      if (best.name !== orig) {
        plan.push({ productId: prod.id, productTitle: prod.name, from: orig, to: best.name, score: bestScore });
      }
    }
  }

  console.log(`Planned updates: ${plan.length}`);
  if (limit) console.log(`(showing up to ${limit} items)`);

  const toShow = limit ? plan.slice(0, limit) : plan;
  toShow.forEach((u, i) => {
    console.log(`${i+1}. Product ${u.productId} "${u.productTitle}": "${u.from}" -> "${u.to}" (score ${u.score.toFixed(2)})`);
  });

  if (!apply) {
    console.log('\nDry-run complete. No changes were applied. Run with --apply to update products.');
    process.exit(0);
  }

  // Backup affected products
  const backupDir = path.join(__dirname, '..', 'tmp');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `products_backup_${ts}.json`);
  const changedIds = plan.map(p => p.productId);
  const affected = products.filter(p => changedIds.includes(p.id)).map(p => p.toJSON ? p.toJSON() : p);
  fs.writeFileSync(backupFile, JSON.stringify({ createdAt: new Date().toISOString(), count: affected.length, items: affected }, null, 2));
  console.log(`Wrote backup of ${affected.length} products to ${backupFile}`);

  // Apply updates in a transaction
  const t = await sequelize.transaction();
  try {
    let applied = 0;
    for (const u of plan) {
      // also compute categories hierarchy for the product
      const Category = require('../models').Category;
      const cat = await Category.findOne({ where: { name: u.to } });
      let catsArr = null;
      if (cat) {
        catsArr = [cat.name];
        if (cat.parentId) {
          const parent = await Category.findByPk(cat.parentId);
          if (parent) catsArr.push(parent.name);
          if (parent && parent.parentId) {
            const grand = await Category.findByPk(parent.parentId);
            if (grand) catsArr.push(grand.name);
          }
        }
      }
      await Product.update({ category: u.to, categories: catsArr }, { where: { id: u.productId }, transaction: t });
      applied++;
    }
    await t.commit();
    console.log(`Applied ${applied} updates.`);
    process.exit(0);
  } catch (e) {
    await t.rollback();
    console.error('Failed to apply updates:', e);
    process.exit(2);
  }
}

main().catch(err => { console.error(err); process.exit(2); });
