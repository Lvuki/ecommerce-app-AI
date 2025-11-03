const { Category } = require('../models');

const listCategories = async (req, res) => {
  try {
    // Fetch all categories and build a recursive tree in JS so we can return arbitrary depth
    const rows = await Category.findAll({ order: [['name', 'ASC']] });

    // map by id
    const map = {};
    rows.forEach(r => {
      map[r.id] = { ...r.toJSON(), subcategories: [] };
    });

    const roots = [];
    rows.forEach(r => {
      const node = map[r.id];
      if (r.parentId && map[r.parentId]) {
        map[r.parentId].subcategories.push(node);
      } else {
        roots.push(node);
      }
    });

    res.json(roots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getCategory = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createCategory = async (req, res) => {
  try {
    const body = { ...req.body };
    // normalize parentId (may come as string from FormData)
    if (body.parentId) body.parentId = Number.isNaN(parseInt(body.parentId, 10)) ? null : parseInt(body.parentId, 10);
    if (req.file) {
      body.image = `/uploads/${req.file.filename}`;
    }

    // prevent cycle: parentId cannot equal this new category id (not known yet) but
    // ensure parentId, if provided, exists
    if (body.parentId) {
      const parent = await Category.findByPk(body.parentId);
      if (!parent) return res.status(400).json({ error: 'parentId does not exist' });
    }

    const cat = await Category.create(body);
    res.json(cat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const body = { ...req.body };
    if (body.parentId) body.parentId = Number.isNaN(parseInt(body.parentId, 10)) ? null : parseInt(body.parentId, 10);
    if (req.file) body.image = `/uploads/${req.file.filename}`;

    // validation: cannot set parentId to itself or to a descendant (would create a cycle)
    if (body.parentId) {
      const parentId = body.parentId;
      const myId = parseInt(id, 10);
      if (parentId === myId) return res.status(400).json({ error: 'parentId cannot be the same as category id' });

      // walk up from parentId to ensure we don't encounter myId
      let current = await Category.findByPk(parentId);
      while (current) {
        if (current.id === myId) return res.status(400).json({ error: 'parentId cannot be a descendant of this category' });
        if (!current.parentId) break;
        current = await Category.findByPk(current.parentId);
      }
    }

    await Category.update(body, { where: { id } });
    const updated = await Category.findByPk(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    await Category.destroy({ where: { id } });
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { listCategories, getCategory, createCategory, updateCategory, deleteCategory };