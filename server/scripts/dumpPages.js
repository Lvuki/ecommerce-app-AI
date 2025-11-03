const { sequelize, Page } = require('../models');

(async () => {
  try {
    await sequelize.authenticate();
    const pages = await Page.findAll({ order: [['id','ASC']] });
    console.log(JSON.stringify(pages.map(p => ({ id: p.id, title: p.title, slug: p.slug, visible: p.visible, type: p.type, content: p.content })), null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Failed to dump pages', err);
    process.exit(1);
  }
})();
