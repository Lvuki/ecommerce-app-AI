const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const wishlist = require('../controllers/wishlistController');

router.use(authenticate);
router.get('/', wishlist.getWishlist);
router.post('/items', wishlist.addItem);
router.post('/toggle', wishlist.toggleItem);
router.delete('/items/:itemId', wishlist.removeItem);

module.exports = router;
