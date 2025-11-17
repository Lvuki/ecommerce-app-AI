const fs = require('fs');
const path = require('path');
const { Category } = require('../models');

function findLatestBackup(dir) {
  const files = fs.readdirSync(dir).filter(f => f.startsWith('categories-backup-move-') && f.endsWith('.json'));
  if (!files.length) return null;
  files.sort();
  return path.join(dir, files[files.length - 1]);
}

async function main() {
  try {
    const dir = __dirname;
    const backup = findLatestBackup(dir);
    if (!backup) {
      console.error('No move backup file found in', dir);
      process.exit(1);
    }
    console.log('Using backup file:', backup);
    const raw = fs.readFileSync(backup, 'utf8');
    const data = JSON.parse(raw);

    // For each category in backup, restore parentId if it differs
    for (const item of data) {
      const id = item.id;
      const savedParent = item.parentId === undefined ? null : item.parentId;
      const cat = await Category.findOne({ where: { id } });
      if (!cat) {
        console.warn('Category id not found in DB, skipping:', id);
        continue;
      }
      const currentParent = cat.parentId === undefined ? null : cat.parentId;
      if ((currentParent === null && savedParent === null) || (currentParent === savedParent)) {
        // nothing to do
        continue;
      }
      await Category.update({ parentId: savedParent }, { where: { id } });
      console.log(`Restored parentId for id=${id} (${cat.name}) -> ${savedParent}`);
    }

    console.log('Restore complete.');
    process.exit(0);
  } catch (err) {
    console.error('Error restoring backup:', err);
    process.exit(2);
  }
}

main();
