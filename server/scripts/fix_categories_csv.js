const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '..', 'tmp', 'import-template-produkti-image2.csv');
const backupPath = filePath + '.bak';

function parseCSVLine(line) {
  const fields = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { // escaped quote
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      fields.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  fields.push(cur);
  return fields;
}

function csvSafe(field) {
  if (field == null) return '';
  const needsQuote = field.includes(',') || field.includes('"') || field.includes('\n') || field.includes('\r');
  if (!needsQuote) return field;
  // escape inner quotes by doubling
  const escaped = field.replace(/"/g, '""');
  return '"' + escaped + '"';
}

function transformCategoriesField(value) {
  if (!value) return value;
  // value is the unescaped field (quotes removed by parser)
  value = value.trim();
  if (!value.startsWith('[') || !value.endsWith(']')) return value;
  // if already contains double quotes around items, assume it's correct
  if (value.indexOf('"') !== -1) return value;
  const inner = value.slice(1, -1).trim();
  if (inner === '') return '[]';
  const parts = inner.split(',').map(s => s.trim()).filter(Boolean);
  const quoted = parts.map(p => JSON.stringify(p));
  return '[' + quoted.join(',') + ']';
}

try {
  if (!fs.existsSync(filePath)) {
    console.error('CSV file not found:', filePath);
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  fs.writeFileSync(backupPath, raw, 'utf8');

  const lines = raw.split(/\r?\n/);
  if (lines.length === 0) {
    console.error('CSV empty');
    process.exit(1);
  }

  const header = lines[0];
  const headerFields = parseCSVLine(header);
  const categoriesIndex = headerFields.findIndex(h => h.trim() === 'categories');
  if (categoriesIndex === -1) {
    console.error('Header does not contain `categories` column');
    process.exit(1);
  }

  const out = [header];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') {
      out.push(line);
      continue;
    }
    const fields = parseCSVLine(line);
    // If the parsed fields length is less than header, join trailing lines (robustness skipped)
    if (categoriesIndex < fields.length) {
      const original = fields[categoriesIndex];
      const transformed = transformCategoriesField(original);
      fields[categoriesIndex] = transformed;
    }
    const serialized = fields.map(f => csvSafe(f)).join(',');
    out.push(serialized);
  }

  fs.writeFileSync(filePath, out.join('\n'), 'utf8');
  console.log('Updated CSV written to', filePath);
  console.log('Backup saved to', backupPath);
} catch (err) {
  console.error('Error:', err && err.message ? err.message : err);
  process.exit(1);
}
