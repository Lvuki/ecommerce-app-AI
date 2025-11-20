/**
 * exportProductToTemplate.js
 *
 * Usage:
 *   node server/scripts/exportProductToTemplate.js --name "test 33" --out server/tmp/export-test33.csv
 *
 * This script reads DB credentials from .env (via models/index.js), connects to the DB and finds a product by name
 * (case-insensitive). It writes a single-row CSV matching the import template header so you can use it as a reference.
 */

const fs = require('fs');
const path = require('path');

const args = require('minimist')(process.argv.slice(2), { string: ['name', 'out'], default: { out: 'server/tmp/export-product.csv' } });
const nameQuery = (args.name || '').trim();
const OUT = path.resolve(process.cwd(), args.out);

if (!nameQuery) {
  console.error('Provide --name "product name"');
  process.exit(1);
}

(async function main(){
  try {
    const db = require('../models');
    // try authenticate
    await db.sequelize.authenticate();
    console.log('DB connection OK');

    const Product = db.Product;
    const sequelize = db.sequelize;

    // use case-insensitive search by name
    const p = await Product.findOne({ where: sequelize.where(sequelize.fn('lower', sequelize.col('name')), nameQuery.toLowerCase()) });
    if (!p) {
      console.error('Product not found with name:', nameQuery);
      process.exit(2);
    }

    const prod = p.get({ plain: true });

    // Map fields to template columns
    const product_code = prod.sku || prod.kodi_i_produktit || `DB-${prod.id}`;
    const name = prod.name || '';
    const price = (prod.price != null) ? prod.price : '';
    const brand = prod.brand || prod.marka || '';
    const model = prod.modeli || prod.model || '';
    const warranty_months = prod.garancia || '';

    // categories: try JSON or string
    let cat=''; let child1=''; let child2='';
    if (prod.categories) {
      try {
        const arr = Array.isArray(prod.categories) ? prod.categories : JSON.parse(prod.categories);
        if (arr && arr.length) { cat = arr[0]||''; child1 = arr[1]||''; child2 = arr[2]||''; }
      } catch (err) {
        const parts = String(prod.categories).split('/').map(s=>s.trim()).filter(Boolean);
        cat = parts[0]||''; child1 = parts[1]||''; child2 = parts[2]||'';
      }
    } else if (prod.category) {
      const parts = String(prod.category).split('/').map(s=>s.trim()).filter(Boolean);
      cat = parts[0]||''; child1 = parts[1]||''; child2 = parts[2]||'';
    }

    // features/specs
    let features = '';
    if (prod.specs) {
      try {
        const s = Array.isArray(prod.specs) ? prod.specs : (typeof prod.specs === 'string' ? JSON.parse(prod.specs) : prod.specs);
        if (Array.isArray(s)) features = s.join(';');
        else if (typeof s === 'object' && s !== null) features = Object.keys(s).map(k => `${k}:${s[k]}`).join(';');
        else if (typeof s === 'string') features = s;
      } catch (err) { features = String(prod.specs || ''); }
    }

    // images
    let image_urls = '';
    if (prod.images) {
      try {
        const imgs = Array.isArray(prod.images) ? prod.images : JSON.parse(prod.images);
        if (Array.isArray(imgs)) image_urls = imgs.join(';');
      } catch (err) { image_urls = prod.images || prod.image || ''; }
    } else { image_urls = prod.image || ''; }

    const sku = prod.sku || prod.kodi_i_produktit || '';
    const ean = prod.ean || prod.EAN || '';
    const stock_qty = (prod.stock != null) ? prod.stock : '';
    const weight_kg = prod.weight_kg || prod.pesha || '';
    const dimensions_cm = prod.dimensions || '';

    const headers = ['product_code','name','price','brand','model','warranty_months','category','child_category_1','child_category_2','description','short_description','features','image_urls','sku','ean','stock_qty','weight_kg','dimensions_cm','category_specs'];

    const description = prod.description || '';
    const short_description = prod.shortDescription || prod.short_description || '';

    const row = [product_code,name,price,brand,model,warranty_months,cat,child1,child2,description,short_description,features,image_urls,sku,ean,stock_qty,weight_kg,dimensions_cm,''];

    function csvEscape(v) {
      if (v == null) return '';
      const s = String(v);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g,'""') + '"';
      }
      return s;
    }

    const content = headers.join(',') + '\n' + row.map(csvEscape).join(',') + '\n';
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, content, 'utf8');
    console.log('Wrote export to', OUT);
    process.exit(0);

  } catch (err) {
    console.error('Failed to export product:', err && err.message ? err.message : err);
    process.exit(3);
  }
})();
