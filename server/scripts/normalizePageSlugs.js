const { sequelize, Page } = require('../models');

function sanitize(slug) {
  if (!slug) return slug;
  return slug.toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

(async () => {
  try {
    await sequelize.authenticate();
    const pages = await Page.findAll();
    for (const p of pages) {
      const s = sanitize(p.slug || p.title);
      if (s !== p.slug) {
        console.log(`Updating slug for id=${p.id} from '${p.slug}' to '${s}'`);
        p.slug = s;
        await p.save();
      }
    }
    console.log('Done normalizing page slugs');
    process.exit(0);
  } catch (err) {
    console.error('Failed to normalize slugs', err);
    process.exit(1);
  }
})();
