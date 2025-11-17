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
    const rootName = 'FTOHJE & NGROHJE';
    const root = await Category.findOne({ where: { name: rootName, parentId: null } });
    if (!root) throw new Error(`Parent ${rootName} not found`);

    const level2 = {
      'CHILLER': ['FAN COIL MURAL', 'FAN COIL TAVANOR', 'FAN COIL TOKESOR', 'MINI CHILLER', 'POMPE NXEHTESIE UJI', 'VERSATI'],
      'KONDICIONERE': ['AKSESORE KONDICIONERI','MONOSPLIT KOLONE','MONOSPLIT MURAL','MONOSPLIT TOKESOR','MULTISPLIT KANALOR','MULTISPLIT KASETE','MULTISPLIT MURAL','MULTISPLIT TOKESOR','PORTABEL','NJESI E JASHTME KONDICIONERI MULTISPLIT','VENTILATOR'],
      'NGROHES AJRI': ['AEROTERM','KALORIFER','KONVEKTOR','NGROHES AJRI','RADIATOR TUALETI'],
      'TRAJTIMI I UJIT': ['BOILERE','NGROHES UJI TE MENJEHERSHEM'],
      'TRAJTUES AJRI': ['AKSESORE','HEQES LAGESHTIE','PASTRUES AJRI','SHTUES LAGESHTIE']
    };

    for (const childName of Object.keys(level2)) {
      const child = await Category.findOne({ where: { name: childName, parentId: root.id } });
      if (!child) {
        console.warn(`Parent-level child not found: ${childName} under ${rootName}`);
        continue;
      }
      for (const subName of level2[childName]) {
        await findOrCreateCategory(subName, child.id);
      }
    }

    console.log('Done creating FTOHJE level-2 children.');
    process.exit(0);
  } catch (err) {
    console.error('Error in create_ftohje_level2_children:', err);
    process.exit(2);
  }
})();
