const express = require('express');
const router = express.Router();
const { getAll, topProducts } = require('../controllers/orderController');

router.get('/', getAll);
router.get('/top-products', topProducts);

module.exports = router;
