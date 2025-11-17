const { Category } = require('../models');

async function findOrCreateCategory(name, parentId = null) {
  name = (name || '').trim();
  if (!name) return null;
  const where = { name };
  if (parentId === null) where.parentId = null;
  else where.parentId = parentId;

  let cat = await Category.findOne({ where });
  if (cat) {
    console.log(`Exists: ${name} (id=${cat.id})`);
    return cat;
  }

  cat = await Category.create({ name, parentId });
  console.log(`Created: ${name} (id=${cat.id})`);
  return cat;
}

(async function main(){
  try {
    const parent = await findOrCreateCategory('FTOHJE & NGROHJE', null);
    if (!parent) throw new Error('Parent creation failed');
    const children = ['CHILLER','KONDICIONERE','NGROHES AJRI','TRAJTIMI I UJIT','TRAJTUES AJRI'];
    for (const n of children) await findOrCreateCategory(n, parent.id);
    console.log('Done creating FTOHJE & NGROHJE children.');
    process.exit(0);
  } catch (err) {
    console.error('Error running create_ftohje_children_run:', err);
    process.exit(2);
  }
})();
