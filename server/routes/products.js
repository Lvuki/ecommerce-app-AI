const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');

const {
  getProducts,
  getProductById,
  getCategories,
  addProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/productController');

const { authenticate, adminOnly } = require('../middleware/authMiddleware');

// Routes

// Anyone can fetch products
router.get('/', getProducts);
// keep the specific categories route before the param route so the literal
// "categories" path is not captured by the generic :id param
router.get('/categories/list', getCategories);
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

module.exports = router;
