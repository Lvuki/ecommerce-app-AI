const { Blog } = require('../models');

const getPosts = async (req, res) => {
  try {
    const posts = await Blog.findAll({ order: [['createdAt', 'DESC']] });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getPostById = async (req, res) => {
  try {
    const p = await Blog.findByPk(req.params.id);
    if (!p) return res.status(404).json({ error: 'Post not found' });
    res.json(p);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const addPost = async (req, res) => {
  try {
    const body = { ...req.body };
    if (req.file) body.image = `/uploads/${req.file.filename}`;
    const created = await Blog.create(body);
    res.json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const body = { ...req.body };
    if (req.file) body.image = `/uploads/${req.file.filename}`;
    await Blog.update(body, { where: { id } });
    const updated = await Blog.findByPk(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    await Blog.destroy({ where: { id } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getPosts, getPostById, addPost, updatePost, deletePost };
