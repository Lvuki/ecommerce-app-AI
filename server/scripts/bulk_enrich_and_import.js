#!/usr/bin/env node
/*
  Bulk enrich and import script
  - Reads an input CSV (default: server/tmp/import-template-produkti-prov4-updated.csv)
  - Fills `category` and `categories` from category_top/child columns if present
  - Maps image URLs from products.csv by SKU/name and downloads images into /uploads/products/<sku>-<slugified-name>/
    with simple rate-limiting and concurrency control to avoid hammering remote servers.
  - Writes a timestamped enriched CSV to server/tmp/
  - Runs importCsvToDb.js in --dry mode by default; pass --apply to perform DB writes.

  Usage:
    node server/scripts/bulk_enrich_and_import.js --csv path/to/file.csv [--apply] [--concurrency 3] [--hostDelay 300]

*/
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const spawn = require('child_process').spawn;

const argv = require('minimist')(process.argv.slice(2), { string: ['csv'], boolean: ['apply','no-download'], default: { csv: path.join('server','tmp','import-template-produkti-prov4-updated.csv'), apply: false, concurrency: 3, hostDelay: 300 } });
const INPUT_CSV = path.resolve(process.cwd(), argv.csv);
const PRODUCTS_CSV = path.resolve(process.cwd(), 'products.csv');
const OUT_DIR_ROOT = path.resolve(process.cwd(), 'server','uploads','products');
const TMP_DIR = path.resolve(process.cwd(), 'server','tmp');
const CONCURRENCY = parseInt(argv.concurrency || 3, 10);
const HOST_DELAY = parseInt(argv.hostDelay || 300, 10);
const NO_DOWNLOAD = !!argv['no-download'];

function parseCSV(text){
  const rows = [];
  let i=0, len=text.length; let field=''; let row=[]; let inQuotes=false;
  while(i<len){
    const ch = text[i];
    if(inQuotes){
      if(ch==='"'){
        if(i+1<len && text[i+1]==='"'){ field+='"'; i+=2; continue; }
        inQuotes=false; i++; continue;
      } else { field+=ch; i++; continue; }
    }
    if(ch==='"'){ inQuotes=true; i++; continue; }
    if(ch===','){ row.push(field); field=''; i++; continue; }
    if(ch==='\r'){ i++; continue; }
    if(ch==='\n'){ row.push(field); rows.push(row); row=[]; field=''; i++; continue; }
    field+=ch; i++;
  }
  if(field!=='' || row.length>0){ row.push(field); rows.push(row); }
  return rows;
}

