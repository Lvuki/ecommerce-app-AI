const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');

const { listCategories, getCategory, createCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');
const { authenticate, adminOnly } = require('../middleware/authMiddleware');

// Multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname || '');
    cb(null, unique + ext);
  },
});
const upload = multer({ storage });

// Public
router.get('/', listCategories);
router.get('/:id', getCategory);

// Admin
router.post('/', authenticate, adminOnly, upload.single('image'), createCategory);
router.put('/:id', authenticate, adminOnly, upload.single('image'), updateCategory);
router.delete('/:id', authenticate, adminOnly, deleteCategory);

module.exports = router;
