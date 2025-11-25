#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const db = require('../models');

const specs = [
  'Dalja e ajrit',
  'Frekuenca',
  'Gjeresia',
  'Instalimi',
  'Kapaciteti i thithjes',
  'Klasa e Energjise',
  'Konsumi i Energjise',
  'Kontrolli',
  'Lidhje me pianuren',
  'Lloji i filtrit',
  'Materiali',
  'Ndricim',
  'Ngjyra',
  'Niveli i zhurmes',
  'Niveli shpejtesise',
  'Numri i motoreve',
  'Rezolucion Ekrani',
  'Voltazhi'
];

(async function main() {
  try {
    await db.sequelize.authenticate();
    console.log('DB connected');

    // Find top-level category
    let top = await db.Category.findOne({ where: { name: 'ELEKTROSHTEPIAKE TE MEDHA', parentId: null } });
    if (!top) {
      top = await db.Category.findOne({ where: { name: 'ELEKTROSHTEPIAKE TE MEDHA' } });
      if (top) console.warn('Top category found but parentId != null');
    }
    if (!top) {
      console.error('Top-level category "ELEKTROSHTEPIAKE TE MEDHA" not found');
    }

    // Find level-1 child 'ASPIRATORE' under top
    let level1 = null;
    if (top) level1 = await db.Category.findOne({ where: { name: 'ASPIRATORE', parentId: top.id } });
    if (!level1) {
      // fallback: any category named ASPIRATORE
      level1 = await db.Category.findOne({ where: { name: 'ASPIRATORE' } });
    }
    if (!level1) {
      console.error('Level-1 category "ASPIRATORE" not found');
    }

    // Look for level-2 child called 'ASPIRATORE' under level1
    let level2 = null;
    if (level1) level2 = await db.Category.findOne({ where: { name: 'ASPIRATORE', parentId: level1.id } });
    // If not found, maybe the structure only has one ASPIRATORE node (use level1 as target)

    const target = level2 || level1;
    if (!target) {
      console.error('Could not find a category to update. Exiting.');
      process.exit(1);
    }

    // Backup current category to tmp
    const tmpDir = path.join(__dirname, '..', 'tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const backupPath = path.join(tmpDir, `category_specs_backup_${target.id || 'unknown'}_${new Date().toISOString().replace(/[:.]/g,'-')}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(target.toJSON(), null, 2), 'utf8');
    console.log('Wrote backup to', backupPath);

    // Update specs
    target.specs = specs;
    await target.save();
    console.log(`Updated category id=${target.id} name="${target.name}" with ${specs.length} specs.`);

    // Show updated record
    const updated = await db.Category.findByPk(target.id);
    console.log('Updated record:', updated.toJSON());

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(2);
  }
})();
