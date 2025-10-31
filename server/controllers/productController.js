const { Product, Sequelize } = require('../models');
const { Op } = require('sequelize');

const getProducts = async (req, res) => {
  try {
    const { category, brand, sku, q, priceMin, priceMax, stockMin, stockMax, ...rest } = req.query;
    const where = {};
    if (category) where.category = category;
    if (brand) where.brand = brand;
    if (sku) where.sku = sku;
    if (q) where.name = { [Op.iLike]: `%${q}%` };
    if (priceMin || priceMax) {
      where.price = {};
      if (priceMin) where.price[Op.gte] = Number(priceMin);
      if (priceMax) where.price[Op.lte] = Number(priceMax);
    }
    if (stockMin || stockMax) {
      where.stock = {};
      if (stockMin) where.stock[Op.gte] = Number(stockMin);
      if (stockMax) where.stock[Op.lte] = Number(stockMax);
    }

    let products = await Product.findAll({ where });

    // Specs filtering: any query key starting with spec_
    const specFilters = Object.fromEntries(Object.entries(rest).filter(([k]) => k.startsWith('spec_')));
    if (Object.keys(specFilters).length > 0) {
      products = products.filter((p) => {
        const specs = typeof p.specs === 'string' ? (() => { try { return JSON.parse(p.specs); } catch { return {}; } })() : p.specs || {};
        return Object.entries(specFilters).every(([k, v]) => {
          const key = k.replace(/^spec_/, '');
          return String((specs || {})[key] ?? '').toLowerCase() === String(v).toLowerCase();
        });
      });
    }

    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const addProduct = async (req, res) => {
  try {
    const body = { ...req.body };
    if (typeof body.price === 'string') body.price = parseFloat(body.price);
    if (typeof body.stock === 'string') body.stock = parseInt(body.stock, 10);
    if (body.specs && typeof body.specs === 'string') {
      try { body.specs = JSON.parse(body.specs); } catch (_) {}
    }
    if (req.file) {
      body.image = `/uploads/${req.file.filename}`;
    }
    const product = await Product.create(body);
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const body = { ...req.body };
    if (typeof body.price === 'string') body.price = parseFloat(body.price);
    if (typeof body.stock === 'string') body.stock = parseInt(body.stock, 10);
    if (body.specs && typeof body.specs === 'string') {
      try { body.specs = JSON.parse(body.specs); } catch (_) {}
    }
    if (req.file) {
      body.image = `/uploads/${req.file.filename}`;
    }
    await Product.update(body, { where: { id } });
    const updated = await Product.findByPk(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    await Product.destroy({ where: { id } });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getProducts, getProductById, addProduct, updateProduct, deleteProduct };

// Extra: categories and brands
const getCategories = async (req, res) => {
  try {
    const rows = await Product.findAll({ attributes: ['category', 'brand'] });
    const categories = Array.from(new Set(rows.map(r => r.category).filter(Boolean)));
    const brands = Array.from(new Set(rows.map(r => r.brand).filter(Boolean)));
    res.json({ categories, brands });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports.getCategories = getCategories;
