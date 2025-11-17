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
  try{
    const rootName = 'KOMPJUTERA';
    const root = await findOrCreateCategory(rootName, null);

    const children = ['AKSESORE KOMPJUTERI','AKSESORE RRJETI','LAPTOP','MONITORE','PC','PRINTERA','STORAGE','TABLETA'];
    const created = {};
    for(const name of children){
      const c = await findOrCreateCategory(name, root.id);
      if(c) created[name]=c;
    }

    const level2 = {
      'AKSESORE KOMPJUTERI': ['NETWORK','UPS'],
      'AKSESORE RRJETI': ['KABLLO RRJETI'],
      'LAPTOP': ['AKSESORE LAPTOPI'],
      'PC': ['AKSESORE','KOMPJUTER ALL IN ONE','KOMPJUTER DESKTOP'],
      'PRINTERA': ['AKSESORE PRINTERI','BOJE PRINTERI','PRINTER INKJET','PRINTER LASER','PRINTER TERMAL','TONER PRINTERI'],
      'STORAGE': ['HDD / SSD','KARTE MEMORIE','USB'],
      'TABLETA': ['AKSESORE TABLETI','IPAD','TABLET']
    };

    for(const p of Object.keys(level2)){
      const parent = created[p];
      if(!parent){ console.warn('Parent not found for level2: '+p); continue; }
      for(const n of level2[p]) await findOrCreateCategory(n, parent.id);
    }

    console.log('Done creating KOMPJUTERA children and level-2 children.');
    process.exit(0);
  }catch(e){ console.error(e); process.exit(2);} })();
