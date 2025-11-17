const path = require('path');

(async function(){
  try {
    process.chdir(path.join(__dirname, '..'));
    const db = require('../models');
    const Category = db.Category;

    const topParentName = 'ELEKTROSHTEPIAKE TE VOGLA';
    const children = [
      'GATIMI',
      'PERGATITJA E KAFESE',
      'PERGATITJA E USHQIMIT',
      'ENE KUZHINE'
    ];

    console.log('Ensuring top parent exists:', topParentName);
    let top = await Category.findOne({ where: { name: topParentName, parentId: null } });
    if (!top) {
      top = await Category.create({ name: topParentName });
      console.log('Created top parent:', topParentName);
    } else {
      console.log('Found top parent:', topParentName);
    }

    const created = [];
    for (const name of children) {
      const existing = await Category.findOne({ where: { name, parentId: top.id } });
      if (existing) {
        console.log('Already exists child:', name);
        continue;
      }
      const c = await Category.create({ name, parentId: top.id });
      created.push(c);
      console.log('Created child:', name);
    }

    console.log('\nCreated children count:', created.length);
    const rows = await Category.findAll({ where: { parentId: top.id }, order: [['id','ASC']], raw: true });
    console.log('\nCurrent children for', topParentName, ':');
    rows.forEach(r => console.log('-', r.name));

    process.exit(0);
  } catch (err) {
    console.error('Error in create_children_for_small_electro:', err);
    process.exit(2);
  }
})();
