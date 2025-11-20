#!/usr/bin/env node
// Resync product.categories to a normalized top->child1->child2 array using the
// Category table. Creates backups in server/tmp and writes a preview JSON.
// Usage:
//   node server/scripts/resyncProductCategories.js        # dry-run, writes preview
//   node server/scripts/resyncProductCategories.js --apply # apply changes (will write backups first)

const path = require('path');
const fs = require('fs');

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const ts = Date.now();
  const tmp = path.resolve(__dirname, '..', 'tmp');
  if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true });

  const models = require(path.resolve(__dirname, '..', 'models'));
  const { Product, Category, sequelize } = models;

  console.log('Connecting to DB...');
  await sequelize.authenticate();

  console.log('Loading products and categories...');
  const [productsRows, categoriesRows] = await Promise.all([
    Product.findAll(),
    Category.findAll(),
  ]);

  const products = productsRows.map(p => (p && typeof p.toJSON === 'function') ? p.toJSON() : p);
  const categories = categoriesRows.map(c => (c && typeof c.toJSON === 'function') ? c.toJSON() : c);

  const productsBackupPath = path.join(tmp, `products-backup-${ts}.json`);
  const categoriesBackupPath = path.join(tmp, `categories-backup-${ts}.json`);
  fs.writeFileSync(productsBackupPath, JSON.stringify(products, null, 2), 'utf8');
  fs.writeFileSync(categoriesBackupPath, JSON.stringify(categories, null, 2), 'utf8');
  console.log('Wrote backups:', productsBackupPath, categoriesBackupPath);

  // Build quick lookup by name and by id
  const catById = new Map();
  const catByName = new Map();
  for (const c of categories) {
    catById.set(c.id, c);
    if (c.name) catByName.set(String(c.name).trim().toLowerCase(), c);
  }

  const preview = [];

  for (const p of products) {
    const oldCats = Array.isArray(p.categories) ? p.categories : (typeof p.categories === 'string' ? (() => { try { return JSON.parse(p.categories); } catch { return [p.categories]; } })() : []);
    const nameCandidates = [];
    if (p.category) nameCandidates.push(String(p.category).trim());
    if (Array.isArray(oldCats)) for (const c of oldCats) if (c) nameCandidates.push(String(c).trim());

    let found = null;
    for (const cand of nameCandidates) {
      const key = String(cand || '').toLowerCase();
      if (catByName.has(key)) { found = catByName.get(key); break; }
    }

    let newCats = null;
    if (found) {
      // walk up to root
      const names = [];
      let cur = found;
      while (cur) {
        names.push(cur.name);
        if (!cur.parentId) break;
        cur = catById.get(cur.parentId) || null;
      }
      // names currently bottom->top, reverse to top->... which is desired
      newCats = names.slice().reverse();
    }

    const willUpdate = Array.isArray(newCats) && JSON.stringify(newCats) !== JSON.stringify(oldCats || []);
    preview.push({ id: p.id, name: p.name, sku: p.sku || p.kodi_i_produktit || null, oldCategories: oldCats || [], newCategories: newCats || null, willUpdate });
  }

  const previewPath = path.join(tmp, `products-categories-resync-preview-${ts}.json`);
  fs.writeFileSync(previewPath, JSON.stringify(preview, null, 2), 'utf8');
  console.log('Wrote preview to', previewPath);

  const toUpdate = preview.filter(x => x.willUpdate && Array.isArray(x.newCategories));
  console.log(`Products to update: ${toUpdate.length} / ${preview.length}`);

  if (!apply) {
    console.log('Dry-run complete. Run with --apply to perform updates (a backup was already written).');
    process.exit(0);
  }

  // Apply updates in a transaction
  console.log('Applying updates...');
  const t = await sequelize.transaction();
  try {
    for (const item of toUpdate) {
      await Product.update({ categories: item.newCategories }, { where: { id: item.id }, transaction: t });
    }
    await t.commit();
    console.log('Applied updates for', toUpdate.length, 'products');
    const appliedPath = path.join(tmp, `products-categories-resync-applied-${ts}.json`);
    fs.writeFileSync(appliedPath, JSON.stringify(toUpdate, null, 2), 'utf8');
    console.log('Wrote applied changes to', appliedPath);
  } catch (err) {
    await t.rollback();
    console.error('Update failed, rolled back. Error:', err && err.stack ? err.stack : err);
    process.exit(2);
  }
}

main().catch(err => { console.error('Unexpected error:', err && err.stack ? err.stack : err); process.exit(1); });
