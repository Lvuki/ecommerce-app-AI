const path = require('path');
const fs = require('fs');

(async function(){
  try {
    process.chdir(path.join(__dirname, '..'));
    const db = require('../models');
    const Category = db.Category;

    const parents = [
      "ELEKTROSHTEPIAKE TE MEDHA",
      "ELEKTROSHTEPIAKE TE VOGLA",
      "TELEFONIA",
      "TV & AUDIO",
      "FTOHJE & NGROHJE",
      "KOMPJUTERA",
      "KUJDESI PERSONAL",
      "PASTRIMI & HEKUROSJA",
      "FOTO & VIDEO",
      "LOJRA & HOBI & GADGETS",
      "SIGURIA & MBIKQYRJA",
      "BATERI & LLAMPA"
    ];

    console.log('Ensuring parent categories exist (no duplicates)...');
    const created = [];
    for (const name of parents) {
      const existing = await Category.findOne({ where: { name: name } });
      if (existing) {
        console.log('Already exists:', name);
        continue;
      }
      const cat = await Category.create({ name: name });
      created.push(cat);
      console.log('Created:', name);
    }

    const top = await Category.findAll({ where: { parentId: null }, order: [['name','ASC']], raw: true });
    console.log('\nTop-level categories count:', top.length);
    console.log('Top-level categories list:');
    top.forEach(c => console.log('-', c.name));

    console.log('\nCreated count:', created.length);
    process.exit(0);
  } catch (err) {
    console.error('Error creating parent categories:', err);
    process.exit(2);
  }
})();
