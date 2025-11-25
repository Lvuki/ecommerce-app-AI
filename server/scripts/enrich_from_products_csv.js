const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { URL } = require('url');

const ROOT = path.resolve(__dirname, '..', '..');
const INPUT_IMPORT_CSV = path.join(ROOT, 'import-template-produkti-prov4.csv');
const PRODUCTS_CSV = path.join(ROOT, 'products.csv');
const OUT_DIR = path.join(ROOT, 'server', 'uploads', 'products');
const OUTPUT_CSV = path.join(ROOT, 'server', 'tmp', 'import-template-produkti-prov4-updated.csv');

function ensureDir(dir) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }

function parseSemicolonCSV(text) {
  // simple split on lines and semicolons, unquote values
  const lines = text.split(/\r?\n/).filter(Boolean);
  return lines.map(line => line.split(/;(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/).map(c => {
    if (!c) return '';
    c = c.trim();
    if (c.startsWith('"') && c.endsWith('"')) c = c.slice(1,-1).replace(/""/g,'"');
    return c;
  }));
}

function parseCommaCSV(text) {
  // reuse minimal parser from other script style: handles quoted fields
  const rows = [];
  let i = 0; const len = text.length; let row = []; let field = ''; let inQuotes = false;
  while (i < len) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i+1 < len && text[i+1] === '"') { field += '"'; i+=2; continue; }
        inQuotes = false; i++; continue;
      } else { field += ch; i++; continue; }
    }
    if (ch === '"') { inQuotes = true; i++; continue; }
    if (ch === ',') { row.push(field); field=''; i++; continue; }
    if (ch === '\r') { i++; continue; }
    if (ch === '\n') { row.push(field); rows.push(row); row=[]; field=''; i++; continue; }
    field += ch; i++;
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

