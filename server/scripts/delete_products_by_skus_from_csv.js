#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { sequelize, Product } = require('../models');
const { Op } = require('sequelize');

const args = require('minimist')(process.argv.slice(2), {
  string: ['csv'],
  boolean: ['dry','apply'],
  default: { csv: path.resolve(process.cwd(), 'server', 'tmp', 'import-template-produkti-prov4-updated.csv'), dry: true, apply: false }
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
        if (i + 1 < len && text[i + 1] === '"') { field += '"'; i += 2; continue; }
        else { inQuotes = false; i++; continue; }
      } else { field += ch; i++; continue; }
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

(async function main(){
  console.log('Delete products by SKUs from CSV — CSV:', CSV_PATH, ' apply:', !!args.apply, ' dry (no-op) default:', !!args.dry);
  if (!fs.existsSync(CSV_PATH)) { console.error('CSV file not found:', CSV_PATH); process.exit(1); }

  const raw = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parseCSV(raw);
  if (!rows || rows.length < 1) { console.error('Empty or invalid CSV'); process.exit(1); }
  const header = rows[0].map(h => (h||'').toString().trim());
  const data = rows.slice(1);

  const idx = {};
  header.forEach((h,i)=> idx[h]=i);

  const skus = new Set();
  for (let r = 0; r < data.length; r++) {
    const row = data[r];
    const val = (name) => { const i = idx[name]; return i == null ? '' : (row[i] || '').toString().trim(); };
    const sku = val('sku') || val('kodi_i_produktit') || '';
    if (sku) skus.add(sku);
  }

  if (skus.size === 0) { console.log('No SKUs found in CSV. Exiting.'); process.exit(0); }
  console.log('Unique SKUs found in CSV:', skus.size);

  await sequelize.authenticate();
  const skuArr = Array.from(skus);

  // fetch matching products
  const matches = await Product.findAll({ where: { sku: { [Op.in]: skuArr } }, attributes: ['id','sku','name','createdAt','updatedAt'] });
  console.log('Products in DB matching those SKUs:', matches.length);
  if (matches.length === 0) { await sequelize.close(); process.exit(0); }

  // show sample
  const sample = matches.slice(0, 50);
  console.log('Sample matching products (first 50):');
  sample.forEach((p,i) => console.log(i+1, 'id:', p.id, 'sku:', p.sku, 'name:', p.name || '', 'createdAt:', p.createdAt, 'updatedAt:', p.updatedAt));

  if (args.dry && !args.apply) {
    console.log('\nDRY RUN: no deletion performed. To delete these products pass --apply.');
    await sequelize.close();
    process.exit(0);
  }

  // perform deletion with backup
  const ts = Date.now();
  const backupPath = path.resolve(process.cwd(), 'server', 'tmp', `deleted-by-skus-backup-${ts}.csv`);
  const headerLine = 'id,sku,name,createdAt,updatedAt\n';
  fs.writeFileSync(backupPath, headerLine, 'utf8');
  for (const p of matches) {
    const line = `${p.id},"${(p.sku||'').replace(/"/g,'""')}","${(p.name||'').replace(/"/g,'""')}","${p.createdAt.toISOString()}","${p.updatedAt.toISOString()}"\n`;
    fs.appendFileSync(backupPath, line, 'utf8');
  }
  console.log('Backup of matching rows written to:', backupPath);

  const transaction = await sequelize.transaction();
  try {
    const ids = matches.map(m => m.id);
    const deleted = await Product.destroy({ where: { id: { [Op.in]: ids } }, transaction });
    await transaction.commit();
    console.log('Deleted rows count:', deleted);
  } catch (err) {
    console.error('Error during deletion, rolling back. error:', err && err.message || err);
    await transaction.rollback();
    process.exit(1);
  } finally {
    await sequelize.close();
  }

})();
