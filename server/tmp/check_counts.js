const path = require('path');
// Ensure we run from server directory
process.chdir(path.join(__dirname, '..'));
const db = require('../models');

async function run() {
  try {
    await db.sequelize.authenticate();
    const Category = db.Category;
    const Product = db.Product;
    const catCount = await Category.count();
    const prodCount = await Product.count();

    const cats = await Category.findAll({ attributes: ['name'] });
    const names = cats.map(c => (c.name || '').toLowerCase());

    // count products whose category string matches any category name (case-insensitive)
    const allProducts = await Product.findAll({ attributes: ['id', 'name', 'category'] });
    let matched = 0;
    allProducts.forEach(p => {
      if (!p.category) return;
      const c = p.category.toString().toLowerCase().trim();
      if (names.includes(c)) matched++;
    });

    console.log('Category count:', catCount);
    console.log('Product count:', prodCount);
    console.log('Products with category matching a category name:', matched);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(2);
  }
}

run();
