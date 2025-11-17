const path = require('path');

(async function(){
  try {
    process.chdir(path.join(__dirname, '..'));
    const db = require('../models');
    const Category = db.Category;

    const topParentName = 'ELEKTROSHTEPIAKE TE MEDHA';

    const map = {
      'LAVATRICE': [
        'AKSESORE LAVATRICE',
        'LARESE - THARESE',
        'LAVATRICE'
      ],
      'LAVASTOVILJE': [
        'AKSESORE LAVASTOVILJE',
        'LAVASTOVILJE'
      ],
      'ASPIRATORE': [
        'ASPIRATORE'
      ],
      'PERGATITJA E KAFESE': [
        'EKSPRESE INKASO AUTOMATIK',
        'EKSPRESE INKASO MANUAL'
      ],
      'SOBA & MIKROVALE': [
        'GRILLA',
        'MIKROVALE',
        'SOBE ELEKTRIKE'
      ],
      'THARESE RROBASH': [
        'AKSESORE THARESE RROBASH',
        'HIGJENIZUES RROBASH',
        'THARESE RROBASH'
      ],
      'ELEKTROSHTEPIAKE INKASO': [
        'AKSESORE',
        'ASPIRATORE INKASO',
        'FRIGORIFERE INKASO',
        'FURRA INKASO',
        'LAVAPJATA & RUBINETA',
        'LAVASTOVILJE INKASO',
        'LAVATRICE INKASO',
        'PIANURA INKASO',
        'PRODUKTE SPECIALE INKASO'
      ]
    };

    const top = await Category.findOne({ where: { name: topParentName, parentId: null } });
    if (!top) {
      console.error('Top parent not found:', topParentName);
      process.exit(2);
    }

    for (const [parentName, children] of Object.entries(map)) {
      console.log('\nProcessing parent:', parentName);
      const parent = await Category.findOne({ where: { name: parentName, parentId: top.id } });
      if (!parent) {
        console.warn('  Parent not found under top parent, creating parent:', parentName);
        const created = await Category.create({ name: parentName, parentId: top.id });
        parent = created;
      }

      for (const childName of children) {
        const existing = await Category.findOne({ where: { name: childName, parentId: parent.id } });
        if (existing) {
          console.log('   Already exists:', childName);
          continue;
        }
        await Category.create({ name: childName, parentId: parent.id });
        console.log('   Created:', childName);
      }
    }

    console.log('\nDone creating level-2 children.');
    process.exit(0);
  } catch (err) {
    console.error('Error in create_multiple_level2_children:', err);
    process.exit(2);
  }
})();
