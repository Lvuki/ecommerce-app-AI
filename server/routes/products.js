const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');

const {
  getProducts,
  getProductById,
  getCategories,
  getProductCategoryPath,
  addProduct,
  updateProduct,
  deleteProduct,
  rateProduct
} = require('../controllers/productController');
const rateLimit = require('../middleware/rateLimit');

const { authenticate, adminOnly } = require('../middleware/authMiddleware');

// Routes

// Search suggestions
router.get('/search/suggestions', require('../controllers/productController').getSearchSuggestions);

// Anyone can fetch products
router.get('/', getProducts);
// keep the specific categories route before the param route so the literal
// "categories" path is not captured by the generic :id param
router.get('/categories/list', getCategories);
// public debug endpoint: canonical category path (server-calculated)
router.get('/:id([0-9]+|[0-9a-fA-F]{24})/canonical-path', getProductCategoryPath);
// restrict :id to a 24-hex ObjectId so strings like "categories" won't match
// allow either numeric IDs (seed uses numeric ids) or 24-hex ObjectIds
router.get('/:id([0-9]+|[0-9a-fA-F]{24})', getProductById);

// Only authenticated admins can create, update, or delete products
// Multer storage for images
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname || '');
    cb(null, unique + ext);
  },
});
const upload = multer({ storage });

// accept multiple images under the `images` field (max 8)
router.post('/', authenticate, adminOnly, upload.array('images', 8), addProduct);
// apply the same ObjectId constraint to update/delete routes to avoid
// accidentally matching reserved literal paths
router.put('/:id([0-9]+|[0-9a-fA-F]{24})', authenticate, adminOnly, upload.array('images', 8), updateProduct);
router.delete('/:id([0-9]+|[0-9a-fA-F]{24})', authenticate, adminOnly, deleteProduct);

// Allow anonymous (or authenticated) users to rate a product, but apply rate-limiting by IP.
// For authenticated users, the controller still upserts by userId. For anonymous users, a row is created.
router.post('/:id([0-9]+|[0-9a-fA-F]{24})/rate', rateLimit({ windowMs: 60 * 60 * 1000, max: 10 }), rateProduct);

// Admin-only endpoint to re-sync categories array for a single product based on its `category` string
router.post('/:id([0-9]+|[0-9a-fA-F]{24})/resync-categories', authenticate, adminOnly, async (req, res) => {
  try {
    const id = req.params.id;
    const { Product, Category } = require('../models');
    const product = await Product.findByPk(id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const catName = product.category;
    if (!catName) return res.status(400).json({ error: 'Product has no category string to resync' });
    const cat = await Category.findOne({ where: { name: catName } });
    if (!cat) return res.status(404).json({ error: 'Category not found' });
    const cats = [cat.name];
    if (cat.parentId) {
      const parent = await Category.findByPk(cat.parentId);
      if (parent) cats.push(parent.name);
      if (parent && parent.parentId) {
        const grand = await Category.findByPk(parent.parentId);
        if (grand) cats.push(grand.name);
      }
    }
    await Product.update({ categories: cats }, { where: { id } });
    const updated = await Product.findByPk(id);
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
