const fs = require('fs');
const path = require('path');

function parseLine(line, sep) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === sep && !inQuotes) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function buildProductsMapping(productsCsvPath) {
  const txt = fs.readFileSync(productsCsvPath, 'utf8');
  const lines = txt.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return {};
  const header = parseLine(lines[0], ';').map(h => (h || '').replace(/^"|"$/g, '').trim().toLowerCase());
  const idxCode = header.findIndex(h => h === 'product code' || h === 'product_code' || h === 'productcode' || h === 'code');
  const idxImage = header.findIndex(h => h === 'image url' || h === 'image_url' || h === 'imageurl');
  const idxDetailed = header.findIndex(h => h === 'detailed image url' || h === 'detailed_image_url' || h === 'detailedimageurl');
  const mapping = Object.create(null);
  for (let i = 1; i < lines.length; i++) {
    const parts = parseLine(lines[i], ';');
    if (!parts || parts.length === 0) continue;
    const code = (parts[idxCode >= 0 ? idxCode : 0] || '').replace(/^"|"$/g, '').trim();
    if (!code) continue;
    let imageUrl = '';
    if (idxDetailed >= 0 && parts[idxDetailed]) imageUrl = parts[idxDetailed].replace(/^"|"$/g, '').trim();
    if (!imageUrl && idxImage >= 0 && parts[idxImage]) imageUrl = parts[idxImage].replace(/^"|"$/g, '').trim();
    // fallback: try to find first https image url in the row
    if (!imageUrl) {
      const urlMatch = lines[i].match(/https?:\/\/[^\s\";]+/g);
      if (urlMatch && urlMatch.length > 0) {
        // prefer ones that contain '/images/' or end with common image extensions
        const prefer = urlMatch.find(u => /\/images\//.test(u) || /\.(jpg|jpeg|png|webp|gif)$/i.test(u));
        imageUrl = (prefer || urlMatch[0]).trim();
      }
    }
    if (imageUrl) mapping[code] = imageUrl;
  }
  return mapping;
}

function updateTargetCsv(targetCsvPath, productsCsvPath) {
  const backupPath = targetCsvPath + '.backup-' + new Date().toISOString().replace(/[:.]/g,'') + '.csv';
  fs.copyFileSync(targetCsvPath, backupPath);
  console.log('Backup written to', backupPath);

  const mapping = buildProductsMapping(productsCsvPath);

  const content = fs.readFileSync(targetCsvPath, 'utf8');
  const lines = content.split(/\r?\n/);
  if (lines.length === 0) throw new Error('empty target csv');

  // Parse header using comma separator
  const header = parseLine(lines[0], ',');
  const idxSku = header.findIndex(h => h.trim().toLowerCase() === 'sku');
  const idxImage = header.findIndex(h => h.trim().toLowerCase() === 'image');
  const idxSuggested = header.findIndex(h => h.trim().toLowerCase() === 'suggested_image_source');
  if (idxSku === -1) throw new Error('sku column not found in target CSV');
  if (idxImage === -1) throw new Error('image column not found in target CSV');
  // if suggested_image_source doesn't exist, append it
  let outHeader = header.slice();
  let suggestedAppended = false;
  if (idxSuggested === -1) {
    outHeader.push('suggested_image_source');
    suggestedAppended = true;
  }

  const outLines = [outHeader.map(v => v).join(',')];

  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    if (raw.trim() === '') { outLines.push(''); continue; }
    const cols = parseLine(raw, ',');
    const sku = (cols[idxSku] || '').trim();
    const mappedUrl = mapping[sku];
    if (mappedUrl) {
      // set image to mappedUrl (use the URL directly) and set suggested_image_source to mappedUrl + ' | products.csv'
      cols[idxImage] = mappedUrl;
      if (suggestedAppended) {
        cols.push(mappedUrl + ' | products.csv');
      } else if (idxSuggested !== -1) {
        cols[idxSuggested] = mappedUrl + ' | products.csv';
      }
    } else {
      // ensure suggested column exists
      if (suggestedAppended) cols.push('');
    }
    // escape fields that contain commas/quotes/newlines
    const escapeField = (v) => {
      if (v === undefined || v === null) return '';
      const s = String(v);
      if (/[",\n\r]/.test(s)) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };
    outLines.push(cols.map(c => escapeField(c)).join(','));
  }

  const tmpPath = targetCsvPath + '.tmp';
  const updatedFallback = targetCsvPath + '.updated';
  try {
    fs.writeFileSync(tmpPath, outLines.join('\n'));
    try {
      fs.renameSync(tmpPath, targetCsvPath);
      console.log('Updated file written to', targetCsvPath);
    } catch (errRename) {
      // rename can fail on Windows if target is locked; fall back to keeping a .updated file
      try {
        fs.renameSync(tmpPath, updatedFallback);
        console.log('Target locked — wrote updated output to', updatedFallback);
      } catch (errFallback) {
        // last resort: write directly to fallback path
        fs.writeFileSync(updatedFallback, outLines.join('\n'));
        console.log('Target locked — wrote updated output to', updatedFallback);
      }
    }
  } catch (err) {
    console.error('Failed to write updated CSV:', err && err.message || err);
    throw err;
  }
}

if (require.main === module) {
  const targetCsvPath = path.resolve(__dirname, '..', 'tmp', 'import-template-produkti-prov4-updated-latest.csv');
  const productsCsvPath = path.resolve(__dirname, '..', '..', 'products.csv');
  try {
    updateTargetCsv(targetCsvPath, productsCsvPath);
  } catch (err) {
    console.error(err && err.message || err);
    process.exit(1);
  }
}

module.exports = { updateTargetCsv, buildProductsMapping };
