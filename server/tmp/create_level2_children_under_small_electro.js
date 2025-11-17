const path = require('path');

(async function(){
  try {
    process.chdir(path.join(__dirname, '..'));
    const db = require('../models');
    const Category = db.Category;

    const topParentName = 'ELEKTROSHTEPIAKE TE VOGLA';

    const map = {
      'GATIMI': [
        'FRITEZA',
        'FURRA',
        'GATUES',
        'GRILLA',
        'MAKINE PRODHUES AKULLI',
        'MIKROVALE',
        'PIANURA'
      ],
      'PERGATITJA E KAFESE': [
        'AKSESORE',
        'EKSPRESE',
        'MAKINE KAFEJE',
        'MULLINJ KAFEJE',
        'XHEZVE'
      ],
      'PERGATITJA E USHQIMIT': [
        'AKSESORE',
        'APARATE VAKUMI',
        'BLENDERA',
        'GRIRESE',
        'MIKSERA',
        'NGROHES UJI',
        'PESHORE USHQIMI',
        'SHTRYDHESE',
        'THEKESE',
        'TOSTIERE'
      ],
      'ENE KUZHINE': [
        'AKSESORE KUZHINE',
        'CAJNIK',
        'TAVA PJEKJE',
        'TENXHERE',
        'TIGANE'
      ]
    };

    const top = await Category.findOne({ where: { name: topParentName, parentId: null } });
    if (!top) {
      console.error('Top parent not found:', topParentName);
      process.exit(2);
    }

    for (const [parentName, children] of Object.entries(map)) {
      console.log('\nProcessing parent:', parentName);
      let parent = await Category.findOne({ where: { name: parentName, parentId: top.id } });
      if (!parent) {
        console.warn('  Parent not found under top parent, creating parent:', parentName);
        parent = await Category.create({ name: parentName, parentId: top.id });
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

    console.log('\nDone creating level-2 children under ELEKTROSHTEPIAKE TE VOGLA.');
    process.exit(0);
  } catch (err) {
    console.error('Error in create_level2_children_under_small_electro:', err);
    process.exit(2);
  }
})();
