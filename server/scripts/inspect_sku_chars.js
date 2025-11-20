const fs = require('fs');
const path = require('path');
function parseLine(line, sep) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === sep && !inQuotes) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}
const p = path.resolve(__dirname, '..', 'tmp', 'import-template-produkti-prov4-updated-latest.csv');
const txt = fs.readFileSync(p, 'utf8');
const lines = txt.split(/\r?\n/);
const header = parseLine(lines[0], ',');
const idxSku = header.findIndex(h => h.trim().toLowerCase() === 'sku');
console.log('idxSku', idxSku);
const row = lines[1];
const cols = parseLine(row, ',');
const sku = cols[idxSku];
console.log('raw SKU field (visible):', JSON.stringify(sku));
console.log('length:', sku.length);
console.log('char codes:', sku.split('').map(c => c.charCodeAt(0)).slice(0, 40));
