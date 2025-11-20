#!/usr/bin/env node
require('dotenv').config();
const { sequelize, Product } = require('../models');

(async function main(){
  try{
    await sequelize.authenticate();
    console.log('Connected to DB. Checking products for missing image/category...');

    const [res1] = await sequelize.query(
      `SELECT COUNT(*)::int AS cnt FROM "Products" WHERE (image IS NULL OR trim(image) = '')`);
    const missingImages = res1[0].cnt;

    const [res2] = await sequelize.query(
      `SELECT COUNT(*)::int AS cnt FROM "Products" WHERE (category IS NULL OR trim(category) = '' OR categories IS NULL)`);
    const missingCategories = res2[0].cnt;

    console.log('Products with missing image:', missingImages);
    console.log('Products with missing category/categories:', missingCategories);

    if (missingImages > 0) {
      const [rows] = await sequelize.query(
        `SELECT id, name, kodi_i_produktit AS sku, image FROM "Products" WHERE (image IS NULL OR trim(image) = '') ORDER BY id LIMIT 50`);
      console.log('\nSample products missing image (up to 50):');
      rows.forEach(r => console.log(`  id:${r.id} sku:${r.sku||'(no sku)'} name:${r.name}`));
    }

    if (missingCategories > 0) {
      const [rows2] = await sequelize.query(
        `SELECT id, name, kodi_i_produktit AS sku, category, categories FROM "Products" WHERE (category IS NULL OR trim(category) = '' OR categories IS NULL) ORDER BY id LIMIT 50`);
      console.log('\nSample products missing category/categories (up to 50):');
      rows2.forEach(r => console.log(`  id:${r.id} sku:${r.sku||'(no sku)'} name:${r.name} category:${r.category||''} categories:${r.categories||''}`));
    }

    await sequelize.close();
    process.exit(0);
  }catch(err){
    console.error('Failed to check DB:', err && err.message || err);
    try{ await sequelize.close(); }catch(_){ }
    process.exit(1);
  }
})();
