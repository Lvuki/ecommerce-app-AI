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

    // create BATERI & LLAMPA as child of SIGURIA & MBIKQYRJA
    const bateriLlampa = await findOrCreateCategory('BATERI & LLAMPA', root.id);

    // ensure these first-level children exist under BATERI & LLAMPA
    const children = ['AKSESORE BATERI', 'BATERI', 'LLAMPA EKOLOGJIKE'];
    const created = {};
    for (const c of children) {
      const cat = await findOrCreateCategory(c, bateriLlampa.id);
      if (cat) created[c] = cat;
    }

    // level-2 assignments
    const level2 = {
      'AKSESORE BATERI': ['KARIKUES BATERISH'],
      'BATERI': ['BATERI ALKALINE', 'BATERI TE RIKARIKUESHME'],
      'LLAMPA EKOLOGJIKE': [
        'LLAMPA EKOLOGJIKE EKONOMIKE',
        'LLAMPA EKOLOGJIKE HALOGEN',
        'LLAMPA EKOLOGJIKE LED',
        'LLAMPA EKOLOGJIKE SET'
      ]
    };

    for (const parentName of Object.keys(level2)) {
      const parent = created[parentName];
      if (!parent) { console.warn(`Parent not found for level2: ${parentName}`); continue; }
      for (const sub of level2[parentName]) {
        await findOrCreateCategory(sub, parent.id);
      }
    }

    console.log('Done creating SIGURIA BATERI & LLAMPA subtree.');
    process.exit(0);
  } catch (err) {
    console.error('Error in create_siguria_bateri_children_run:', err);
    process.exit(2);
  }
})();
