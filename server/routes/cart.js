const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const cart = require('../controllers/cartController');

router.use(authenticate);
router.get('/', cart.getCart);
router.post('/items', cart.addItem);
router.put('/items/:itemId', cart.updateItem);
router.delete('/items/:itemId', cart.removeItem);
router.post('/clear', cart.clearCart);

module.exports = router;
