const { BlogCategory } = require('../models');

const listBlogCategories = async (req, res) => {
  try {
    const rows = await BlogCategory.findAll({ order: [['name', 'ASC']] });
    const map = {};
    rows.forEach(r => { map[r.id] = { ...r.toJSON(), subcategories: [] }; });
    const roots = [];
    rows.forEach(r => {
      const node = map[r.id];
      if (r.parentId && map[r.parentId]) map[r.parentId].subcategories.push(node);
      else roots.push(node);
    });
    res.json(roots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getBlogCategory = async (req, res) => {
  try {
    const cat = await BlogCategory.findByPk(req.params.id);
    if (!cat) return res.status(404).json({ error: 'Not found' });
    res.json(cat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createBlogCategory = async (req, res) => {
  try {
    const body = { ...req.body };
    if (body.parentId) body.parentId = Number.isNaN(parseInt(body.parentId, 10)) ? null : parseInt(body.parentId, 10);
    if (req.file) body.image = `/uploads/${req.file.filename}`;
    if (body.parentId) {
      const parent = await BlogCategory.findByPk(body.parentId);
      if (!parent) return res.status(400).json({ error: 'parentId does not exist' });
    }
    const cat = await BlogCategory.create(body);
    res.json(cat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateBlogCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const body = { ...req.body };
    if (body.parentId) body.parentId = Number.isNaN(parseInt(body.parentId, 10)) ? null : parseInt(body.parentId, 10);
    if (req.file) body.image = `/uploads/${req.file.filename}`;
    if (body.parentId) {
      const parentId = body.parentId;
      const myId = parseInt(id, 10);
      if (parentId === myId) return res.status(400).json({ error: 'parentId cannot be the same as category id' });
      let current = await BlogCategory.findByPk(parentId);
      while (current) {
        if (current.id === myId) return res.status(400).json({ error: 'parentId cannot be a descendant' });
        if (!current.parentId) break;
        current = await BlogCategory.findByPk(current.parentId);
      }
    }
    await BlogCategory.update(body, { where: { id } });
    const updated = await BlogCategory.findByPk(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteBlogCategory = async (req, res) => {
  try {
    const { id } = req.params;
    await BlogCategory.destroy({ where: { id } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { listBlogCategories, getBlogCategory, createBlogCategory, updateBlogCategory, deleteBlogCategory };