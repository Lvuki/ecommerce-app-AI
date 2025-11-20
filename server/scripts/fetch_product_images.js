/*
Simple script to:
- Read import CSV (import-template-produkti-prov4.csv) at project root
- Fill `category` with deepest non-empty of category_child2, category_child1, category_top
- Fill `categories` with JSON array of non-empty [category_top, category_child1, category_child2]
- For rows without `image`, perform a DuckDuckGo HTML search (manufacturer-first heuristic) and try to find product page -> og:image or twitter:image or link rel image_src -> download image into server/uploads and set `image` to /uploads/<filename>
- Write result to server/tmp/import-template-produkti-prov4-updated.csv and print a summary

Notes:
- Uses only built-in Node modules (http/https/fs/url) so you can run with plain `node`.
- This is best-effort and may not find images for every product. When it fails, the CSV will still have categories filled.
- Run locally from repository root:
    node server/scripts/fetch_product_images.js

*/

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { URL } = require('url');

const ROOT = path.resolve(__dirname, '..', '..');
const INPUT_CSV = path.join(ROOT, 'import-template-produkti-prov4.csv');
const OUT_DIR = path.join(ROOT, 'server', 'uploads');
const OUTPUT_CSV = path.join(ROOT, 'server', 'tmp', 'import-template-produkti-prov4-updated.csv');

// Tiny CSV parser that handles quoted fields and commas inside quotes
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
        if (i + 1 < len && text[i + 1] === '"') { // escaped quote
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

    // not in quotes
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }

    if (ch === ',') {
      row.push(field);
      field = '';
      i++;
      continue;
    }

    if (ch === '\r') { i++; continue; }

    if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
      continue;
    }

    field += ch;
    i++;
  }

  // push last
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function stringifyCSV(rows) {
  return rows.map(r => r.map(cell => {
    if (cell == null) return '';
    const s = String(cell);
    if (s.includes('"') || s.includes(',') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }).join(',')).join('\n');
}

function fetchURL(urlStr, timeout = 15000) {
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(urlStr);
      const get = urlObj.protocol === 'https:' ? https.get : http.get;
      const req = get(urlObj, { headers: { 'User-Agent': 'node-fetch-script/1.0 (+https://github.com)' } }, res => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', d => data += d);
        res.on('end', () => resolve({ statusCode: res.statusCode, body: data, headers: res.headers, url: urlStr }));
      });
      req.on('error', reject);
      req.setTimeout(timeout, () => { req.abort(); reject(new Error('timeout')); });
    } catch (err) {
      reject(err);
    }
  });
}

function fetchHeaders(urlStr, timeout = 15000) {
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(urlStr);
      const get = urlObj.protocol === 'https:' ? https.request : http.request;
      const opts = { method: 'HEAD', headers: { 'User-Agent': 'node-fetch-headers/1.0' } };
      const req = get(urlObj, opts, res => {
        resolve({ statusCode: res.statusCode, headers: res.headers, url: urlStr });
      });
      req.on('error', reject);
      req.setTimeout(timeout, () => { req.abort(); reject(new Error('timeout')); });
      req.end();
    } catch (err) { reject(err); }
  });
}

function downloadToFile(urlStr, destPath) {
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(urlStr);
      const get = urlObj.protocol === 'https:' ? https.get : http.get;
      const req = get(urlObj, { headers: { 'User-Agent': 'node-download-script/1.0' } }, res => {
        if (res.statusCode && res.statusCode >= 400) return reject(new Error('Status ' + res.statusCode));
        const file = fs.createWriteStream(destPath);
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve()));
        file.on('error', err => { fs.unlink(destPath, () => reject(err)); });
      });
      req.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function firstNonEmpty(...vals) {
  for (const v of vals) if (v != null && String(v).trim() !== '') return String(v).trim();
  return '';
}

