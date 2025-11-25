#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { sequelize, Product } = require('../models');

const args = require('minimist')(process.argv.slice(2), {
  string: ['csv'],
  boolean: ['dry'],
  default: { csv: path.resolve(process.cwd(), 'server', 'tmp', 'import-template-produkti-prov4-updated.csv'), dry: false },
});

const CSV_PATH = path.resolve(process.cwd(), args.csv);

function parseCSV(text) {
  const rows = [];
  let i = 0;
  const len = text.length;
  let row = [];
  let field = '';
  let inQuotes = false;

  while (i < len) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < len && text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        field += ch;
        i++;
        continue;
      }
    }
    if (ch === '"') { inQuotes = true; i++; continue; }
    if (ch === ',') { row.push(field); field = ''; i++; continue; }
    if (ch === '\r') { i++; continue; }
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += ch; i++;
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

function tryJsonParse(s) {
  if (!s) return null;
  s = String(s).trim();
  if (!s) return null;
  try { return JSON.parse(s); } catch (err) { return null; }
}

(async function main(){
  console.log('Import CSV to DB — CSV:', CSV_PATH, ' dry:', !!args.dry);
  if (!fs.existsSync(CSV_PATH)) {
    console.error('CSV file not found:', CSV_PATH);
    process.exit(1);
  }

  const raw = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parseCSV(raw);
  if (!rows || rows.length < 1) { console.error('Empty or invalid CSV'); process.exit(1); }
  const header = rows[0].map(h => (h||'').toString().trim());
  const data = rows.slice(1);

  const idx = {};
  header.forEach((h,i)=> idx[h]=i);

  let imported = 0, created = 0, updated = 0, failed = 0;

  if (!args.dry) {
    // only attempt DB connection when not running in dry mode
    await sequelize.authenticate();
  }

  for (let r = 0; r < data.length; r++) {
    const row = data[r];
    // helper to read column by name safely
    const val = (name) => { const i = idx[name]; return i == null ? '' : (row[i] || '').toString().trim(); };

    const product = {};
    product.name = val('name') || val('Name') || null;
    product.description = val('description') || null;
    product.price = parseFloat(val('price')) || 0;
    const sp = val('salePrice') || val('sale_price') || val('sale');
    product.salePrice = sp ? parseFloat(sp) : null;
    const op = val('offerPrice'); product.offerPrice = op ? parseFloat(op) : null;
    product.offerFrom = val('offerFrom') ? new Date(val('offerFrom')) : null;
    product.offerTo = val('offerTo') ? new Date(val('offerTo')) : null;
    product.image = val('image') || null;

    // images column may be JSON array or semicolon list
    const imagesRaw = val('images');
    const imagesJson = tryJsonParse(imagesRaw);
    if (imagesJson && Array.isArray(imagesJson)) product.images = imagesJson; else if (imagesRaw) product.images = imagesRaw.split(';').map(s=>s.trim()).filter(Boolean);

    // categories may be JSON
    const categoriesRaw = val('categories');
    const categoriesJson = tryJsonParse(categoriesRaw);
    if (categoriesJson && Array.isArray(categoriesJson)) product.categories = categoriesJson; else if (categoriesRaw) {
      if (categoriesRaw.startsWith('[')) {
        try { product.categories = JSON.parse(categoriesRaw); } catch(e) { product.categories = [categoriesRaw]; }
      } else if (categoriesRaw.includes('///')) product.categories = categoriesRaw.split('///').map(s=>s.trim()).filter(Boolean);
      else product.categories = categoriesRaw.split(',').map(s=>s.trim()).filter(Boolean);
    }

    product.category = val('category') || null;
    product.sku = val('sku') || val('kodi_i_produktit') || null;
    product.brand = val('brand') || null;
    product.stock = parseInt(val('stock')) || 0;

    // specs may already be JSON or semi-structured text
    const specsRaw = val('specs');
    const specsJson = tryJsonParse(specsRaw);
    product.specs = specsJson || (specsRaw ? { raw: specsRaw } : null);

    product.garancia = val('garancia') || null;
    product.modeli = val('modeli') || null;

    // skip rows without a name
    if (!product.name) { console.log('Skipping row', r+1, '- missing name'); continue; }

    try {
      if (args.dry) {
        console.log('DRY:', product.sku || '(no sku)', product.name);
        imported++;
        continue;
      }

      if (product.sku) {
        // upsert by sku
        await Product.upsert(product, { where: { sku: product.sku } });
        imported++; updated++; // optimistic: upsert either created or updated
      } else {
        await Product.create(product);
        imported++; created++;
      }
    } catch (err) {
      console.error('Failed to import row', r+1, 'error:', err && err.message || err);
      failed++;
    }
  }

  console.log('Import complete. total:', data.length, 'processed:', imported, 'created:', created, 'updated:', updated, 'failed:', failed);
  await sequelize.close();
})();
