const fs = require('fs');
const path = require('path');
// do not require models at top-level — defer until we need DB access so --dry works without DB

// Simple CSV importer for specifikat.csv
// Behavior:
// - Reads a CSV with columns: Category,Child category 1,Child category 2,Specifications
// - Collects specification lines that belong to level-2 categories (Child category 2)
// - For each found level-2 path, finds the corresponding Category row in DB by name
//   and verifying its parent chain (child1 -> top). If a matching Category isn't
//   present, it skips that path.
// - Backs up the existing category JSON to server/tmp/<timestamp>-<id>-<name>.json
// - Writes the ordered specs array into category.specs and saves the row.

const DEFAULT_CSV = path.resolve(process.cwd(), 'specifikat.csv');
const TMP_DIR = path.resolve(process.cwd(), 'server', 'tmp');

function parseLine(line) {
  // naive split by comma into 4 columns; trims quotes/spaces
  const parts = line.split(',');
  while (parts.length < 4) parts.push('');
  return parts.slice(0, 4).map(s => s.replace(/^"|"$/g, '').trim());
}

async function main() {
  const argv = process.argv.slice(2);
  const file = argv.find(a => !a.startsWith('--')) || DEFAULT_CSV;
  const dryRun = argv.includes('--dry') || argv.includes('-d');
  const noFullBackup = argv.includes('--no-full-backup');
  if (!fs.existsSync(file)) {
    console.error(`CSV file not found: ${file}`);
    console.error('Place the CSV in the project root or pass the path as the first argument.');
    process.exit(1);
  }

  const raw = fs.readFileSync(file, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (lines.length <= 1) {
    console.error('CSV appears empty or only contains header');
    process.exit(1);
  }

  // Build mapping from pathKey -> ordered specs array
  // We only collect specs when we have a full 3-level path: top -> child1 -> child2
  const specsByPath = new Map();

  let currentTop = null;
  let currentChild1 = null;
  let currentChild2 = null;

  let skippedSpecLinesNoLevel3 = 0;

  // skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const [col0, col1, col2, col3] = parseLine(line);

    if (col0) {
      currentTop = col0;
      currentChild1 = null;
      currentChild2 = null;
      continue;
    }
    if (col1) {
      currentChild1 = col1;
      currentChild2 = null;
      continue;
    }
    if (col2) {
      currentChild2 = col2;
      const key = `${currentTop}|||${currentChild1}|||${currentChild2}`;
      if (!specsByPath.has(key)) specsByPath.set(key, []);
      continue;
    }
    // specification line (col3)
    if (col3) {
      // Only attach specs when we are inside a full 3-level context
      if (currentTop && currentChild1 && currentChild2) {
        const key = `${currentTop}|||${currentChild1}|||${currentChild2}`;
        if (!specsByPath.has(key)) specsByPath.set(key, []);
        const arr = specsByPath.get(key);
        const v = col3.trim();
        if (v) arr.push(v);
      } else {
        // spec without a resolved level-3 (child2) context -- count for reporting
        skippedSpecLinesNoLevel3++;
      }
    }
  }

  console.log(`Detected ${specsByPath.size} level-3 category paths (top->child1->child2) with specs in CSV.`);
  if (skippedSpecLinesNoLevel3) console.log(`Skipped ${skippedSpecLinesNoLevel3} spec lines because they lacked a level-3 (child2) context.`);

  // If dry-run, produce a preview JSON and exit without touching the DB
  if (dryRun) {
    // transform specsByPath Map into nested object top->child1->child2->[specs]
    const mapping = {};
    for (const [key, specs] of specsByPath.entries()) {
      const [top, child1, child2] = key.split('|||').map(s => (s || '').trim());
      if (!top || !child1 || !child2) continue;
      mapping[top] = mapping[top] || {};
      mapping[top][child1] = mapping[top][child1] || {};
      mapping[top][child1][child2] = specs.map(s => s.trim()).filter(Boolean);
    }
    if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
    const outName = `preview-specs-${Date.now()}.json`;
    const outPath = path.join(TMP_DIR, outName);
    fs.writeFileSync(outPath, JSON.stringify(mapping, null, 2), 'utf8');
    console.log(`Preview JSON written to ${outPath}`);
    console.log('Dry-run complete. No DB connection was attempted.');
    process.exit(0);
  }

  // Load all categories to help mapping by name/id
  const { Category } = require('../models');

  // fetch rows from DB
  const rows = await Category.findAll();

  // create a full backup of all categories before making changes (unless disabled)
  if (!noFullBackup) {
    try {
      const fullBackup = { timestamp: Date.now(), categories: rows.map(r => r.toJSON()) };
      const fullName = `full-backup-categories-${Date.now()}.json`;
      if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
      fs.writeFileSync(path.join(TMP_DIR, fullName), JSON.stringify(fullBackup, null, 2));
      console.log(`Wrote full categories backup to server/tmp/${fullName}`);
    } catch (err) {
      console.warn('Failed to write full backup:', err.message || err);
    }
  } else {
    console.log('Full backup skipped by flag.');
  }
  const byName = new Map();
  const byId = {};
  rows.forEach(r => {
    const n = String(r.name || '').toLowerCase();
    if (!byName.has(n)) byName.set(n, []);
    byName.get(n).push(r);
    byId[r.id] = r;
  });

  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

  const skipped = [];
  const updated = [];

  for (const [key, specs] of specsByPath.entries()) {
    const [top, child1, child2] = key.split('|||').map(s => (s || '').trim());
    if (!child2) continue;
    const candidates = byName.get(String(child2).toLowerCase()) || [];
    let target = null;
    for (const c of candidates) {
      // immediate parent should be child1 and its parent should be top
      if (!c.parentId) continue;
      const parent = byId[c.parentId];
      if (!parent) continue;
      if ((parent.name || '').trim().toLowerCase() !== (child1 || '').trim().toLowerCase()) continue;
      if (!parent.parentId) continue;
      const grand = byId[parent.parentId];
      if (!grand) continue;
      if ((grand.name || '').trim().toLowerCase() !== (top || '').trim().toLowerCase()) continue;
      target = c;
      break;
    }

    if (!target) {
      skipped.push({ top, child1, child2 });
      console.log(`Skipping missing category path: ${top} -> ${child1} -> ${child2}`);
      continue;
    }

    // backup per-category (before update)
    const backup = { before: target.toJSON(), specsFromCsv: specs };
    const fname = `${Date.now()}-cat-${target.id}-${target.name.replace(/[^a-z0-9_-]/gi, '_')}.json`;
    fs.writeFileSync(path.join(TMP_DIR, fname), JSON.stringify(backup, null, 2));

    // apply specs (preserve order, trim, remove empties)
    const cleaned = specs.map(s => s.trim()).filter(Boolean);
    if (dryRun) {
      console.log(`[dry-run] Would update category id=${target.id} name='${target.name}' with ${cleaned.length} specs.`);
      updated.push({ id: target.id, name: target.name, count: cleaned.length });
    } else {
      target.specs = cleaned;
      await target.save();
      updated.push({ id: target.id, name: target.name, count: cleaned.length });
      console.log(`Updated category id=${target.id} name='${target.name}' with ${cleaned.length} specs.`);
    }
  }

  console.log('Import finished.');
  console.log(`Updated: ${updated.length} categories. Skipped: ${skipped.length} paths.`);
  if (skipped.length) console.log('Skipped paths (not present in DB):', skipped.map(s => `${s.top} -> ${s.child1} -> ${s.child2}`).slice(0,50));
  process.exit(0);
}

main().catch(err => {
  console.error('Error running import:', err);
  process.exit(2);
});
