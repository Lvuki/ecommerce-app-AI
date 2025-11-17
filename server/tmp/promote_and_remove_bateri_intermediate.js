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
    const root = await Category.findOne({ where: { name: 'BATERI & LLAMPA', parentId: null } });
    if (!root) return console.error('Root BATERI & LLAMPA not found');

    const intermediate = await Category.findOne({ where: { name: 'BATERI & LLAMPA', parentId: root.id } });
    if (!intermediate) return console.error('No intermediate BATERI & LLAMPA child found under root');

    // backup intermediate subtree
    const subtree = await collectSubtree(intermediate.id);
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const outPath = path.join(__dirname, `promote_bateri_backup_${ts}.json`);
    fs.writeFileSync(outPath, JSON.stringify(subtree, null, 2), 'utf8');
    console.log('Backup written to', outPath);

    // promote children
    const children = await Category.findAll({ where: { parentId: intermediate.id } });
    for (const c of children) {
      const oldParent = c.parentId;
      c.parentId = root.id;
      await c.save();
      console.log(`Promoted: ${c.name} (id=${c.id}) from parentId=${oldParent} -> parentId=${root.id}`);
    }

    // delete intermediate
    await Category.destroy({ where: { id: intermediate.id } });
    console.log(`Deleted intermediate node: ${intermediate.name} (id=${intermediate.id})`);

    // print new subtree for root
    const newSub = await collectSubtree(root.id);
    console.log('New subtree under root BATERI & LLAMPA:');
    console.log(JSON.stringify(newSub, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Error during promote/remove:', err);
    process.exit(2);
  }
})();
