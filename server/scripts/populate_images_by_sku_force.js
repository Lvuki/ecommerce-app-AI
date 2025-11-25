const fs = require('fs');
const path = require('path');
const { buildProductsMapping } = require('./populate_images_by_sku');

function parseLine(line, sep) {
  // Basic CSV parse that respects quotes and also treats bracketed lists [...] as a single field
  const out = [];
  let cur = '';
  let inQuotes = false;
  let bracketDepth = 0;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    // handle doubled quotes inside quoted fields
    if (ch === '"') {
      if (inQuotes && line[i+1] === '"') {
        cur += '"';
        i++; // skip escaped quote
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes) {
      if (ch === '[') { bracketDepth++; }
      else if (ch === ']') { if (bracketDepth>0) bracketDepth--; }
    }
    if (ch === sep && !inQuotes && bracketDepth === 0) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function escapeField(v) {
  if (v === undefined || v === null) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function run() {
  const productsCsv = path.resolve(__dirname, '..', '..', 'products.csv');
  const src = path.resolve(__dirname, '..', 'tmp', 'import-template-produkti-prov4-updated-latest.csv');
  const out = src + '.fixed.csv';
  const mapping = buildProductsMapping(productsCsv);

  const content = fs.readFileSync(src, 'utf8');
  const lines = content.split(/\r?\n/);
  if (lines.length === 0) throw new Error('empty target csv');
  const header = parseLine(lines[0], ',');
  const idxSku = header.findIndex(h => h.trim().toLowerCase() === 'sku');
  const idxImage = header.findIndex(h => h.trim().toLowerCase() === 'image');
  let idxSuggested = header.findIndex(h => h.trim().toLowerCase() === 'suggested_image_source');
  const outHeader = header.slice();
  let suggestedAppended = false;
  if (idxSuggested === -1) { outHeader.push('suggested_image_source'); suggestedAppended = true; }

  const outLines = [outHeader.map(escapeField).join(',')];
  let applied = 0;
  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    if (raw.trim() === '') { outLines.push(''); continue; }
    const cols = parseLine(raw, ',');
    const sku = (cols[idxSku] || '').trim();
    const mapped = mapping[sku];
    if (mapped) {
      if (idxImage !== -1) cols[idxImage] = mapped;
      if (suggestedAppended) cols.push(mapped + ' | products.csv');
      else if (idxSuggested !== -1) cols[idxSuggested] = mapped + ' | products.csv';
      applied++;
    } else {
      if (suggestedAppended) cols.push('');
    }
    outLines.push(cols.map(escapeField).join(','));
  }

  fs.writeFileSync(out, outLines.join('\n'));
  console.log('Wrote fixed CSV to', out);
  console.log('Mappings applied to', applied, 'rows');
}

if (require.main === module) run();

module.exports = { run };
