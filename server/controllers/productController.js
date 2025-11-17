const { Product, Rating, Sequelize } = require('../models');
const { Op } = require('sequelize');

const getProducts = async (req, res) => {
  try {
  const { category, brand, sku, q, priceMin, priceMax, stockMin, stockMax, ...rest } = req.query;
  let where = {};
    // support filtering by either product.category string OR the categories JSON array
    if (category) {
      // Some DBs may have `categories` as JSON (not JSONB) which causes the
      // Postgres @> operator to fail; use a safe literal cast to jsonb so the
      // containment check works regardless of stored JSON type.
      const safe = JSON.stringify([category]).replace(/'/g, "''");
      where = {
        [Op.or]: [
          { category: category },
          Sequelize.literal(`categories::jsonb @> '${safe}'::jsonb`)
        ]
      };
    }
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

    // filter only currently active offers
    if (req.query.offer === 'true') {
      const now = new Date();
      // combine existing where into an AND with offer constraints
      const offerConstraints = [
        { offerPrice: { [Op.ne]: null } },
        { offerFrom: { [Op.lte]: now } },
        { offerTo: { [Op.gte]: now } },
      ];
      // if we already have criteria, include them as the first element
      if (Object.keys(where).length) {
        where = { [Op.and]: [where, ...offerConstraints] };
      } else {
        where = { [Op.and]: offerConstraints };
      }
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

    // normalize fields for the client: ensure numeric price/salePrice/offerPrice and parsed images/specs
    const normalized = products.map(p => {
      const obj = p && typeof p.toJSON === 'function' ? p.toJSON() : p;
      // price and salePrice as numbers
      if (obj.price !== undefined && obj.price !== null) obj.price = Number(obj.price);
      if (obj.salePrice !== undefined && obj.salePrice !== null) obj.salePrice = Number(obj.salePrice);
      else obj.salePrice = null;
      if (obj.offerPrice !== undefined && obj.offerPrice !== null) obj.offerPrice = Number(obj.offerPrice);
      else obj.offerPrice = null;
      // offerFrom/offerTo to ISO strings if present
      if (obj.offerFrom) obj.offerFrom = (new Date(obj.offerFrom)).toISOString();
      if (obj.offerTo) obj.offerTo = (new Date(obj.offerTo)).toISOString();
      // specs may be stored as JSON string
      if (obj.specs && typeof obj.specs === 'string') {
        try { obj.specs = JSON.parse(obj.specs); } catch (_) { }
      }
      // images may be stored as JSON string; normalize to an array
      if (obj.images && typeof obj.images === 'string') {
        try {
          obj.images = JSON.parse(obj.images);
        } catch (_) {
          obj.images = obj.images ? [obj.images] : [];
        }
      }
      if ((!obj.images || !obj.images.length) && obj.image) obj.images = [obj.image];
      // remove falsy/empty image entries
      if (Array.isArray(obj.images)) obj.images = obj.images.map(i => (i || '').toString().trim()).filter(Boolean);
      // ensure categories is an array if present
      if (obj.categories && typeof obj.categories === 'string') {
        try { obj.categories = JSON.parse(obj.categories); } catch (_) { obj.categories = [obj.categories]; }
      }
      return obj;
    });
    res.json(normalized);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const obj = product && typeof product.toJSON === 'function' ? product.toJSON() : product;
    // normalize numeric fields
    if (obj.price !== undefined && obj.price !== null) obj.price = Number(obj.price);
    if (obj.salePrice !== undefined && obj.salePrice !== null) obj.salePrice = Number(obj.salePrice);
    else obj.salePrice = null;
    if (obj.offerPrice !== undefined && obj.offerPrice !== null) obj.offerPrice = Number(obj.offerPrice);
    else obj.offerPrice = null;
    // parse specs/images if stored as strings
    if (obj.specs && typeof obj.specs === 'string') {
      try { obj.specs = JSON.parse(obj.specs); } catch (_) { }
    }
    if (obj.images && typeof obj.images === 'string') {
      try { obj.images = JSON.parse(obj.images); } catch (_) { obj.images = [obj.images]; }
    }
    if ((!obj.images || !obj.images.length) && obj.image) obj.images = [obj.image];
    if (obj.offerFrom) obj.offerFrom = (new Date(obj.offerFrom)).toISOString();
    if (obj.offerTo) obj.offerTo = (new Date(obj.offerTo)).toISOString();
    // ensure categories is an array if present
    if (obj.categories && typeof obj.categories === 'string') {
      try { obj.categories = JSON.parse(obj.categories); } catch (_) { obj.categories = [obj.categories]; }
    }
    // include aggregate ratings (avg and count) if Ratings table exists
    try {
      if (Rating) {
        const stats = await Rating.findAll({
          attributes: [
            [Sequelize.fn('AVG', Sequelize.col('value')), 'avg'],
            [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
          ],
          where: { productId: obj.id }
        });
        if (stats && stats[0]) {
          const avg = parseFloat(stats[0].get('avg')) || 0;
          const count = parseInt(stats[0].get('count'), 10) || 0;
          obj.ratingAvg = Number(avg.toFixed(2));
          obj.ratingCount = count;
        }
      }
    } catch (e) {
      // ignore rating errors so product fetch still works
    }
    res.json(obj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /products/:id/rate
const rateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const value = req.body && (req.body.value || req.body.rating || req.body.rate);
    const v = parseInt(value, 10);
    if (!v || v < 1 || v > 5) return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
    const product = await Product.findByPk(id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const userId = req.user && req.user.id ? req.user.id : null;
    if (userId) {
      // upsert: one rating per user per product
      const existing = await Rating.findOne({ where: { productId: id, userId } });
      if (existing) {
        existing.value = v;
        await existing.save();
      } else {
        await Rating.create({ productId: id, userId, value: v });
      }
    } else {
      // anonymous: just create a row
      await Rating.create({ productId: id, userId: null, value: v });
    }

    // return updated aggregates
    const stats = await Rating.findAll({
      attributes: [
        [Sequelize.fn('AVG', Sequelize.col('value')), 'avg'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      where: { productId: id }
    });
    const avg = parseFloat(stats[0].get('avg')) || 0;
    const count = parseInt(stats[0].get('count'), 10) || 0;
    res.json({ average: Number(avg.toFixed(2)), count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const addProduct = async (req, res) => {
  try {
    const body = { ...req.body };
    if (typeof body.price === 'string') body.price = parseFloat(body.price);
    if (typeof body.salePrice === 'string') body.salePrice = parseFloat(body.salePrice);
    if (typeof body.offerPrice === 'string') body.offerPrice = parseFloat(body.offerPrice);
    if (typeof body.stock === 'string') body.stock = parseInt(body.stock, 10);
    if (body.specs && typeof body.specs === 'string') {
      try { body.specs = JSON.parse(body.specs); } catch (_) {}
    }
    // normalize offer dates if provided (ISO strings expected)
    if (body.offerFrom) body.offerFrom = new Date(body.offerFrom);
    if (body.offerTo) body.offerTo = new Date(body.offerTo);
    // build categories hierarchy array: include category, its parent, and grandparent if present
    if (body.category) {
      try {
        const cat = await require('../models').Category.findOne({ where: { name: body.category } });
        if (cat) {
          const cats = [cat.name];
          if (cat.parentId) {
            const parent = await require('../models').Category.findByPk(cat.parentId);
            if (parent) cats.push(parent.name);
            if (parent && parent.parentId) {
              const grand = await require('../models').Category.findByPk(parent.parentId);
              if (grand) cats.push(grand.name);
            }
          }
          body.categories = cats;
        }
      } catch (e) {
        // ignore category lookup failures
      }
    }
    // Support multiple uploaded images (key: images)
    if (req.files && req.files.length) {
      body.images = req.files.map(f => `/uploads/${f.filename}`);
      // keep backward-compatible `image` as first image
      body.image = body.images[0];
    } else if (req.file) {
      body.image = `/uploads/${req.file.filename}`;
      body.images = [body.image];
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
    if (typeof body.salePrice === 'string') body.salePrice = parseFloat(body.salePrice);
    if (typeof body.offerPrice === 'string') body.offerPrice = parseFloat(body.offerPrice);
    if (typeof body.stock === 'string') body.stock = parseInt(body.stock, 10);
    if (body.specs && typeof body.specs === 'string') {
      try { body.specs = JSON.parse(body.specs); } catch (_) {}
    }
    if (body.offerFrom) body.offerFrom = new Date(body.offerFrom);
    if (body.offerTo) body.offerTo = new Date(body.offerTo);
    // build categories hierarchy array when category is provided
    if (body.category) {
      try {
        const cat = await require('../models').Category.findOne({ where: { name: body.category } });
        if (cat) {
          const cats = [cat.name];
          if (cat.parentId) {
            const parent = await require('../models').Category.findByPk(cat.parentId);
            if (parent) cats.push(parent.name);
            if (parent && parent.parentId) {
              const grand = await require('../models').Category.findByPk(parent.parentId);
              if (grand) cats.push(grand.name);
            }
          }
          body.categories = cats;
        }
      } catch (e) {}
    }
    // Support multiple uploaded images (key: images)
    if (req.files && req.files.length) {
      body.images = req.files.map(f => `/uploads/${f.filename}`);
      body.image = body.images[0];
    } else if (req.file) {
      body.image = `/uploads/${req.file.filename}`;
      body.images = [body.image];
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

module.exports = { getProducts, getProductById, addProduct, updateProduct, deleteProduct, rateProduct };

// Extra: categories and brands
const getCategories = async (req, res) => {
  try {
    const rows = await Product.findAll({ attributes: ['category', 'categories', 'brand'] });
    const cats = new Set();
    const brands = new Set();
    for (const r of rows) {
      const rec = r && typeof r.toJSON === 'function' ? r.toJSON() : r;
      if (rec.category) cats.add(rec.category);
      if (rec.categories && Array.isArray(rec.categories)) rec.categories.forEach(c => c && cats.add(c));
      if (rec.brand) brands.add(rec.brand);
    }
    res.json({ categories: Array.from(cats), brands: Array.from(brands) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports.getCategories = getCategories;