function extractOgImage(html, baseUrl) {
  if (!html) return null;
  // og:image
  let m = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  if (m && m[1]) return resolveRelativeUrl(m[1], baseUrl);
  m = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  if (m && m[1]) return resolveRelativeUrl(m[1], baseUrl);
  m = html.match(/<link[^>]*rel=["']image_src["'][^>]*href=["']([^"']+)["'][^>]*>/i);
  if (m && m[1]) return resolveRelativeUrl(m[1], baseUrl);
  // fallback: first <img src="..."> where src likely starts with http
  m = html.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/i);
  if (m && m[1]) return resolveRelativeUrl(m[1], baseUrl);
  return null;
}

function resolveRelativeUrl(u, base) {
  try {
    return new URL(u, base).toString();
  } catch (err) {
    return u;
  }
}

(async function main(){
  console.log('Starting CSV enrichment and image lookup (best-effort).');

  if (!fs.existsSync(INPUT_CSV)) {
    console.error('Input CSV not found at', INPUT_CSV);
    process.exit(1);
  }

  ensureDir(OUT_DIR);
  ensureDir(path.join(ROOT, 'server', 'tmp'));

  const raw = fs.readFileSync(INPUT_CSV, 'utf8');
  const rows = parseCSV(raw);
  if (!rows || rows.length === 0) { console.error('CSV parse error or empty'); process.exit(1); }

  const header = rows[0].map(h => h.trim());
  const data = rows.slice(1);

  const idx = {}; header.forEach((h,i)=> idx[h]=i);
  // ensure certain columns exist
  const requiredCols = ['category_top','category_child1','category_child2','categories','category','image','images','sku','name','brand'];
  for (const c of requiredCols) if (idx[c] == null) {
    // add column
    header.push(c);
    idx[c] = header.length-1;
    // expand data rows
    for (const r of data) while (r.length < header.length) r.push('');
  }

  // suggested_image_source column
  if (idx['suggested_image_source'] == null) {
    header.push('suggested_image_source');
    idx['suggested_image_source'] = header.length-1;
    for (const r of data) while (r.length < header.length) r.push('');
  }

  console.log('Columns:', header.join(', '));

  const summary = { updatedCount:0, downloaded:0, notFound:0 };

  // brand -> candidate domains mapping (simple heuristics)
  const brandDomains = {
    'tp-link': ['tp-link.com'],
    'tplink': ['tp-link.com'],
    'gembird': ['gembird.com', 'gembird.nl'],
    'ugreen': ['ugreen.com', 'ugreentech.com', 'ugreentech.com'],
    'netis': ['netis-systems.com', 'netis.com'],
    'zebra': ['zebra.com'],
    'bose': ['bose.com'],
    'pleomax': ['pleomax.com', 'samsung.com'],
    'canon': ['canon.com'],
  };

  function candidateDomainsForBrand(brand) {
    if (!brand) return [];
    const b = String(brand).toLowerCase();
    for (const key of Object.keys(brandDomains)) {
      if (b.includes(key)) return brandDomains[key];
    }
    return [];
  }

  function isDuckDuckGoAsset(url) {
    return typeof url === 'string' && url.includes('duckduckgo.com/assets');
  }

  function isLikelyImageUrl(u) {
    if (!u) return false;
    const lower = u.toLowerCase();
    return /\.(jpg|jpeg|png|webp|gif|svg)(?:$|\?|#)/i.test(lower);
  }

  function isSiteLogo(u) {
    if (!u) return false;
    const low = String(u).toLowerCase();
    return low.includes('/images/logos') || low.includes('/logo') || low.includes('favicon') || low.includes('/logos/');
  }

  for (let rIndex = 0; rIndex < data.length; rIndex++) {
    const row = data[rIndex];
    const top = row[idx['category_top']] || '';
    const c1 = row[idx['category_child1']] || '';
    const c2 = row[idx['category_child2']] || '';
    const categoriesArr = [top, c1, c2].map(s => (s||'').trim()).filter(Boolean);
    row[idx['categories']] = JSON.stringify(categoriesArr);
    row[idx['category']] = firstNonEmpty(c2, c1, top);

    const sku = (row[idx['sku']]||'').trim();
    const name = (row[idx['name']]||'').trim();
    const brand = (row[idx['brand']]||'').trim();
    const existingImage = (row[idx['image']]||'').trim();

    if (existingImage) {
      // already set, skip lookup
      continue;
    }

    // Build search query: prefer sku + name + brand
    const searchQuery = [sku, brand, name].filter(Boolean).join(' ');
    if (!searchQuery) { summary.notFound++; continue; }
    try {
      console.log('\nRow', rIndex+1, 'searching:', searchQuery);

      // 1) Try globe.al by SKU (and name) first
      let found = false;
      const globeCandidates = [];
      if (sku) {
        globeCandidates.push('https://globe.al/search?q=' + encodeURIComponent(sku));
      }
      if (name) {
        globeCandidates.push('https://globe.al/search?q=' + encodeURIComponent(name));
      }

      for (const gUrl of globeCandidates) {
        try {
          const gres = await fetchURL(gUrl);
          if (!gres || !gres.body) continue;
          // Try to extract product links that belong to globe.al
          // Find the best globe.al product link in the search results.
          let candidate = null;
          const hrefRe = /href="([^"]+)"/ig;
          let m;
          const productPathHints = ['product', '/p/', 'produkt', '/produkt', '/item', '/products'];
          while ((m = hrefRe.exec(gres.body)) !== null) {
            const cap = m[1];
            if (!cap) continue;
            // DuckDuckGo redirects use /l/?uddg=encoded
            let resolved = cap;
            if (cap.includes('/l/?uddg=')) {
              const part = cap.split('uddg=')[1];
              try { resolved = decodeURIComponent(part); } catch(e) { resolved = part; }
            } else if (cap.startsWith('/')) {
              // relative link: prefix with globe root
              resolved = new URL(cap, 'https://globe.al').toString();
            }
            if (!resolved || !resolved.startsWith('http')) continue;
            if (!resolved.includes('globe.al')) continue;
            if (isLikelyImageUrl(resolved)) continue; // skip icons/favicons
            // prefer paths that look like product pages
            const path = (new URL(resolved)).pathname.toLowerCase();
            if (productPathHints.some(h => path.includes(h))) { candidate = resolved; break; }
            // otherwise keep first non-image globe.al link as fallback
            if (!candidate) candidate = resolved;
          }
          if (candidate) {
            console.log('  globe candidate page:', candidate);
            const pageRes = await fetchURL(candidate);
            if (pageRes && pageRes.body) {
              const img = extractOgImage(pageRes.body, candidate);
                if (img && !isDuckDuckGoAsset(img) && !isSiteLogo(img)) {
                // verify image content-type
                try {
                  const h = await fetchHeaders(img);
                  const ct = (h.headers['content-type'] || h.headers['Content-Type'] || '').toString();
                  if (ct && ct.startsWith('image/')) {
                    // download
                    const parsed = new URL(img);
                    const baseName = path.basename(parsed.pathname).split('?')[0] || 'image';
                    const ts = Date.now();
                    const filename = ts + '-' + baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
                    const destPath = path.join(OUT_DIR, filename);
                    console.log('  downloading globe image:', img);
                    await downloadToFile(img, destPath);
                    row[idx['image']] = '/uploads/' + filename;
                    row[idx['suggested_image_source']] = img + ' | page: ' + candidate;
                    summary.downloaded++;
                    found = true;
                    break;
                  }
                } catch (e) { /* fallthrough */ }
              }
            }
          }
        } catch (e) { /* ignore and continue to next globe candidate */ }
        if (found) break;
      }

      if (found) continue;

      // 2) Try manufacturer domains (brand mapping)
      const domains = candidateDomainsForBrand(brand);
      for (const domain of domains) {
        try {
          // search site:domain sku or name
          const q = sku ? `${sku}` : name;
          const siteSearch = 'https://html.duckduckgo.com/html/?q=' + encodeURIComponent('site:' + domain + ' ' + q);
          const sres = await fetchURL(siteSearch);
          if (!sres || !sres.body) continue;
          // iterate all hrefs and prefer links that point to the manufacturer domain
          let targetUrl = null;
          const hrefRe2 = /href="([^"]+)"/ig;
          let mm;
          while ((mm = hrefRe2.exec(sres.body)) !== null) {
            const cap = mm[1];
            if (!cap) continue;
            let resolved = cap;
            if (cap.includes('/l/?uddg=')) {
              const part = cap.split('uddg=')[1];
              try { resolved = decodeURIComponent(part); } catch(e){ resolved = part; }
            } else if (cap.startsWith('/')) {
              resolved = new URL(cap, 'https://' + domain).toString();
            }
            if (!resolved || !resolved.startsWith('http')) continue;
            if (!resolved.includes(domain)) continue;
            if (isLikelyImageUrl(resolved) || isSiteLogo(resolved)) continue;
            // prefer product-like paths
            const path = (new URL(resolved)).pathname.toLowerCase();
            if (path.includes('product') || path.includes('/p/') || path.includes('prod') || path.includes('item')) {
              targetUrl = resolved; break;
            }
            if (!targetUrl) targetUrl = resolved;
          }
          if (!targetUrl) continue;
          if (targetUrl.includes('duckduckgo.com/')) continue; // avoid homepage redirects
          console.log('  manufacturer candidate page:', targetUrl);
          const pageRes = await fetchURL(targetUrl);
          if (!pageRes || !pageRes.body) continue;
          const img = extractOgImage(pageRes.body, targetUrl);
          if (!img || isDuckDuckGoAsset(img)) continue;
          try {
            const h = await fetchHeaders(img);
            const ct = (h.headers['content-type'] || h.headers['Content-Type'] || '').toString();
            if (ct && ct.startsWith('image/')) {
              const parsed = new URL(img);
              const baseName = path.basename(parsed.pathname).split('?')[0] || 'image';
              const ts = Date.now();
              const filename = ts + '-' + baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
              const destPath = path.join(OUT_DIR, filename);
              console.log('  downloading manufacturer image:', img);
              await downloadToFile(img, destPath);
              row[idx['image']] = '/uploads/' + filename;
              row[idx['suggested_image_source']] = img + ' | page: ' + targetUrl;
              summary.downloaded++;
              found = true;
              break;
            }
          } catch (e) { /* continue */ }
        } catch (e) { /* continue */ }
        if (found) break;
      }

      if (found) continue;

      // 3) fallback: general search but prefer non-duckduckgo assets and real product pages
      const generalSearch = 'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(searchQuery);
      const gres = await fetchURL(generalSearch);
      if (!gres || !gres.body) { summary.notFound++; continue; }
      // iterate candidate links and prefer non-search-engine, non-social, product-like pages
      const blacklistDomains = ['duckduckgo.com','accounts.google.com','facebook.com','twitter.com','instagram.com','linkedin.com'];
      const marketHints = ['amazon.', 'aliexpress.', 'ebay.', 'mercado', 'shoptet', 'alibaba'];
      const hrefRe3 = /href="([^"]+)"/ig;
      let foundTarget = null;
      let mm2;
      const nameTokens = name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
      while ((mm2 = hrefRe3.exec(gres.body)) !== null) {
        const cap = mm2[1];
        if (!cap) continue;
        let resolved = cap;
        if (cap.includes('/l/?uddg=')) {
          const part = cap.split('uddg=')[1];
          try { resolved = decodeURIComponent(part); } catch(e){ resolved = part; }
        } else if (cap.startsWith('/')) {
          // relative -> prefix with duckduckgo host (not ideal) skip
          continue;
        }
        if (!resolved || !resolved.startsWith('http')) continue;
        const parsedUrl = new URL(resolved);
        const domainOnly = parsedUrl.hostname.toLowerCase();
        if (blacklistDomains.some(b => domainOnly.includes(b))) continue;
        if (isSiteLogo(resolved) || isDuckDuckGoAsset(resolved) || isLikelyImageUrl(resolved)) continue;
        const pathLower = parsedUrl.pathname.toLowerCase();
        // prefer if path contains SKU or name tokens
        const hasSku = sku && pathLower.includes(sku.toLowerCase());
        const hasNameToken = nameTokens.some(t => t && pathLower.includes(t));
        const domainHasBrand = brand && domainOnly.includes(brand.toLowerCase().replace(/\s+/g,''));
        const isMarket = marketHints.some(h => domainOnly.includes(h));
        if (hasSku || hasNameToken || domainHasBrand || isMarket) { foundTarget = resolved; break; }
        if (!foundTarget) foundTarget = resolved;
      }
      if (!foundTarget) { summary.notFound++; continue; }
      const pageRes = await fetchURL(foundTarget);
      if (!pageRes || !pageRes.body) { summary.notFound++; continue; }
      const imageUrl = extractOgImage(pageRes.body, foundTarget);
      if (!imageUrl || isDuckDuckGoAsset(imageUrl) || isSiteLogo(imageUrl)) { summary.notFound++; continue; }
      try {
        const h = await fetchHeaders(imageUrl);
        const ct = (h.headers['content-type'] || h.headers['Content-Type'] || '').toString();
        if (ct && ct.startsWith('image/')) {
          const parsed = new URL(imageUrl);
          const baseName = path.basename(parsed.pathname).split('?')[0] || 'image';
          const ts = Date.now();
          const filename = ts + '-' + baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
          const destPath = path.join(OUT_DIR, filename);
          console.log('  downloading fallback image:', imageUrl, 'from', foundTarget);
          await downloadToFile(imageUrl, destPath);
          row[idx['image']] = '/uploads/' + filename;
          row[idx['suggested_image_source']] = imageUrl + ' | page: ' + foundTarget;
          summary.downloaded++;
          continue;
        }
      } catch (e) {
        console.log('  fallback image header check failed', e && e.message);
        summary.notFound++;
        continue;
      }

    } catch (err) {
      console.log('  error while fetching/downloading:', err.message || err);
      summary.notFound++;
      continue;
    }
  }

  // assemble output
  const outRows = [header].concat(data);
  const csvText = stringifyCSV(outRows);
  fs.writeFileSync(OUTPUT_CSV, csvText, 'utf8');

  console.log('\nDone. Output CSV written to', OUTPUT_CSV);
  console.log('Summary:', summary);
  console.log('Downloaded images are in', OUT_DIR);
})();
