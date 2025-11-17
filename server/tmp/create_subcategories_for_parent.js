const path = require('path');

(async function(){
  try {
    // run from server/ so ../models resolves correctly
    process.chdir(path.join(__dirname, '..'));
    const db = require('../models');
    const Category = db.Category;

    const parentName = 'ELEKTROSHTEPIAKE TE MEDHA';
    const children = [
      'FRIGORIFERE',
      'LAVATRICE',
      'LAVASTOVILJE',
      'ASPIRATORE',
      'PERGATITJA E KAFESE',
      'SOBA & MIKROVALE',
      'THARESE RROBASH',
      'AKSESORE GATIMI',
      'ELEKTROSHTEPIAKE INKASO'
    ];

    console.log('Ensuring parent exists:', parentName);
    let parent = await Category.findOne({ where: { name: parentName, parentId: null } });
    if (!parent) {
      parent = await Category.create({ name: parentName });
      console.log('Created parent:', parentName);
    } else {
      console.log('Found existing parent:', parentName);
    }

    // Insert children in order; idempotent: skip if a child with same name and parentId exists
    const created = [];
    for (const childName of children) {
      const existing = await Category.findOne({ where: { name: childName, parentId: parent.id } });
      if (existing) {
        console.log('Already exists child under parent:', childName);
        continue;
      }
      const c = await Category.create({ name: childName, parentId: parent.id });
      created.push(c);
      console.log('Created child:', childName);
    }

    console.log('\nCreated children count:', created.length);
    // print current children
    const childrenRows = await Category.findAll({ where: { parentId: parent.id }, order: [['id','ASC']], raw: true });
    console.log('\nCurrent children for', parentName, ':');
    childrenRows.forEach(c => console.log('-', c.name));

    process.exit(0);
  } catch (err) {
    console.error('Error in create_subcategories_for_parent:', err);
    process.exit(2);
  }
})();
