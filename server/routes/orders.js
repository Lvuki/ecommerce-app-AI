const express = require('express');
const router = express.Router();
const { getAll } = require('../controllers/orderController');

router.get('/', getAll);

module.exports = router;
