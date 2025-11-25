#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const args = require('minimist')(process.argv.slice(2), {
  string: ['csv'],
  default: { csv: path.resolve(process.cwd(), 'server', 'tmp', 'import-template-produkti-image.csv') }
});

const CSV_PATH = path.resolve(process.cwd(), args.csv);
const NEW_CATEGORIES = '["TELEFONIA","SMARTPHONE","AKSESORE SMARTPHONE"]';

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

function serializeCSV(rows) {
  return rows.map(row => row.map(field => {
    if (field == null) field = '';
    const s = field.toString();
    if (s.includes('"')) return '"' + s.replace(/"/g, '""') + '"';
    if (s.includes(',') || s.includes('\n') || s.includes('\r')) return '"' + s + '"';
    return s;
  }).join(',')).join('\n') + '\n';
}

(async function main(){
  console.log('Set categories for all rows — CSV:', CSV_PATH);
  if (!fs.existsSync(CSV_PATH)) { console.error('CSV file not found:', CSV_PATH); process.exit(1); }

  const raw = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parseCSV(raw);
  if (!rows || rows.length < 1) { console.error('Empty or invalid CSV'); process.exit(1); }
  const header = rows[0].map(h => (h||'').toString().trim());
  const data = rows.slice(1);

  // find categories column name (accept a few variants)
  const candidateNames = ['categories','category','kategorite','kategoria'];
  let catIdx = -1;
  for (const name of candidateNames) {
    const i = header.findIndex(h => h.toLowerCase() === name.toLowerCase());
    if (i !== -1) { catIdx = i; break; }
  }
  if (catIdx === -1) {
    console.error('Could not find a categories column in header. Header columns:', header.join(', '));
    process.exit(1);
  }

  // backup
  const ts = Date.now();
  const backupPath = path.resolve(process.cwd(), 'server', 'tmp', `import-template-produkti-image.csv.bak.${ts}`);
  fs.copyFileSync(CSV_PATH, backupPath);
  console.log('Backup written to:', backupPath);

  // update every data row's categories column
  let updated = 0;
  for (let r = 0; r < data.length; r++) {
    const row = data[r];
    // ensure row length covers catIdx
    while (row.length <= catIdx) row.push('');
    const before = (row[catIdx]||'').toString();
    if (before !== NEW_CATEGORIES) {
      row[catIdx] = NEW_CATEGORIES;
      updated++;
    }
  }

  const outRows = [header].concat(data);
  const out = serializeCSV(outRows);

  // write safely to tmp then rename
  const tmpPath = CSV_PATH + '.tmp';
  fs.writeFileSync(tmpPath, out, 'utf8');
  try {
    fs.renameSync(tmpPath, CSV_PATH);
    console.log('Wrote and replaced:', CSV_PATH);
  } catch (err) {
    // fallback
    const fallback = CSV_PATH + '.updated';
    fs.copyFileSync(tmpPath, fallback);
    fs.unlinkSync(tmpPath);
    console.warn('Could not replace original file (rename failed). Wrote fallback:', fallback);
  }

  console.log('Rows processed:', data.length, 'rows updated:', updated);
})();
