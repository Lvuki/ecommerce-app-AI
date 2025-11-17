const fs = require('fs');
const path = require('path');
const { Category } = require('../models');

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function main() {
  try {
    // backup all categories first
    const allCats = await Category.findAll({ order: [['id','ASC']] });
    const out = allCats.map(c => ({ id: c.id, name: c.name, parentId: c.parentId, createdAt: c.createdAt, updatedAt: c.updatedAt }));
    const backupPath = path.join(__dirname, `categories-backup-move-${timestamp()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(out, null, 2));
    console.log('Backup written to', backupPath);

    // find parent ELEKTROSHTEPIAKE TE MEDHA
    const parent = await Category.findOne({ where: { name: 'ELEKTROSHTEPIAKE TE MEDHA', parentId: null } });
    if (!parent) {
      console.error('Parent ELEKTROSHTEPIAKE TE MEDHA not found');
      process.exit(1);
    }

    const frigo = await Category.findOne({ where: { name: 'FRIGORIFERE', parentId: parent.id } });
    if (!frigo) {
      console.error('Child FRIGORIFERE not found under ELEKTROSHTEPIAKE TE MEDHA');
      process.exit(1);
    }

    const aspir = await Category.findOne({ where: { name: 'ASPIRATORE', parentId: parent.id } });
    if (!aspir) {
      console.error('Child ASPIRATORE not found under ELEKTROSHTEPIAKE TE MEDHA');
      process.exit(1);
    }

    // load children ordered by createdAt to reflect visible order
    const children = await Category.findAll({ where: { parentId: parent.id }, order: [['createdAt', 'ASC']] });
    const aspirIndex = children.findIndex(c => c.id === aspir.id);
    if (aspirIndex === -1) {
      console.error('ASPIRATORE index not found in children list');
      process.exit(1);
    }

    const toMove = children.filter((c, idx) => idx > aspirIndex && c.id !== frigo.id);
    if (!toMove.length) {
      console.log('Nothing to move — no children after ASPIRATORE (or they are already under FRIGORIFERE)');
      process.exit(0);
    }

    console.log('Will move the following children under FRIGORIFERE:', toMove.map(t => t.name).join(', '));

    for (const c of toMove) {
      // idempotent: only update if parentId differs
      if (c.parentId === frigo.id) {
        console.log(`Already under FRIGORIFERE: ${c.name}`);
        continue;
      }
      await Category.update({ parentId: frigo.id }, { where: { id: c.id } });
      console.log(`Moved ${c.name} (id=${c.id}) -> parentId=${frigo.id}`);
    }

    console.log('Done moving children.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(2);
  }
}

main();
