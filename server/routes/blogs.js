const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');

const { getPosts, getPostById, addPost, updatePost, deletePost } = require('../controllers/blogController');
const { authenticate, adminOnly } = require('../middleware/authMiddleware');

// Multer setup for uploads
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
router.get('/', getPosts);
router.get('/:id', getPostById);

// Admin create/update/delete
router.post('/', authenticate, adminOnly, upload.single('image'), addPost);
router.put('/:id', authenticate, adminOnly, upload.single('image'), updatePost);
router.delete('/:id', authenticate, adminOnly, deletePost);

module.exports = router;
