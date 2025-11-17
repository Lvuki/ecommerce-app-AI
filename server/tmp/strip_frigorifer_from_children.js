const path = require('path');
const fs = require('fs');

(async function(){
  try {
    process.chdir(path.join(__dirname, '..'));
    const db = require('../models');
    const Category = db.Category;

    const parentName = 'FRIGORIFERE';
    const topParentName = 'ELEKTROSHTEPIAKE TE MEDHA';

    const top = await Category.findOne({ where: { name: topParentName, parentId: null } });
    if (!top) {
      console.error('Top parent not found:', topParentName);
      process.exit(2);
    }

    const parent = await Category.findOne({ where: { name: parentName, parentId: top.id } });
    if (!parent) {
      console.error('Parent not found under', topParentName, ':', parentName);
      process.exit(2);
    }

    const rows = await Category.findAll({ where: { parentId: parent.id } });
    if (!rows.length) {
      console.log('No children found for', parentName);
      process.exit(0);
    }

    // Backup affected rows
    const ts = new Date().toISOString().replace(/[:.]/g,'-');
    const backupPath = path.join(__dirname, `categories-frigorifere-children-backup-${ts}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(rows.map(r => r.toJSON()), null, 2));
    console.log('Wrote backup to', backupPath);

    const regex = /\bfrigoriferi?\b/ig; // matches FRIGORIFER or FRIGORIFERI (case-insensitive)
    const updated = [];
    for (const r of rows) {
      const orig = r.name;
      const cleaned = orig.replace(regex, '').replace(/\s+/g,' ').trim();
      if (cleaned && cleaned !== orig) {
        await Category.update({ name: cleaned }, { where: { id: r.id } });
        updated.push({ id: r.id, before: orig, after: cleaned });
        console.log(`Updated id=${r.id}: "${orig}" -> "${cleaned}"`);
      } else if (!cleaned) {
        console.log(`Skipping id=${r.id} because cleaning would leave empty name: "${orig}"`);
      } else {
        console.log(`No change for id=${r.id}: "${orig}"`);
      }
    }

    const reportPath = path.join(__dirname, `categories-frigorifere-children-updated-${ts}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(updated, null, 2));
    console.log('Wrote update report to', reportPath);

    console.log('\nDone. Updated count:', updated.length);
    process.exit(0);
  } catch (err) {
    console.error('Error in strip_frigorifer_from_children:', err);
    process.exit(2);
  }
})();
