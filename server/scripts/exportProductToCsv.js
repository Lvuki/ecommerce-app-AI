#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { argv } = require('process');

// Simple helper to escape CSV fields
function csvEscape(value) {
  if (value === undefined || value === null) return '';
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  // escape double quotes
  return `"${s.replace(/"/g, '""')}"`;
}

async function main() {
  const args = argv.slice(2);
  let id = null;
  let out = path.join(__dirname, '..', 'tmp', 'import-template-produkti-prov.csv');
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--id' && args[i+1]) { id = args[i+1]; i++; }
    if (args[i] === '--out' && args[i+1]) { out = args[i+1]; i++; }
  }
  if (!id) {
    console.error('Usage: node exportProductToCsv.js --id <productId> [--out <path>]');
    process.exit(2);
  }

  // load models
  const models = require('../models');
  const Product = models.Product;
  if (!Product) {
    console.error('Could not load Product model from ../models');
    process.exit(3);
  }

  const product = await Product.findByPk(id);
  if (!product) {
    console.error(`Product with id ${id} not found`);
    process.exit(4);
  }

  const p = product.toJSON();

  // Build category_top, category_child1, category_child2 and categories array
  let category_top = '';
  let category_child1 = '';
  let category_child2 = '';
  let categoriesArray = [];
  if (Array.isArray(p.categories) && p.categories.length) {
    categoriesArray = p.categories.map(x => (typeof x === 'string' ? x : (x && x.name) || String(x)));
  } else if (p.category) {
    // try splitting by '>' or '›' or '/' or ' - '
    const parts = String(p.category).split(/\s*[›>\/\\-]\s*/).map(s => s.trim()).filter(Boolean);
    if (parts.length) categoriesArray = parts;
  }
  if (categoriesArray.length) {
    category_top = categoriesArray[0] || '';
    category_child1 = categoriesArray[1] || '';
    category_child2 = categoriesArray[2] || '';
  }

  const headers = [
    'name','description','price','salePrice','offerPrice','offerFrom','offerTo','image','images',
    'category_top','category_child1','category_child2','categories','category','sku','brand','stock','specs','garancia','modeli','importReference'
  ];

  const row = [];
  row.push(csvEscape(p.name || ''));
  row.push(csvEscape(p.description || ''));
  row.push(csvEscape(p.price != null ? p.price : ''));
  row.push(csvEscape(p.salePrice != null ? p.salePrice : ''));
  row.push(csvEscape(p.offerPrice != null ? p.offerPrice : ''));
  row.push(csvEscape(p.offerFrom ? new Date(p.offerFrom).toISOString().slice(0,10) : ''));
  row.push(csvEscape(p.offerTo ? new Date(p.offerTo).toISOString().slice(0,10) : ''));
  row.push(csvEscape(p.image || ''));
  // images as semicolon separated if array
  if (Array.isArray(p.images) && p.images.length) {
    row.push(csvEscape(p.images.join(';')));
  } else {
    row.push(csvEscape(p.images || ''));
  }
  row.push(csvEscape(category_top));
  row.push(csvEscape(category_child1));
  row.push(csvEscape(category_child2));
  row.push(csvEscape(JSON.stringify(categoriesArray)));
  row.push(csvEscape(p.category || ''));
  row.push(csvEscape(p.sku || p.kodi_i_produktit || ''));
  row.push(csvEscape(p.brand || p.marka || ''));
  row.push(csvEscape(p.stock != null ? p.stock : ''));
  // specs as JSON string if object
  if (p.specs && typeof p.specs !== 'string') {
    row.push(csvEscape(JSON.stringify(p.specs)));
  } else {
    row.push(csvEscape(p.specs || ''));
  }
  row.push(csvEscape(p.garancia || ''));
  row.push(csvEscape(p.modeli || ''));
  row.push(csvEscape(`Product export id=${p.id}`));

  const csv = headers.join(',') + '\n' + row.join(',') + '\n';

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, csv, 'utf8');
  console.log('Wrote CSV to', out);
}

main().catch(err => { console.error(err); process.exit(1); });
