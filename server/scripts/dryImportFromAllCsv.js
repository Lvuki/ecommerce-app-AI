const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');

const args = require('minimist')(process.argv.slice(2), {
  string: ['allCsv', 'out'],
  default: { allCsv: 'Produktet all.csv', out: 'server/tmp/products-import-preview-only-allcsv.json' },
});

const ALL_CSV = path.resolve(process.cwd(), args.allCsv);
const OUT_FILE = path.resolve(process.cwd(), args.out);

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

async function processAllCsv(allCsvPath, delimiter = ';') {
  return new Promise((resolve, reject) => {
    const dedup = new Map();
    const r = fs.createReadStream(allCsvPath);
    // parse into arrays (no columns) to be resilient to malformed header/columns
    const parser = parse({ delimiter: delimiter, relax_quotes: true, skip_empty_lines: true, relax_column_count: true });
    let header = null;
    let idxs = { code: 0, name: 1, category: -1, child1: -1, child2: -1 };

    r.pipe(parser)
      .on('data', (row) => {
        // row is an array
        if (!header) {
          header = row.map(h => (h || '').toString());
          // find indices for category columns (case-insensitive)
          for (let i = 0; i < header.length; i++) {
            const h = header[i].toLowerCase();
            if (h.includes('kodi') || h.includes('product') || h.includes('kodi i produktit')) idxs.code = i;
            if (h === 'name' || h.includes('name') || h.includes('emri')) idxs.name = i;
            if (h.includes('category') && idxs.category === -1) idxs.category = i;
            if (h.includes('child category 1') || (h.includes('child') && h.includes('1'))) idxs.child1 = i;
            if (h.includes('child category 2') || (h.includes('child') && h.includes('2'))) idxs.child2 = i;
          }
          return;
        }

        const codeRaw = row[idxs.code];
        const code = normalizeKey(codeRaw);
        if (!code) return;

        let entry = dedup.get(code);
        if (!entry) {
          entry = { code, names: [], descriptions: [], shortDescriptions: [], categories: [], features: [], rawRows: [] };
          dedup.set(code, entry);
        }

        const nameVal = row[idxs.name];
        pushUnique(entry.names, nameVal);

        const cat = idxs.category >= 0 ? row[idxs.category] : '';
        const child1 = idxs.child1 >= 0 ? row[idxs.child1] : '';
        let child2 = idxs.child2 >= 0 ? row[idxs.child2] : '';
        if (child2 && String(child2).trim() === '0') child2 = '';
        const parts = [];
        if (cat) parts.push(String(cat).trim());
        if (child1) parts.push(String(child1).trim());
        if (child2) parts.push(String(child2).trim());
        if (parts.length) pushUnique(entry.categories, parts.join('///'));

        // attempt to collect spec-like values: scan remaining columns for non-empty short strings
        for (let i = 0; i < row.length; i++) {
          const val = row[i];
          if (!val) continue;
          // skip code/name/category columns
          if (i === idxs.code || i === idxs.name || i === idxs.category || i === idxs.child1 || i === idxs.child2) continue;
          const s = String(val).trim();
          if (!s) continue;
          // heuristics: short tokens (<=200 chars) and not just numbers or punctuation
          if (s.length > 1 && s.length < 200) pushUnique(entry.features, s);
        }

        // If the CSV contains a `category_specs` column header, detect it on the header row and merge its semicolon-separated tokens.
        // We detect this header by name during the initial header parse and will map the column index into idxs.category_specs
        // (idxs may have an optional category_specs property).
        if (header && header.length) {
          const catSpecsIdx = header.findIndex(h => (h||'').toString().toLowerCase().trim() === 'category_specs' || (h||'').toString().toLowerCase().trim() === 'category-specs');
          if (catSpecsIdx >= 0) {
            const csVal = row[catSpecsIdx];
            if (csVal && String(csVal).trim()) {
              const tokens = String(csVal).split(/;|,/).map(s => s.trim()).filter(Boolean);
              for (const t of tokens) pushUnique(entry.features, t);
            }
          }
        }

        entry.rawRows.push(row);
      })
      .on('end', () => resolve(dedup))
      .on('error', (err) => reject(err));
  });
}

(async function main(){
  if (!fs.existsSync(ALL_CSV)) {
    console.error('Produktet all.csv not found at', ALL_CSV);
    process.exit(1);
  }

  let dedup;
  try {
    dedup = await processAllCsv(ALL_CSV, ';');
  } catch (err) {
    console.warn('Failed parsing with ";" - retrying with ","', err && err.message);
    dedup = await processAllCsv(ALL_CSV, ',');
  }

  console.log('Deduplicated products:', dedup.size);

  const out = [];
  for (const [code, e] of dedup.entries()) {
    const merged = {
      code,
      name: e.names[0] || null,
      names: e.names,
      description: e.descriptions[0] || null,
      shortDescriptions: e.shortDescriptions,
      categories: e.categories,
      features: e.features,
      rawCount: e.rawRows.length,
    };
    out.push(merged);
  }

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify({ generatedAt: new Date().toISOString(), items: out }, null, 2));
  console.log('Wrote preview to', OUT_FILE);
})();
