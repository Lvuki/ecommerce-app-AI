const { Category } = require('../models');

async function findOrCreateCategory(name, parentId = null) {
  name = (name || '').trim();
  if (!name) return null;
  const where = { name };
  if (parentId === null) {
    where.parentId = null;
  } else {
    where.parentId = parentId;
  }

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
    // Ensure top-level TELEFONIA exists
    const telefonia = await findOrCreateCategory('TELEFONIA', null);
    if (!telefonia) throw new Error('Failed to ensure TELEFONIA parent');

    // Children to create under TELEFONIA in the exact order requested
    const children = ['CELULARE', 'SMARTPHONE', 'SMARTWATCH', 'TELEFONA FIKS'];

    const createdChildren = {};
    for (const name of children) {
      const c = await findOrCreateCategory(name, telefonia.id);
      if (c) createdChildren[name] = c;
    }

    // Level-2 children mapping
    const level2 = {
      'SMARTPHONE': ['AKSESORE SMARTPHONE'],
      'SMARTWATCH': ['AKSESORE SMARTWATCH'],
      'TELEFONA FIKS': ['TELEFON CORDLESS', 'TELEFON FIKS'],
    };

    for (const parentName of Object.keys(level2)) {
      const parent = createdChildren[parentName];
      if (!parent) {
        console.warn(`Parent not found for level2 creation: ${parentName}`);
        continue;
      }
      const names = level2[parentName];
      for (const n of names) {
        await findOrCreateCategory(n, parent.id);
      }
    }

    console.log('Done creating TELEFONIA children.');
    process.exit(0);
  } catch (err) {
    console.error('Error in create_telefonia_children:', err);
    process.exit(2);
  }
}

main();
