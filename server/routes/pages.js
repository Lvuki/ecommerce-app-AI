const express = require('express');
const router = express.Router();
const pageController = require('../controllers/pageController');
const { authenticate, adminOnly } = require('../middleware/authMiddleware');

// Public: list visible pages (header menu)
router.get('/', pageController.listPublic);
// Public: get page by slug
router.get('/slug/:slug', pageController.getBySlug);

// Admin protected CRUD
router.get('/admin/all', authenticate, adminOnly, pageController.listAll);
router.post('/admin', authenticate, adminOnly, pageController.create);
router.put('/admin/:id', authenticate, adminOnly, pageController.update);
router.delete('/admin/:id', authenticate, adminOnly, pageController.remove);

module.exports = router;