function stringifyCSV(rows) {
  return rows.map(r => r.map(cell => {
    if (cell == null) return '';
    const s = String(cell);
    if (s.includes('"') || s.includes(',') || s.includes('\n')) return '"' + s.replace(/"/g,'""') + '"';
    return s;
  }).join(',')).join('\n');
}

function normalizeName(s){ if(!s) return ''; return String(s).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(); }
function slugify(s){ if(!s) return ''; return String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }

function downloadToFile(urlStr, destPath) {
  return new Promise((resolve,reject)=>{
    try{
      const urlObj = new URL(urlStr);
      const get = urlObj.protocol === 'https:' ? https.get : http.get;
      const req = get(urlObj, { headers: { 'User-Agent': 'node-enrich-script/1.0' } }, res => {
        if (res.statusCode && res.statusCode >= 400) return reject(new Error('Status ' + res.statusCode));
        const file = fs.createWriteStream(destPath);
        res.pipe(file);
        file.on('finish', ()=> file.close(()=> resolve()));
        file.on('error', err => { try{ fs.unlinkSync(destPath); }catch(e){}; reject(err); });
      });
      req.on('error', reject);
    } catch(err){ reject(err); }
  });
}

(async function main(){
  console.log('Enrich from products.csv: reading files...');
  if (!fs.existsSync(INPUT_IMPORT_CSV)) { console.error('import CSV not found at', INPUT_IMPORT_CSV); process.exit(1); }
  if (!fs.existsSync(PRODUCTS_CSV)) { console.error('products.csv not found at', PRODUCTS_CSV); process.exit(1); }

  ensureDir(OUT_DIR); ensureDir(path.join(ROOT,'server','tmp'));

  const prodRaw = fs.readFileSync(PRODUCTS_CSV, 'utf8');
  const importRaw = fs.readFileSync(INPUT_IMPORT_CSV, 'utf8');

  const prodRows = parseSemicolonCSV(prodRaw);
  const prodHeader = prodRows[0].map(h=>h.trim());
  const prodData = prodRows.slice(1);

  const importRows = parseCommaCSV(importRaw);
  const importHeader = importRows[0].map(h=>h.trim());
  const importData = importRows.slice(1);

  // find indexes in products.csv
  const prodIdx = {};
  prodHeader.forEach((h,i)=> prodIdx[h]=i);
  const codeIdx = prodIdx['Product code'] != null ? prodIdx['Product code'] : prodIdx['Product code'.trim()];
  const imageIdx = prodIdx['Image URL'];
  const detailedIdx = prodIdx['Detailed image URL'];
  const prodNameIdx = prodIdx['Product name'];

  // build mapping by SKU (Product code) and normalized name
  const skuMap = {};
  const nameMap = {};
  for (const r of prodData) {
    const code = (r[codeIdx]||'').trim();
    const img = (r[imageIdx]||'').trim() || (r[detailedIdx]||'').trim();
    const pname = (r[prodNameIdx]||'').trim();
    if (code) skuMap[code] = img;
    const nn = normalizeName(pname);
    if (nn) nameMap[nn] = nameMap[nn] || img;
  }

  // ensure image and suggested_image_source columns exist in import header
  const idx = {}; importHeader.forEach((h,i)=> idx[h]=i);
  if (idx['image'] == null) { importHeader.push('image'); idx['image']=importHeader.length-1; for(const r of importData) while(r.length<importHeader.length) r.push(''); }
  if (idx['suggested_image_source'] == null) { importHeader.push('suggested_image_source'); idx['suggested_image_source']=importHeader.length-1; for(const r of importData) while(r.length<importHeader.length) r.push(''); }

  let downloaded = 0; const notFound = [];

  for (let i=0;i<importData.length;i++){
    const row = importData[i];
    const sku = (row[ idx['sku'] ]||'').trim();
    const name = (row[ idx['name'] ]||'').trim();
    const existingImage = (row[ idx['image'] ]||'').trim();
    if (existingImage) continue;

    let sourceUrl = null;
    if (sku && skuMap[sku]) sourceUrl = skuMap[sku];
    if (!sourceUrl && name) {
      const nn = normalizeName(name);
      // direct match on product name mapping
      if (nameMap[nn]) sourceUrl = nameMap[nn];
      else {
        // try fuzzy: find nameMap key that includes few tokens
        const tokens = nn.split(' ').filter(Boolean);
        for (const key of Object.keys(nameMap)){
          let matches = 0;
          for (const t of tokens) if (t && key.includes(t)) matches++;
          if (matches >= Math.min(2, tokens.length)) { sourceUrl = nameMap[key]; break; }
        }
      }
    }

    if (!sourceUrl) { notFound.push({row: i+2, sku, name}); continue; }

    // Only accept http(s) URLs
    if (!sourceUrl.startsWith('http://') && !sourceUrl.startsWith('https://')) { notFound.push({row: i+2, sku, name, note:'non-http image: '+sourceUrl}); continue; }

    // fill category/categories from category_top/child columns if present
    try {
      const top = (idx['category_top'] != null ? (row[idx['category_top']]||'').trim() : '');
      const c1 = (idx['category_child1'] != null ? (row[idx['category_child1']]||'').trim() : '');
      const c2 = (idx['category_child2'] != null ? (row[idx['category_child2']]||'').trim() : '');
      const cats = [top,c1,c2].filter(x=>x && x.length>0);
      const catVal = cats.length>0 ? cats[cats.length-1] : '';
      // ensure category and categories columns exist
      if (idx['category'] == null) { importHeader.push('category'); idx['category'] = importHeader.length-1; for(const r of importData) while(r.length<importHeader.length) r.push(''); }
      if (idx['categories'] == null) { importHeader.push('categories'); idx['categories'] = importHeader.length-1; for(const r of importData) while(r.length<importHeader.length) r.push(''); }
      row[idx['category']] = row[idx['category']] || catVal;
      row[idx['categories']] = row[idx['categories']] || JSON.stringify(cats);
    } catch(e){ /* ignore */ }

    try {
      const parsed = new URL(sourceUrl);
      const baseName = path.basename(parsed.pathname).split('?')[0] || 'image';
      const safeBase = baseName.replace(/[^a-zA-Z0-9._-]/g,'_');
      const filename = Date.now() + '-' + safeBase;
      // create per-product folder: /uploads/products/<sku>-<slugified-name>/
      const productFolderName = (sku ? sku : 'no-sku') + (name ? '-' + slugify(name) : '');
      const destDir = path.join(OUT_DIR, productFolderName);
      ensureDir(destDir);

      // If destDir already contains a file that matches the image base name or any file, reuse it
      const existing = fs.readdirSync(destDir).filter(f => {
        // match by containing the safe base or by extension match
        if (f.includes(safeBase)) return true;
        const fext = path.extname(f).toLowerCase();
        if (fext && fext === path.extname(safeBase).toLowerCase()) return true;
        return false;
      });
      if (existing.length > 0) {
        // reuse the first existing file
        const chosen = existing[0];
        row[idx['image']] = '/uploads/products/' + productFolderName + '/' + chosen;
        row[idx['suggested_image_source']] = sourceUrl + ' | products.csv (reused)';
        // do not increment downloaded (we reused an existing file)
        console.log('Reusing existing image for', sku || name, '->', chosen);
      } else {
        const destPath = path.join(destDir, filename);
        console.log('Downloading', sourceUrl, '->', destPath);
        await downloadToFile(sourceUrl, destPath);
        row[idx['image']] = '/uploads/products/' + productFolderName + '/' + filename;
        row[idx['suggested_image_source']] = sourceUrl + ' | products.csv';
        downloaded++;
      }
    } catch (err) {
      console.log('  download failed for', sourceUrl, err && err.message);
      notFound.push({row:i+2, sku, name, note: 'download failed: '+(err && err.message)});
    }
  }

  // write output (atomic write with retry to avoid EBUSY on Windows)
  const outRows = [importHeader].concat(importData);
  // write to a new timestamped file to avoid locks on the previous updated CSV
  const OUTPUT_CSV_DYNAMIC = OUTPUT_CSV.replace(/\.csv$/,'') + '-' + Date.now() + '.csv';
  const tmpPath = OUTPUT_CSV_DYNAMIC + '.tmp';
  const csvText = stringifyCSV(outRows);
  async function writeFileAtomic(p, data){
    const max = 5;
    for(let attempt=1; attempt<=max; attempt++){
      try{
        fs.writeFileSync(p, data, 'utf8');
        return;
      }catch(err){
        if (attempt===max) throw err;
        await new Promise(r=>setTimeout(r, 200*attempt));
      }
    }
  }
  try{
    await writeFileAtomic(tmpPath, csvText);
    // try atomic rename, fallback to copy if rename/unlink is blocked on Windows
    try{
      fs.renameSync(tmpPath, OUTPUT_CSV_DYNAMIC);
    }catch(e){
      try{
        fs.copyFileSync(tmpPath, OUTPUT_CSV_DYNAMIC);
        try{ fs.unlinkSync(tmpPath); }catch(_){}
      }catch(copyErr){
        // final attempt: overwrite by writing directly
        try{ fs.writeFileSync(OUTPUT_CSV_DYNAMIC, csvText, 'utf8'); fs.unlinkSync(tmpPath); }catch(finalErr){ throw finalErr; }
      }
    }
    console.log('\nDone. Output CSV at', OUTPUT_CSV_DYNAMIC);
  }catch(err){ console.error('Failed to write output CSV:', err); process.exit(1); }
  console.log('Downloaded:', downloaded, 'Missing/failed:', notFound.length);
  if (notFound.length>0) console.log('Rows without images (or failed):', notFound.slice(0,50));

  // Run importer in dry mode to validate (no DB credentials needed)
  console.log('\nRunning importer in --dry to validate parsed rows (no DB changes).');
  const { spawn } = require('child_process');
  const importer = spawn(process.execPath, [path.join(ROOT,'server','scripts','importCsvToDb.js'), '--csv', OUTPUT_CSV_DYNAMIC, '--dry'], { stdio: 'inherit' });
  importer.on('close', code => { console.log('Importer exited with code', code); process.exit(0); });

})();
