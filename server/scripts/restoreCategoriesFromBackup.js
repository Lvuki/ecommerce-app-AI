const fs = require('fs');
const path = require('path');
const { Category } = require('../models');

// Usage: node restoreCategoriesFromBackup.js <path-to-backup-json>
// The backup JSON can be either a full backup created by the importer
// (shape: { timestamp, categories: [...] }) or a per-category backup
// file written by the importer (shape: { before: { ... } }).

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Provide the path to the backup file to restore.');
    process.exit(1);
  }
  if (!fs.existsSync(file)) {
    console.error('Backup file not found:', file);
    process.exit(1);
  }

  const raw = fs.readFileSync(file, 'utf8');
  let parsed;
  try { parsed = JSON.parse(raw); } catch (err) {
    console.error('Failed to parse backup JSON:', err.message || err);
    process.exit(1);
  }

  const rowsToRestore = [];
  if (parsed.categories && Array.isArray(parsed.categories)) {
    rowsToRestore.push(...parsed.categories.map(c => c));
  } else if (parsed.before) {
    rowsToRestore.push(parsed.before);
  } else {
    console.error('Unknown backup format. Expected full backup with categories[] or per-category { before }');
    process.exit(1);
  }

  console.log(`Restoring ${rowsToRestore.length} category rows from backup...`);

  for (const row of rowsToRestore) {
    if (!row.id) {
      console.warn('Skipping row without id:', row.name || '(unknown)');
      continue;
    }
    // only update existing categories; do not create
    const existing = await Category.findByPk(row.id);
    if (!existing) {
      console.warn(`Skipping restore for id=${row.id} name=${row.name} (not found in DB)`);
      continue;
    }
    // prepare fields to update - use the full row but avoid changing PK
    const update = { ...row };
    delete update.id;
    // safety: do not overwrite timestamps unless present
    try {
      await Category.update(update, { where: { id: row.id } });
      console.log(`Restored category id=${row.id} name='${row.name}'`);
    } catch (err) {
      console.error(`Failed to restore id=${row.id}:`, err.message || err);
    }
  }

  console.log('Restore complete.');
  process.exit(0);
}

main().catch(err => {
  console.error('Error during restore:', err);
  process.exit(2);
});
