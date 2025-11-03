const express = require('express');
const router = express.Router();
const { authenticate, adminOnly } = require('../middleware/authMiddleware');
const { seedOrders } = require('../controllers/adminController');

// POST /api/admin/seed-orders?count=30
router.post('/seed-orders', authenticate, adminOnly, seedOrders);

module.exports = router;
