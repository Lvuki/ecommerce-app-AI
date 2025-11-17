const fs = require('fs');
const path = require('path');
const { Category } = require('../models');

async function collectSubtree(id) {
  const node = await Category.findByPk(id);
  if (!node) return null;
  const obj = { ...node.toJSON(), subcategories: [] };
  const children = await Category.findAll({ where: { parentId: id } });
  for (const c of children) {
    const sub = await collectSubtree(c.id);
    if (sub) obj.subcategories.push(sub);
  }
  return obj;
}

(async function main(){
  try {
    // find source: BATERI & LLAMPA under SIGURIA & MBIKQYRJA
    const rootSig = await Category.findOne({ where: { name: 'SIGURIA & MBIKQYRJA', parentId: null } });
    if (!rootSig) return console.error('SIGURIA & MBIKQYRJA not found');
    const source = await Category.findOne({ where: { name: 'BATERI & LLAMPA', parentId: rootSig.id } });
    if (!source) return console.error('source BATERI & LLAMPA not found under SIGURIA & MBIKQYRJA');

    // find target: root-level BATERI & LLAMPA
    const target = await Category.findOne({ where: { name: 'BATERI & LLAMPA', parentId: null } });
    if (!target) return console.error('target BATERI & LLAMPA (root) not found');

    // backup subtree
    const subtree = await collectSubtree(source.id);
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const outPath = path.join(__dirname, `bateri_llampa_backup_${ts}.json`);
    fs.writeFileSync(outPath, JSON.stringify(subtree, null, 2), 'utf8');
    console.log('Backup written to', outPath);

    // move: update parentId of source to target.id
    source.parentId = target.id;
    await source.save();
    console.log(`Moved: ${source.name} (id=${source.id}) -> parentId=${target.id} (${target.name})`);

    // print subtree under target
    const newSub = await collectSubtree(target.id);
    console.log('New subtree under target:');
    console.log(JSON.stringify(newSub, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Error during move:', err);
    process.exit(2);
  }
})();
