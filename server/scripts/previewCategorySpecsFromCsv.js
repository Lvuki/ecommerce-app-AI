const fs = require('fs');
const path = require('path');

const DEFAULT_CSV = path.resolve(process.cwd(), 'specifikat.csv');
const TMP_DIR = path.resolve(process.cwd(), 'server', 'tmp');

function parseLine(line) {
  const parts = line.split(',');
  while (parts.length < 4) parts.push('');
  return parts.slice(0, 4).map(s => s.replace(/^"|"$/g, '').trim());
}

function buildMapping(csvPath) {
  if (!fs.existsSync(csvPath)) throw new Error(`CSV not found: ${csvPath}`);
  const raw = fs.readFileSync(csvPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const mapping = {}; // top -> child1 -> child2 -> [specs]

  let currentTop = null;
  let currentChild1 = null;
  let currentChild2 = null;

  for (let i = 1; i < lines.length; i++) {
    const [col0, col1, col2, col3] = parseLine(lines[i]);
    if (col0) {
      currentTop = col0;
      currentChild1 = null;
      currentChild2 = null;
      if (!mapping[currentTop]) mapping[currentTop] = {};
      continue;
    }
    if (col1) {
      currentChild1 = col1;
      currentChild2 = null;
      if (!mapping[currentTop]) mapping[currentTop] = {};
      if (!mapping[currentTop][currentChild1]) mapping[currentTop][currentChild1] = {};
      continue;
    }
    if (col2) {
      currentChild2 = col2;
      if (!mapping[currentTop]) mapping[currentTop] = {};
      if (!mapping[currentTop][currentChild1]) mapping[currentTop][currentChild1] = {};
      if (!mapping[currentTop][currentChild1][currentChild2]) mapping[currentTop][currentChild1][currentChild2] = [];
      continue;
    }
    // spec column
    if (col3) {
      if (currentTop && currentChild1 && currentChild2) {
        mapping[currentTop][currentChild1][currentChild2].push(col3.trim());
      }
    }
  }

  return mapping;
}

function writePreviewJson(mapping) {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
  const fname = `preview-specs-${Date.now()}.json`;
  const outPath = path.join(TMP_DIR, fname);
  fs.writeFileSync(outPath, JSON.stringify(mapping, null, 2), 'utf8');
  return outPath;
}

function main() {
  try {
    const csvPath = process.argv[2] || DEFAULT_CSV;
    const mapping = buildMapping(csvPath);
    const out = writePreviewJson(mapping);
    const topCount = Object.keys(mapping).length;
    let specCount = 0;
    Object.values(mapping).forEach(c1s => {
      Object.values(c1s).forEach(c2s => {
        Object.values(c2s).forEach(specs => { specCount += (specs || []).length; });
      });
    });
    console.log(`Preview written to: ${out}`);
    console.log(`Top-level categories: ${topCount}, total spec lines captured: ${specCount}`);
    console.log('You can inspect the JSON or paste it here if you want me to analyze specific categories.');
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
}

main();
