const fs = require('fs');
const path = require('path');

function parseLine(line, sep) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  let bracketDepth = 0;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i+1] === '"') { cur += '"'; i++; continue; }
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes) {
      if (ch === '[') bracketDepth++;
      else if (ch === ']') { if (bracketDepth>0) bracketDepth--; }
    }
    if (ch === sep && !inQuotes && bracketDepth === 0) { out.push(cur); cur = ''; continue; }
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

function splitFixedCsv() {
  const base = path.resolve(__dirname, '..', 'tmp');
  const fixed = path.join(base, 'import-template-produkti-prov4-updated-latest.csv.fixed.csv');
  if (!fs.existsSync(fixed)) {
    console.error('Fixed CSV not found:', fixed);
    process.exit(1);
  }

  const outGood = path.join(base, 'import-template-produkti-prov4-updated-latest.csv.has-image-url.csv');
  const outBad = path.join(base, 'import-template-produkti-prov4-updated-latest.csv.missing-image-url.csv');

  const txt = fs.readFileSync(fixed, 'utf8');
  const lines = txt.split(/\r?\n/);
  if (lines.length === 0) { console.error('empty file'); process.exit(1); }
  const header = parseLine(lines[0], ',');
  const idxImage = header.findIndex(h => h.trim().toLowerCase() === 'image');
  if (idxImage === -1) { console.error('image column not found'); process.exit(1); }

  const imgRegex = /^https?:\/\/[^\s"']+\.(jpg|jpeg|png|webp|gif)(?:[?#].*)?$/i;

  const good = [ header.map(escapeField).join(',') ];
  const bad = [ header.map(escapeField).join(',') ];
  let goodCount = 0, badCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const cols = parseLine(line, ',');
    const imageVal = (cols[idxImage] || '').trim();
    // strip surrounding quotes if present
    const maybe = imageVal.replace(/^\"|\"$/g, '');
    if (imgRegex.test(maybe)) {
      good.push(cols.map(escapeField).join(','));
      goodCount++;
    } else {
      bad.push(cols.map(escapeField).join(','));
      badCount++;
    }
  }

  fs.writeFileSync(outGood, good.join('\n'));
  fs.writeFileSync(outBad, bad.join('\n'));

  console.log('Input:', fixed);
  console.log('Wrote good (has image ext) ->', outGood, 'rows:', goodCount);
  console.log('Wrote bad (missing/full-image) ->', outBad, 'rows:', badCount);
}

if (require.main === module) splitFixedCsv();

module.exports = { splitFixedCsv };
