const models = require('../models');
const { Product, Rating, Sequelize } = models;
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');

// Helper: build category path (top -> child1 -> child2) from Category table.
// Accepts either a category name or numeric id (string or number).
async function buildCategoryPath(identifier) {
  const Category = models.Category;
  if (!identifier) return null;
  let cat = null;
  const asNum = Number(identifier);
  if (!Number.isNaN(asNum) && Number.isFinite(asNum)) {
    cat = await Category.findByPk(asNum);
  }
  if (!cat) {
    cat = await Category.findOne({ where: { name: identifier } });
  }
  if (!cat) return null;
  const names = [];
  let cur = cat;
  while (cur) {
    names.push(cur.name);
    if (!cur.parentId) break;
    cur = await Category.findByPk(cur.parentId);
  }
  return names.reverse();
}

const getProducts = async (req, res) => {
  try {
  const { category, brand, sku, q, priceMin, priceMax, stockMin, stockMax, ...rest } = req.query;
  let where = {};
    // support filtering by either product.category string OR the categories JSON array
    if (category) {
      // Support matching by exact category string, by containment inside the
      // product `categories` JSON array, or when the stored `category` string
      // contains the parent category name (e.g. 'Parent/Child'). This helps
      // when some products only have a string path while others have an array.
      const safe = JSON.stringify([category]).replace(/'/g, "''");
      const lowerLike = `%${String(category).toLowerCase()}%`;
      where = {
        [Op.or]: [
          { category: category },
          // categories may be stored as JSON (or JSON text); use a jsonb
          // containment check when available.
          Sequelize.literal(`categories::jsonb @> '${safe}'::jsonb`),
          // Also match when category string contains the parent name (case-insensitive)
          Sequelize.where(Sequelize.fn('lower', Sequelize.col('category')), { [Op.like]: lowerLike })
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
    // Build categories array in top->child order using Category table
    if (body.category) {
      try {
        const path = await buildCategoryPath(body.category);
        if (path && path.length) body.categories = path;
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
    // Build categories array in top->child order using Category table
    if (body.category) {
      try {
        const path = await buildCategoryPath(body.category);
        if (path && path.length) body.categories = path;
      } catch (e) {
        // ignore
      }
    }
    // Support multiple uploaded images (key: images)
    // Load existing product images from DB so we can safely merge lists
    const existingProduct = await Product.findByPk(id);
    let currentImagesFromDb = [];
    if (existingProduct) {
      const pj = existingProduct && typeof existingProduct.toJSON === 'function' ? existingProduct.toJSON() : existingProduct;
      if (pj.images && typeof pj.images === 'string') {
        try { currentImagesFromDb = JSON.parse(pj.images); } catch (_) { currentImagesFromDb = pj.images ? [pj.images] : []; }
      } else if (Array.isArray(pj.images)) {
        currentImagesFromDb = pj.images.slice();
      } else if (pj.image) {
        currentImagesFromDb = [pj.image];
      }
    }

    // Parse any images array coming from the client (may be JSON string)
    if (body.images && typeof body.images === 'string') {
      try { body.images = JSON.parse(body.images); } catch (_) { body.images = body.images ? [body.images] : []; }
    }
    // Also support existingImages field which the client uses to send existing
    // image URL strings in the same multipart payload when files are uploaded.
    if (body.existingImages && typeof body.existingImages === 'string') {
      try { body.existingImages = JSON.parse(body.existingImages); } catch (_) { body.existingImages = body.existingImages ? [body.existingImages] : []; }
    }

    // imagesAction can be used by client to indicate the provided images list
    // should replace stored images instead of merging with DB (used when admin
    // explicitly deletes or reorders existing images).
    const replaceImages = body.imagesAction === 'replace' || body.imagesAction === 'true' || body.replaceImages === true || body.replaceImages === 'true';

    if (req.files && req.files.length) {
      const uploaded = req.files.map(f => `/uploads/${f.filename}`);
      // If the client sent an images array (existing URLs), prefer that list first
      const clientExisting = Array.isArray(body.existingImages) ? body.existingImages : (Array.isArray(body.images) ? body.images : []);
      // Build merged list. If client requested replaceImages, treat clientProvided
      // + uploaded as authoritative. Otherwise, append any DB images client omitted
      // to avoid accidental deletions.
      let merged = ([]).concat(clientExisting || []).concat(uploaded || []);
      if (!replaceImages) {
        for (const img of currentImagesFromDb || []) {
          if (!merged.includes(img)) merged.push(img);
        }
      }
      body.images = merged.filter(Boolean);

      // If client told us which uploaded file should be main, prefer that
      if (body.mainUploadedIndex !== undefined && body.mainUploadedIndex !== null) {
        const idx = parseInt(body.mainUploadedIndex, 10);
        if (!Number.isNaN(idx) && idx >= 0 && idx < uploaded.length) {
          // set body.image to the mapped uploaded path
          body.image = uploaded[idx];
        }
      }

        // If client explicitly provided `image` (main image) prefer it. Otherwise use first image
        if (body.image) {
          // ensure it's a trimmed string
          body.image = String(body.image).trim();
        } else {
          body.image = body.images[0];
        }
    } else if (req.file) {
      body.image = `/uploads/${req.file.filename}`;
      body.images = [body.image];
    } else {
      // No new uploaded files: ensure images remains an array if provided as JSON/string
      if (body.images && !Array.isArray(body.images)) {
        body.images = Array.isArray(body.images) ? body.images : [body.images];
      }
      // If client sent existingImages (when no files uploaded), prefer that list
      const existingImagesList = Array.isArray(body.existingImages) ? body.existingImages : (Array.isArray(body.images) ? body.images : []);
      if (existingImagesList && existingImagesList.length) {
        // If client asked to replace images, do so; otherwise merge with DB to avoid accidental deletion.
        if (replaceImages) {
          body.images = existingImagesList.slice();
        } else {
          const merged = ([]).concat(existingImagesList || []);
          for (const img of currentImagesFromDb || []) {
            if (!merged.includes(img)) merged.push(img);
          }
          body.images = merged.filter(Boolean);
        }
      } else if ((!body.images || !body.images.length) && existingImagesList && existingImagesList.length) {
        body.images = existingImagesList.slice();
      }
      // If client explicitly set image, make sure it's used as main
      if (body.image && typeof body.image === 'string') {
        body.image = body.image.trim();
      }
    }

    // Normalize body.images to an array of strings and ensure the selected
    // main image (body.image) is the first element so the rest of the app
    // that uses images[0] will show the chosen main image.
    if (!Array.isArray(body.images)) body.images = body.images ? [body.images] : [];
    body.images = (body.images || []).map(i => (i || '').toString().trim()).filter(Boolean);
    if (body.image) {
      const main = String(body.image).trim();
      // remove any existing occurrences and add as first
      body.images = body.images.filter(i => i !== main);
      body.images.unshift(main);
      // ensure body.image equals first element
      body.image = body.images[0];
    } else if (body.images.length) {
      // if no explicit image was provided, ensure body.image is set from images[0]
      body.image = body.images[0];
    }

    // dedupe while preserving order
    body.images = Array.from(new Set(body.images));

    // Build an explicit update object to avoid accidental field overwrites.
    const updatePayload = {};
    const allowed = ['name', 'description', 'price', 'salePrice', 'offerPrice', 'offerFrom', 'offerTo', 'image', 'images', 'category', 'sku', 'brand', 'stock', 'specs', 'garancia', 'modeli', 'categories'];
    for (const k of allowed) {
      if (body[k] !== undefined) updatePayload[k] = body[k];
    }

    // collect debug info if requested (before saving)
    let debugInfo = null;
    if (body._debug) {
      debugInfo = {
        receivedBody: req.body,
        currentImagesFromDb,
        computedImages: body.images,
        selectedImage: body.image,
        clientExistingImages: body.existingImages || body.images
      };
    }

    // remove debug flag from payload to avoid storing it
    delete updatePayload._debug;

    // --- Delete any removed uploaded files if they're not referenced by other products ---
    try {
      const before = currentImagesFromDb || [];
      const after = Array.isArray(updatePayload.images) ? updatePayload.images : (Array.isArray(body.images) ? body.images : []);
      const removed = before.filter(i => i && !after.includes(i));
      for (const rem of removed) {
        if (!rem) continue;
        // only attempt to delete local uploads (paths under /uploads or relative without http)
        const isLocal = String(rem).startsWith('/uploads/') || String(rem).startsWith('uploads/') || !String(rem).startsWith('http');
        if (!isLocal) continue;

        // check whether any other product references this image
        const used = await Product.findOne({
          where: {
            id: { [Op.ne]: id },
            [Op.or]: [
              { image: rem },
              Sequelize.literal(`images::jsonb @> '${JSON.stringify([rem])}'::jsonb`)
            ]
          }
        });
        if (used) continue; // still referenced elsewhere

        // compute absolute path and unlink
        const rel = String(rem).replace(/^\/+/, '');
        const abs = path.join(__dirname, '..', rel);
        try { await fs.promises.unlink(abs); } catch (err) { /* ignore errors */ }
      }
    } catch (err) {
      // don't fail the update if cleanup fails
      console.error('Image cleanup failed', err.message || err);
    }

    // ensure images is JSON-serializable
    if (updatePayload.images && !Array.isArray(updatePayload.images)) {
      updatePayload.images = Array.isArray(updatePayload.images) ? updatePayload.images : [updatePayload.images];
    }

    await Product.update(updatePayload, { where: { id } });
    const updated = await Product.findByPk(id);
    if (debugInfo) {
      return res.json({ updated, debug: debugInfo });
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    // load existing images so we can cleanup files after deletion
    const existingProduct = await Product.findByPk(id);
    let currentImagesFromDb = [];
    if (existingProduct) {
      const pj = existingProduct && typeof existingProduct.toJSON === 'function' ? existingProduct.toJSON() : existingProduct;
      if (pj.images && typeof pj.images === 'string') {
        try { currentImagesFromDb = JSON.parse(pj.images); } catch (_) { currentImagesFromDb = pj.images ? [pj.images] : []; }
      } else if (Array.isArray(pj.images)) {
        currentImagesFromDb = pj.images.slice();
      } else if (pj.image) {
        currentImagesFromDb = [pj.image];
      }
    }

    await Product.destroy({ where: { id } });

    // Attempt to remove files that are no longer referenced by any product
    try {
      for (const img of currentImagesFromDb || []) {
        if (!img) continue;
        const isLocal = String(img).startsWith('/uploads/') || String(img).startsWith('uploads/') || !String(img).startsWith('http');
        if (!isLocal) continue;
        const used = await Product.findOne({ where: { [Op.or]: [ { image: img }, Sequelize.literal(`images::jsonb @> '${JSON.stringify([img])}'::jsonb`) ] } });
        if (used) continue;
        const rel = String(img).replace(/^\/+/, '');
        const abs = path.join(__dirname, '..', rel);
        try { await fs.promises.unlink(abs); } catch (err) { /* ignore */ }
      }
    } catch (err) {
      console.error('Image cleanup after delete failed', err.message || err);
    }

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

// GET /products/:id/canonical-path
const getProductCategoryPath = async (req, res) => {
  try {
    const id = req.params.id;
    const product = await Product.findByPk(id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const obj = product && typeof product.toJSON === 'function' ? product.toJSON() : product;
    // prefer resolving via authoritative category string stored on product
    if (obj.category) {
      try {
        const path = await buildCategoryPath(obj.category);
        if (path && path.length) return res.json({ path, source: 'categoryString' });
      } catch (e) {
        // ignore and fallback
      }
    }
    // fallback to categories array if present
    if (obj.categories) {
      let cats = obj.categories;
      if (typeof cats === 'string') {
        try { cats = JSON.parse(cats); } catch (_) { cats = [cats]; }
      }
      if (Array.isArray(cats) && cats.length) return res.json({ path: cats, source: 'categoriesArray' });
    }
    return res.status(404).json({ error: 'No category path available' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports.getProductCategoryPath = getProductCategoryPath;
