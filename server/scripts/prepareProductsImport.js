/**
 * prepareProductsImport.js
 *
 * - Reads two CSVs:
 *   - Produktet all.csv (large, may contain duplicated product rows with different specs)
 *   - products.csv (image URLs and canonical product rows)
 * - Deduplicates Produktet all.csv by product code (first column) and merges specs/features into a single object per product.
 * - Looks up image URLs from products.csv and (optionally) downloads them into server/tmp/import-images/<productCode>/
 * - Writes a preview JSON to server/tmp/products-import-preview.json containing deduped products and local image paths.
 *
 * Usage:
 *   1) Install dependencies in server/ (once):
 *      npm install csv-parse node-fetch@2 mkdirp p-limit
 *
 *   2) From repo root run (example):
 *      node .\server\scripts\prepareProductsImport.js --productsCsv "products.csv" --allCsv "\"Produktet all.csv\"" --download-images --out server\tmp\products-import-preview.json
 *
 * Notes:
 * - This script uses streaming CSV parsing so it can handle large files.
 * - It tries to be conservative: it merges spec-like fields into arrays and deduplicates values.
 * - It does NOT modify the DB. It produces a preview file you should review before import.
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const fetch = require('node-fetch');
const mkdirp = require('mkdirp');
const pLimit = require('p-limit');

const args = require('minimist')(process.argv.slice(2), {
  string: ['productsCsv', 'allCsv', 'out'],
  boolean: ['downloadImages'],
  default: { productsCsv: 'products.csv', allCsv: 'Produktet all.csv', out: 'server/tmp/products-import-preview.json', downloadImages: false },
});

const PRODUCTS_CSV = path.resolve(process.cwd(), args.productsCsv);
const ALL_CSV = path.resolve(process.cwd(), args.allCsv);
const OUT_FILE = path.resolve(process.cwd(), args.out);
const IMAGES_DIR = path.resolve(process.cwd(), 'server', 'tmp', 'import-images');
const SPECS_PREVIEW = args.specsPreview ? path.resolve(process.cwd(), args.specsPreview) : null;

function normalizeKey(s) {
  if (!s) return '';
  return String(s).trim();
}

function pushUnique(arr, v) {
  if (!v) return;
  const s = String(v).trim();
  if (!s) return;
  if (!arr.includes(s)) arr.push(s);
}

async function loadProductsImageMap(productsCsvPath) {
  return new Promise((resolve, reject) => {
    const map = new Map();
    const r = fs.createReadStream(productsCsvPath);
    const parser = parse({ delimiter: ';', columns: true, relax_quotes: true, skip_empty_lines: true });
    r.pipe(parser)
      .on('data', (row) => {
        // Try to find product code column (header may be 'Product code' or similar)
        // We'll assume the first column header is 'Product code' (observed)
        const codeKeys = ['Product code', 'Product code'];
        const code = row[Object.keys(row)[0]]; // first column value
        const imageUrl = row['Image URL'] || row['Detailed image URL'] || row['Detailed image'] || row['Image'] || row['Detailed image URL'];
        const detailed = row['Detailed image URL'] || row['Detailed image'] || row['Detailed image URL'];
        map.set(normalizeKey(code), {
          imageUrl: (imageUrl || '').replace(/"/g, ''),
          detailedImage: (detailed || '').replace(/"/g, ''),
          raw: row,
        });
      })
      .on('end', () => resolve(map))
      .on('error', (err) => reject(err));
  });
}

async function processAllCsv(allCsvPath, imageMap, delimiter = ';') {
  return new Promise((resolve, reject) => {
    const dedup = new Map();
    const r = fs.createReadStream(allCsvPath);
    const parser = parse({ delimiter: delimiter, columns: true, relax_quotes: true, skip_empty_lines: true, relax_column_count: true });
    r.pipe(parser)
      .on('data', (row) => {
        // Identify product key: try Product code (first column), then Product id, then sku
        const firstCol = row[Object.keys(row)[0]];
        const code = normalizeKey(firstCol || row['Product code'] || row['product_code'] || row['Product id'] || row['Product id'] || row['Product id']);
        if (!code) return; // skip rows without code

        let entry = dedup.get(code);
        if (!entry) {
          // Initialize merge structure
          entry = {
            code,
            names: [],
            descriptions: [],
            shortDescriptions: [],
            prices: [],
            categories: [],
            features: [],
            specsMerged: [],
            rawRows: [],
            imageCandidates: [],
          };
          dedup.set(code, entry);
        }

        // collect name
        pushUnique(entry.names, row['Product name'] || row['Product Name'] || row['Product name;'] || row['Product name']);

        // descriptions
        pushUnique(entry.descriptions, row['Description'] || row['description'] || row['Detailed image URL'] || row['Detailed image']);
        pushUnique(entry.shortDescriptions, row['Short description'] || row['Short description']);

        // price
        if (row['Price'] || row['Price']) pushUnique(entry.prices, row['Price']);

        // category
        if (row['Category']) pushUnique(entry.categories, row['Category']);

        // features/specs: try common fields
        const featuresCandidates = ['Features', 'Features;', 'features', 'specs', 'Specs', 'Options', 'attributes', 'Specification'];
        for (const key of Object.keys(row)) {
          if (/feature|spec|option|attribute/i.test(key)) {
            const v = row[key];
            if (v) {
              // if field looks like semicolon-separated key:value pairs, split
              if (typeof v === 'string' && (v.includes(';') || v.includes(':') || v.includes('Marka:'))) {
                // split on semicolon and comma, keep non-empty
                const parts = v.split(/;|\|\n/).map(s => s.trim()).filter(Boolean);
                for (const p of parts) pushUnique(entry.features, p);
              } else {
                pushUnique(entry.features, v);
              }
            }
          }
        }

        // also collect raw spec-like fragments from entire row
        entry.rawRows.push(row);

        // image candidates from common columns
        const img = row['Image URL'] || row['Detailed image URL'] || row['Detailed image'] || row['Image'] || row['Thumbnail'] || row['Thumbnail'];
        if (img) pushUnique(entry.imageCandidates, img);
      })
      .on('end', () => resolve(dedup))
      .on('error', (err) => reject(err));
  });
}

async function downloadImage(url, destPath) {
  if (!url) return null;
  try {
    const res = await fetch(url, { timeout: 30000 });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await mkdirp(path.dirname(destPath));
    const fileStream = fs.createWriteStream(destPath);
    await new Promise((res2, rej) => {
      res.body.pipe(fileStream);
      res.body.on('error', rej);
      fileStream.on('finish', res2);
    });
    return destPath;
  } catch (err) {
    return { error: String(err), url };
  }
}

(async function main() {
  console.log('Reading products.csv to build image map...');
  if (!fs.existsSync(PRODUCTS_CSV)) {
    console.error('products.csv not found at', PRODUCTS_CSV);
    process.exit(1);
  }
  if (!fs.existsSync(ALL_CSV)) {
    console.error('Produktet all.csv not found at', ALL_CSV);
    process.exit(1);
  }

  const imageMap = await loadProductsImageMap(PRODUCTS_CSV);
  console.log('Loaded image map for', imageMap.size, 'rows');

  console.log('Processing Produktet all.csv (dedup & merge specs) ...');
  let dedup;
  try {
    dedup = await processAllCsv(ALL_CSV, imageMap, ';');
  } catch (err) {
    console.warn('Failed parsing Produktet all.csv with ";" delimiter, retrying with "," delimiter - parser error:', err && err.message ? err.message : err);
    dedup = await processAllCsv(ALL_CSV, imageMap, ',');
  }
  console.log('Deduplicated products:', dedup.size);

  // If a specs preview mapping (from importCategorySpecsFromCsv --dry) is provided,
  // load it so we can attach category-level specs to each product in the preview.
  let specsMapping = null;
  if (SPECS_PREVIEW) {
    if (fs.existsSync(SPECS_PREVIEW)) {
      try {
        specsMapping = JSON.parse(fs.readFileSync(SPECS_PREVIEW, 'utf8'));
        console.log('Loaded specs preview mapping from', SPECS_PREVIEW);
      } catch (err) {
        console.warn('Failed to parse specs preview JSON:', err.message || err);
      }
    } else {
      console.warn('Specs preview file not found at', SPECS_PREVIEW);
    }
  }

  const out = [];
  for (const [code, e] of dedup.entries()) {
    // choose image from products.csv if available
    const prodImg = imageMap.get(code);
    const chosenImage = (prodImg && (prodImg.detailedImage || prodImg.imageUrl)) || e.imageCandidates[0] || null;

    // merge features (start with product-extracted features)
    const features = e.features.slice();

    // Attach category-level specs from the preview mapping if available.
    // The product category stored in the CSV is typically a 3-level path like:
    // "TOP///CHILD1///CHILD2". Try to parse and lookup a matching specs array.
    let categorySpecs = [];
    if (specsMapping && e.categories && e.categories.length) {
      // Build a normalized lookup for the preview mapping once (top->child1->child2)
      // Normalization: remove leading "globe" tokens and underscores, strip diacritics,
      // collapse spaces and lowercase for robust matching.
      const normalizeName = (s) => {
        if (!s) return '';
        let t = String(s).trim();
        // remove leading GLOBE_ or GLOBE prefix if present
        t = t.replace(/^\s*GLOBE[_\s-]*/i, '');
        // replace underscores with spaces
        t = t.replace(/_/g, ' ');
        // normalize unicode (decompose) and strip diacritics
        try { t = t.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (err) {}
        // remove non-word punctuation except spaces
        t = t.replace(/[^\p{L}\p{N}\s]/gu, '');
        // collapse spaces
        t = t.replace(/\s+/g, ' ').trim().toLowerCase();
        return t;
      };

      const normalizedSpecs = {};
      for (const topKey of Object.keys(specsMapping)) {
        const nTop = normalizeName(topKey);
        normalizedSpecs[nTop] = normalizedSpecs[nTop] || {};
        const child1Obj = specsMapping[topKey] || {};
        for (const child1Key of Object.keys(child1Obj)) {
          const nChild1 = normalizeName(child1Key);
          normalizedSpecs[nTop][nChild1] = normalizedSpecs[nTop][nChild1] || {};
          const child2Obj = child1Obj[child1Key] || {};
          for (const child2Key of Object.keys(child2Obj)) {
            const nChild2 = normalizeName(child2Key);
            normalizedSpecs[nTop][nChild1][nChild2] = child2Obj[child2Key];
          }
        }
      }

      const tryFindSpecs = (catString) => {
        if (!catString) return null;
        let parts = String(catString).split('///').map(s => s && s.trim()).filter(Boolean);
        if (parts.length < 3) parts = String(catString).split('/').map(s => s && s.trim()).filter(Boolean);
        if (parts.length < 3) return null;
        const [top, child1, child2] = parts;
        const nTop = normalizeName(top);
        const nChild1 = normalizeName(child1);
        const nChild2 = normalizeName(child2);

        // 1) exact match top->child1->child2
        if (normalizedSpecs[nTop] && normalizedSpecs[nTop][nChild1] && normalizedSpecs[nTop][nChild1][nChild2]) {
          return normalizedSpecs[nTop][nChild1][nChild2];
        }
        // 2) try finding child2 under any child1 of the same top (handles redundant mid-level like "TE VOGLA")
        if (normalizedSpecs[nTop]) {
          for (const c1 of Object.keys(normalizedSpecs[nTop])) {
            if (normalizedSpecs[nTop][c1] && normalizedSpecs[nTop][c1][nChild2]) {
              return normalizedSpecs[nTop][c1][nChild2];
            }
          }
        }
        // 3) as a last resort, search all tops/child1s for a matching child2 key
        for (const topKey of Object.keys(normalizedSpecs)) {
          for (const c1 of Object.keys(normalizedSpecs[topKey] || {})) {
            if (normalizedSpecs[topKey][c1] && normalizedSpecs[topKey][c1][nChild2]) {
              return normalizedSpecs[topKey][c1][nChild2];
            }
          }
        }
        return null;
      };

      for (const cat of e.categories) {
        const found = tryFindSpecs(cat);
        if (found && Array.isArray(found) && found.length) {
          categorySpecs = found.slice();
          break;
        }
      }
    }

    // merge category specs into features (preserve existing product feature tokens, then category specs)
    if (categorySpecs && categorySpecs.length) {
      for (const s of categorySpecs) pushUnique(features, s);
    }

    // also attempt to extract 'Marka: S[...]' style from rawRows
    for (const r of e.rawRows) {
      for (const v of Object.values(r)) {
        if (typeof v === 'string' && v.includes('Marka:')) {
          // extract tokens like 'Marka: S[Samsung]'
          const matches = v.match(/Marka: S\[([^\]]+)\]/i);
          if (matches) pushUnique(features, `Brand: ${matches[1]}`);
        }
      }
    }

    const merged = {
      code,
      name: e.names[0] || null,
      names: e.names,
      description: e.descriptions[0] || null,
      shortDescriptions: e.shortDescriptions,
      categories: e.categories,
      prices: e.prices,
      features,
      categorySpecs: categorySpecs || [],
      imageUrl: chosenImage,
      imageLocal: null,
      rawCount: e.rawRows.length,
    };
    out.push(merged);
  }

  // Optionally download images
  if (args.downloadImages) {
    console.log('Downloading images to', IMAGES_DIR, ' (concurrency 6)');
    // create images dir if missing
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
    const limit = pLimit(6);
    const tasks = out.map((p) => limit(async () => {
      if (!p.imageUrl) return p;
      // sanitize filename
      const ext = (path.extname(p.imageUrl.split('?')[0]) || '.jpg').split(/\?|#/)[0];
      const dest = path.join(IMAGES_DIR, p.code.replace(/[^a-zA-Z0-9-_\.]/g, '_'), 'main' + ext);
      const res = await downloadImage(p.imageUrl, dest);
      p.imageLocal = res;
      return p;
    }));
    await Promise.all(tasks);
  }

  // write preview (ensure directory exists)
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify({ generatedAt: new Date().toISOString(), items: out }, null, 2));
  console.log('Wrote preview to', OUT_FILE);
})();
