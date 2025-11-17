const { Category } = require('../models');

async function deleteRecursive(id) {
  const node = await Category.findByPk(id);
  if (!node) return;
  const children = await Category.findAll({ where: { parentId: id } });
  for (const c of children) {
    await deleteRecursive(c.id);
  }
  await Category.destroy({ where: { id } });
  console.log(`Deleted: ${node.name} (id=${node.id})`);
}

(async function main(){
  try {
    const root = await Category.findOne({ where: { name: 'SIGURIA & MBIKQYRJA', parentId: null } });
    if (!root) {
      console.log('SIGURIA & MBIKQYRJA root not found; nothing to delete');
      process.exit(0);
    }

    const bateri = await Category.findOne({ where: { name: 'BATERI & LLAMPA', parentId: root.id } });
    if (!bateri) {
      console.log('BATERI & LLAMPA not found under SIGURIA & MBIKQYRJA; nothing to delete');
      process.exit(0);
    }

    await deleteRecursive(bateri.id);
    console.log('Finished deleting BATERI & LLAMPA subtree.');
    process.exit(0);
  } catch (err) {
    console.error('Error deleting BATERI & LLAMPA subtree:', err);
    process.exit(2);
  }
})();
