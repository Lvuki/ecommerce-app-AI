const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const args = require('minimist')(process.argv.slice(2), {
  string: ['preview', 'out', 'limit'],
  default: { preview: 'server/tmp/products-import-preview-only-allcsv.json', out: 'server/tmp/image-candidates-by-name.json', limit: '5' },
});

const PREVIEW = path.resolve(process.cwd(), args.preview);
const OUT_FILE = path.resolve(process.cwd(), args.out);
const LIMIT = parseInt(args.limit, 10) || 5;

if (!fs.existsSync(PREVIEW)) {
  console.error('Preview not found at', PREVIEW);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(PREVIEW, 'utf8'));
const items = data.items || [];

// Use Wikimedia Commons API to search for images by product name. This is public and requires no API key.
// Results may vary; we fetch up to LIMIT image URLs per product.
async function searchWikimediaImages(query) {
  const api = `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&prop=imageinfo&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=${LIMIT}&iiprop=url`;
  try {
    const res = await fetch(api, { timeout: 15000 });
    if (!res.ok) return [];
    const json = await res.json();
    const pages = json.query && json.query.pages ? Object.values(json.query.pages) : [];
    const urls = [];
    for (const p of pages) {
      if (p.imageinfo && p.imageinfo[0] && p.imageinfo[0].url) urls.push(p.imageinfo[0].url);
    }
    return urls.slice(0, LIMIT);
  } catch (err) {
    return [];
  }
}

(async function main(){
  const out = {};
  // limit how many products we attempt to search to keep runtime reasonable
  const toProcess = items.slice(0, 200); // try first 200 products
  for (const it of toProcess) {
    const name = it.name || (it.names && it.names[0]) || '';
    if (!name) continue;
    // create a few query variants: raw name, name + " product", name + brand if present
    const q = name;
    const urls = await searchWikimediaImages(q);
    out[it.code] = { name, images: urls };
  }
  fs.writeFileSync(OUT_FILE, JSON.stringify({ generatedAt: new Date().toISOString(), source: PREVIEW, results: out }, null, 2));
  console.log('Wrote image candidates to', OUT_FILE);
})();
