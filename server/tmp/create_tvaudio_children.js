const { Category } = require('../models');

async function findOrCreateCategory(name, parentId = null) {
  name = (name || '').trim();
  if (!name) return null;
  const where = { name };
  if (parentId === null) where.parentId = null; else where.parentId = parentId;

  let cat = await Category.findOne({ where });
  if (cat) {
    console.log(`Exists: ${name} (id=${cat.id})`);
    return cat;
  }

  cat = await Category.create({ name, parentId });
  console.log(`Created: ${name} (id=${cat.id})`);
  return cat;
}

async function main() {
  try {
    const parent = await findOrCreateCategory('TV & AUDIO', null);
    if (!parent) throw new Error('TV & AUDIO parent missing');

    const children = ['AKSESORE AUDIO', 'AKSESORE TV', 'HI-FI', 'HOME CINEMA', 'MONITORE', 'TELEVIZORE'];
    const created = {};
    for (const c of children) {
      const cat = await findOrCreateCategory(c, parent.id);
      if (cat) created[c] = cat;
    }

    const level2 = {
      'AKSESORE TV': ['ANTENA'],
      'HI-FI': ['BOKSE BLUETOOTH', 'MINI HI-FI'],
      'HOME CINEMA': ['AMPLIFIKATORE', 'AV RECEIVER', 'BOKSE', 'HOME CINEMA', 'SOUNDBAR'],
      'MONITORE': ['MONITOR PROFESIONAL'],
      'TELEVIZORE': ['AKSESORE TV', 'TELEVIZOR LED', 'TELEVIZOR MINI LED', 'TELEVIZOR OLED', 'TELEVIZOR QLED', 'TELEVIZOR QNED', 'TELEVIZOR ULTRA HD 4K'],
    };

    for (const pName of Object.keys(level2)) {
      const parentCat = created[pName];
      if (!parentCat) {
        console.warn(`Parent not found for level2: ${pName}`);
        continue;
      }
      for (const name of level2[pName]) {
        await findOrCreateCategory(name, parentCat.id);
      }
    }

    console.log('Done creating TV & AUDIO children.');
    process.exit(0);
  } catch (err) {
    console.error('Error create_tvaudio_children:', err);
    process.exit(2);
  }
}

main();
