const { Page } = require('../models');

exports.listPublic = async (req, res) => {
  try {
    const visibleOnly = req.query.visible !== 'false';
    const where = visibleOnly ? { visible: true } : {};
    const pages = await Page.findAll({ where, order: [['order', 'ASC'], ['id', 'ASC']] });
    res.json(pages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to list pages' });
  }
};

exports.getBySlug = async (req, res) => {
  try {
    // normalize incoming slug (trim whitespace)
    const slug = (req.params.slug || '').toString().trim();
    const page = await Page.findOne({ where: { slug } });
    if (!page) return res.status(404).json({ message: 'Page not found' });
    if (!page.visible && (!req.user || req.user.role !== 'admin')) return res.status(404).json({ message: 'Page not found' });
    res.json(page);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to get page' });
  }
};

exports.listAll = async (req, res) => {
  try {
    const pages = await Page.findAll({ order: [['order', 'ASC'], ['id', 'ASC']] });
    res.json(pages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to list pages' });
  }
};

exports.create = async (req, res) => {
  try {
    const payload = req.body || {};
    // basic slug sanitization: trim and normalize; generate from title when missing
    if (payload.slug) {
      payload.slug = payload.slug.toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    } else if (payload.title) {
      payload.slug = payload.title.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    const created = await Page.create(payload);
    res.json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create page', error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    const payload = req.body || {};
    const page = await Page.findByPk(id);
    if (!page) return res.status(404).json({ message: 'Page not found' });
    // sanitize slug if present in update
    if (payload.slug) payload.slug = payload.slug.toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    await page.update(payload);
    res.json(page);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update page' });
  }
};

exports.remove = async (req, res) => {
  try {
    const id = req.params.id;
    const page = await Page.findByPk(id);
    if (!page) return res.status(404).json({ message: 'Page not found' });
    await page.destroy();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete page' });
  }
};
