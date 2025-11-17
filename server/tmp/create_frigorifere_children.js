const path = require('path');

(async function(){
  try {
    process.chdir(path.join(__dirname, '..'));
    const db = require('../models');
    const Category = db.Category;

    const topParentName = 'ELEKTROSHTEPIAKE TE MEDHA';
    const parentName = 'FRIGORIFERE';
    const children = [
      'FRIGORIFER BANAK',
      'FRIGORIFER FTOHES',
      'FRIGORIFER I KOMBINUAR',
      'FRIGORIFER MINI BAR',
      'FRIGORIFER MULTI DOOR',
      'FRIGORIFER NGRIRES',
      'FRIGORIFER SBS',
      'FRIGORIFER VERE',
      'AKSESORE FRIGORIFERI'
    ];

    console.log('Locating top parent:', topParentName);
    const top = await Category.findOne({ where: { name: topParentName, parentId: null } });
    if (!top) {
      console.error('Top-level parent not found:', topParentName);
      process.exit(2);
    }

    console.log('Locating parent child:', parentName);
    const parent = await Category.findOne({ where: { name: parentName, parentId: top.id } });
    if (!parent) {
      console.error('Parent category not found under', topParentName, ':', parentName);
      process.exit(2);
    }

    const created = [];
    for (const name of children) {
      const existing = await Category.findOne({ where: { name, parentId: parent.id } });
      if (existing) {
        console.log('Already exists:', name);
        continue;
      }
      const c = await Category.create({ name, parentId: parent.id });
      created.push(c);
      console.log('Created:', name);
    }

    console.log('\nCreated count:', created.length);
    const rows = await Category.findAll({ where: { parentId: parent.id }, order: [['id','ASC']], raw: true });
    console.log('\nCurrent children under', parentName, ':');
    rows.forEach(r => console.log('-', r.name));

    process.exit(0);
  } catch (err) {
    console.error('Error in create_frigorifere_children:', err);
    process.exit(2);
  }
})();
