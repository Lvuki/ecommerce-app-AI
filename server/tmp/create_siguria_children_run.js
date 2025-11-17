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
    const rootName = 'SIGURIA & MBIKQYRJA';
    const root = await findOrCreateCategory(rootName, null);

    const children = ['KAMERA SIGURIE'];
    const created = {};
    for (const c of children) {
      const cat = await findOrCreateCategory(c, root.id);
      if (cat) created[c] = cat;
    }

    const level2 = {
      'KAMERA SIGURIE': ['KAMER SIGURIE E BRENDSHME', 'KAMER SIGURIE E JASHTME']
    };

    for (const parentName of Object.keys(level2)) {
      const parent = created[parentName];
      if (!parent) { console.warn(`Parent not found for level2: ${parentName}`); continue; }
      for (const sub of level2[parentName]) {
        await findOrCreateCategory(sub, parent.id);
      }
    }

    console.log('Done creating SIGURIA & MBIKQYRJA children and level-2 children.');
    process.exit(0);
  } catch (err) {
    console.error('Error in create_siguria_children_run:', err);
    process.exit(2);
  }
})();