function stringifyCSV(rows){
  return rows.map(r=> r.map(c=>{
    if(c==null) return '';
    const s = String(c);
    if(s.includes('"')||s.includes(',')||s.includes('\n')) return '"'+s.replace(/"/g,'""')+'"';
    return s;
  }).join(',')).join('\n');
}

function slugify(s){ if(!s) return ''; return String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }

function ensureDir(dir){ if(!fs.existsSync(dir)) fs.mkdirSync(dir,{ recursive:true }); }

function downloadWithTimeout(urlStr, destPath, timeoutMs=20000){
  return new Promise((resolve,reject)=>{
    let timedOut=false; const timer = setTimeout(()=>{ timedOut=true; reject(new Error('timeout')); }, timeoutMs);
    try{
      const urlObj = new URL(urlStr);
      const get = urlObj.protocol === 'https:' ? https.get : http.get;
      const req = get(urlObj, { headers: { 'User-Agent': 'bulk-enrich-script/1.0' } }, res=>{
        if(timedOut) return;
        clearTimeout(timer);
        if(res.statusCode && res.statusCode>=400) return reject(new Error('Status '+res.statusCode));
        const file = fs.createWriteStream(destPath);
        res.pipe(file);
        file.on('finish', ()=> file.close(()=> resolve()));
        file.on('error', err=>{ try{ fs.unlinkSync(destPath);}catch(e){}; reject(err); });
      });
      req.on('error', err=>{ if(!timedOut){ clearTimeout(timer); reject(err); }});
    }catch(err){ clearTimeout(timer); reject(err); }
  });
}

async function headContentType(urlStr){
  return new Promise((resolve)=>{
    try{
      const urlObj = new URL(urlStr);
      const get = urlObj.protocol === 'https:' ? https.request : http.request;
      const req = get(urlObj, { method: 'HEAD', timeout: 5000, headers: { 'User-Agent': 'bulk-enrich-script/1.0' } }, res=>{
        resolve(res.headers['content-type'] || null);
      });
      req.on('timeout', ()=>{ req.destroy(); resolve(null); });
      req.on('error', ()=> resolve(null));
      req.end();
    }catch(e){ resolve(null); }
  });
}

async function main(){
  console.log('Bulk enrich+import — input CSV:', INPUT_CSV);
  if(!fs.existsSync(INPUT_CSV)) { console.error('Input CSV not found:', INPUT_CSV); process.exit(1); }
  if(!fs.existsSync(PRODUCTS_CSV)) { console.error('products.csv not found:', PRODUCTS_CSV, '\nThis script uses products.csv for image URL mapping.'); process.exit(1); }
  ensureDir(OUT_DIR_ROOT); ensureDir(TMP_DIR);

  const prodRaw = fs.readFileSync(PRODUCTS_CSV,'utf8');
  const prodRows = prodRaw.split(/\r?\n/).filter(Boolean).map(l=> l.split(/;(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/));
  const prodHeader = prodRows[0].map(h=>h.trim());
  const prodData = prodRows.slice(1);
  const prodIdx = {}; prodHeader.forEach((h,i)=> prodIdx[h]=i);
  const codeIdx = prodIdx['Product code'];
  const imageIdx = prodIdx['Image URL'];
  const detailedIdx = prodIdx['Detailed image URL'];
  const nameIdx = prodIdx['Product name'];

  const skuMap = {}; const nameMap = {};
  for(const r of prodData){ const code = (r[codeIdx]||'').trim(); const img = ((r[imageIdx]||'').trim()) || ((r[detailedIdx]||'').trim()); const pname=(r[nameIdx]||'').trim(); if(code) skuMap[code]=img; const nn = String(pname||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(); if(nn && !nameMap[nn]) nameMap[nn]=img; }

  const raw = fs.readFileSync(INPUT_CSV,'utf8');
  const rows = parseCSV(raw);
  const header = rows[0].map(h=>h.trim());
  const data = rows.slice(1);
  const idx = {}; header.forEach((h,i)=> idx[h]=i);

  // ensure columns
  if(idx['category']==null){ idx['category']=header.length; header.push('category'); data.forEach(r=>{ while(r.length<header.length) r.push(''); }); }
  if(idx['categories']==null){ idx['categories']=header.length; header.push('categories'); data.forEach(r=>{ while(r.length<header.length) r.push(''); }); }
  if(idx['image']==null){ idx['image']=header.length; header.push('image'); data.forEach(r=>{ while(r.length<header.length) r.push(''); }); }
  if(idx['suggested_image_source']==null){ idx['suggested_image_source']=header.length; header.push('suggested_image_source'); data.forEach(r=>{ while(r.length<header.length) r.push(''); }); }

  // host throttling map
  const hostLast = {};
  let inProgress = 0; let downloaded = 0; const notFound = [];

  function scheduleDelayForHost(host){
    const last = hostLast[host] || 0; const now = Date.now(); const wait = Math.max(0, HOST_DELAY - (now - last)); hostLast[host] = now + wait; return wait;
  }

  // simple worker pool
  const q = [];
  function enqueue(fn){ q.push(fn); }
  async function worker(){ while(q.length>0){ const fn = q.shift(); try{ await fn(); }catch(e){ /* ignore per-row errors */ } }
  }

  // Build tasks
  for(let i=0;i<data.length;i++){
    const row = data[i]; const sku = (row[idx['sku']]||'').trim(); const name = (row[idx['name']]||'').trim();
    // fill categories
    const top = (idx['category_top']!=null ? (row[idx['category_top']]||'').trim() : '');
    const c1 = (idx['category_child1']!=null ? (row[idx['category_child1']]||'').trim() : '');
    const c2 = (idx['category_child2']!=null ? (row[idx['category_child2']]||'').trim() : '');
    const cats = [top,c1,c2].filter(x=>x && x.length>0);
    const catVal = cats.length>0 ? cats[cats.length-1] : '';
    row[idx['category']] = row[idx['category']] || catVal;
    row[idx['categories']] = row[idx['categories']] || JSON.stringify(cats);

    // image handling task
    enqueue(async ()=>{
      try{
        const existingImage = (row[idx['image']]||'').trim();
        if(existingImage) return; // already has image
        let sourceUrl = null;
        if(sku && skuMap[sku]) sourceUrl = skuMap[sku];
        if(!sourceUrl && name){ const nn = String(name||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(); if(nameMap[nn]) sourceUrl = nameMap[nn]; }
        if(!sourceUrl){ notFound.push({row:i+2, sku, name}); return; }
        if(!sourceUrl.startsWith('http://') && !sourceUrl.startsWith('https://')){ notFound.push({row:i+2, sku, name, note:'non-http'}); return; }

        if(NO_DOWNLOAD) { row[idx['suggested_image_source']] = sourceUrl + ' | products.csv'; return; }

        const parsed = new URL(sourceUrl); const host = parsed.host;
        const wait = scheduleDelayForHost(host);
        if(wait>0) await new Promise(r=>setTimeout(r, wait));

        const base = path.basename(parsed.pathname).split('?')[0] || 'image'; const safeBase = base.replace(/[^a-zA-Z0-9._-]/g,'_');
        const productFolderName = (sku ? sku : 'no-sku') + (name ? '-' + slugify(name) : '');
        const destDir = path.join(OUT_DIR_ROOT, productFolderName);
        ensureDir(destDir);
        // reuse existing
        const files = fs.readdirSync(destDir).filter(Boolean);
        const found = files.find(f=> f.includes(safeBase) || path.extname(f).toLowerCase() === path.extname(safeBase).toLowerCase());
        if(found){ row[idx['image']] = '/uploads/products/' + productFolderName + '/' + found; row[idx['suggested_image_source']] = sourceUrl + ' | products.csv (reused)'; return; }

        // download
        const filename = Date.now() + '-' + safeBase;
        const destPath = path.join(destDir, filename);
        const ctype = await headContentType(sourceUrl);
        if(ctype && !ctype.startsWith('image/')){ notFound.push({row:i+2, sku, name, note:'not-image content-type: '+ctype}); return; }
        await downloadWithTimeout(sourceUrl, destPath, 20000);
        row[idx['image']] = '/uploads/products/' + productFolderName + '/' + filename;
        row[idx['suggested_image_source']] = sourceUrl + ' | products.csv';
        downloaded++;
      }catch(err){ notFound.push({row:i+2, sku, name, note: (err && err.message)||'error'}); }
    });
  }

  // run worker pool with concurrency
  const workers = [];
  for(let w=0; w<CONCURRENCY; w++) workers.push(worker());
  await Promise.all(workers);

  // write CSV
  const outRows = [header].concat(data);
  const outName = 'import-template-produkti-prov4-updated-' + Date.now() + '.csv';
  const outPath = path.join(TMP_DIR, outName);
  fs.writeFileSync(outPath, stringifyCSV(outRows),'utf8');
  console.log('\nWrote enriched CSV to', outPath);
  console.log('Downloaded images:', downloaded, 'missing/failed:', notFound.length);
  if(notFound.length>0) console.log('Sample missing:', notFound.slice(0,20));

  // run importer
  const importerArgs = [path.join(process.cwd(),'server','scripts','importCsvToDb.js'), '--csv', outPath];
  if(!argv.apply) importerArgs.push('--dry');
  console.log('Running importer', argv.apply ? '(APPLY mode - will write DB)' : '(dry run)');
  const imp = spawn(process.execPath, importerArgs, { stdio: 'inherit' });
  imp.on('close', code => { console.log('Importer exited with code', code); process.exit(code); });
}

main().catch(err=>{ console.error('Fatal error:', err && err.message || err); process.exit(1); });
