#!/usr/bin/env node
// Convert `server/tmp/Products Spec.csv` which has header: SKU,Spec1,Spec2,...
// into `server/tmp/Products Spec.cleaned.csv` with header: sku,specs
// where `specs` is a JSON object (stringified) containing only spec name -> value
// pairs for non-empty values. The JSON is CSV-quoted and double-quotes inside
// are escaped according to CSV by doubling them (see `example spec.csv`).

const fs = require('fs');
const path = require('path');

const IN = process.argv[2] || path.resolve(process.cwd(), 'server', 'tmp', 'Products Spec.csv');
const OUT = process.argv[3] || path.resolve(process.cwd(), 'server', 'tmp', 'Products Spec.cleaned.csv');

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

function csvEscapeField(s) {
  if (s == null) return '';
  const str = String(s);
  // If field contains double quotes, commas or newlines, wrap in quotes and escape inner quotes
  if (/[",\n\r]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

(async function main(){
  try {
    if (!fs.existsSync(IN)) {
      console.error('Input file not found:', IN);
      process.exit(2);
    }
    const raw = fs.readFileSync(IN, 'utf8');
    const rows = parseCSV(raw);
    if (!rows || rows.length < 1) {
      console.error('No rows to process');
      process.exit(3);
    }
    const header = rows[0].map(h => (h||'').toString().trim());
    // find index of SKU column (case-insensitive match to SKU)
    const skuIndex = header.findIndex(h => String(h).trim().toLowerCase() === 'sku');
    if (skuIndex === -1) {
      console.error('No SKU header found in input');
      process.exit(4);
    }

    // prepare output lines
    const outLines = [];
    outLines.push('sku,specs');

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;
      const sku = (row[skuIndex] || '').toString().trim();
      if (!sku) continue; // skip rows without sku

      const specsObj = {};
      for (let c = 0; c < header.length; c++) {
        if (c === skuIndex) continue;
        const key = header[c] && header[c].toString().trim();
        if (!key) continue;
        const rawVal = (row[c] || '').toString().trim();
        // Treat a single dash '-' as an empty/placeholder value and ignore it
        if (rawVal !== '' && rawVal !== '-') {
          specsObj[key] = rawVal;
        }
      }

      // stringify specs as JSON and CSV-quote it as in example (escape quotes by doubling)
      const json = JSON.stringify(specsObj);
      const csvField = csvEscapeField(json);
      outLines.push(`${sku},${csvField}`);
    }

    fs.writeFileSync(OUT, outLines.join('\n'));
    console.log('Wrote cleaned specs to', OUT);
    process.exit(0);
  } catch (err) {
    console.error('Failed:', err && err.message || err);
    process.exit(5);
  }
})();
