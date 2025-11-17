#!/usr/bin/env node
/**
 * backfillProductCategories.js
 * Iterate all products and populate the `categories` JSON field based on the existing
 * `category` string and the Category table hierarchy.
 */
const { Product, Category, sequelize } = require('../models');

async function buildCatsForName(name) {
  if (!name) return null;
  const cat = await Category.findOne({ where: { name } });
  if (!cat) return null;
  const arr = [cat.name];
  if (cat.parentId) {
    const parent = await Category.findByPk(cat.parentId);
    if (parent) arr.push(parent.name);
    if (parent && parent.parentId) {
      const grand = await Category.findByPk(parent.parentId);
      if (grand) arr.push(grand.name);
    }
  }
  return arr;
}

async function main() {
  const products = await Product.findAll();
  console.log(`Found ${products.length} products`);
  const t = await sequelize.transaction();
  try {
    let updated = 0;
    for (const p of products) {
      const prod = p.toJSON ? p.toJSON() : p;
      if (!prod.category) continue;
      const cats = await buildCatsForName(prod.category);
      if (cats) {
        await Product.update({ categories: cats }, { where: { id: prod.id }, transaction: t });
        updated++;
      }
    }
    await t.commit();
    console.log(`Updated ${updated} products with categories`);
  } catch (e) {
    await t.rollback();
    console.error('Failed', e);
  }
}

main().catch(e => { console.error(e); process.exit(2); });
