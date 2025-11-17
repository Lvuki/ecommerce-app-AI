const { Category } = require('../models');

(async function(){
  try {
    const rows = await Category.findAll({ where: { name: 'BATERI & LLAMPA' } });
    if (!rows || !rows.length) {
      console.log('No categories named BATERI & LLAMPA found');
      return process.exit(0);
    }
    for (const r of rows) {
      const parent = r.parentId ? await Category.findByPk(r.parentId) : null;
      console.log(`id=${r.id} name='${r.name}' parentId=${r.parentId} parentName='${parent ? parent.name : '<<root>>'}'`);
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(2);
  }
})();
