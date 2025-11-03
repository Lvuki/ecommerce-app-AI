const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');

const { listBlogCategories, getBlogCategory, createBlogCategory, updateBlogCategory, deleteBlogCategory } = require('../controllers/blogCategoryController');
const { authenticate, adminOnly } = require('../middleware/authMiddleware');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname || '');
    cb(null, unique + ext);
  }
});
const upload = multer({ storage });

// Public
router.get('/', listBlogCategories);
router.get('/:id', getBlogCategory);

// Admin
router.post('/', authenticate, adminOnly, upload.single('image'), createBlogCategory);
router.put('/:id', authenticate, adminOnly, upload.single('image'), updateBlogCategory);
router.delete('/:id', authenticate, adminOnly, deleteBlogCategory);

module.exports = router;
