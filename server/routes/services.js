const express = require('express');
const router = express.Router();
const { listServices, getService, createService, updateService, deleteService } = require('../controllers/serviceController');
const { authenticate, adminOnly } = require('../middleware/authMiddleware');

router.get('/', listServices);
router.get('/:id', getService);
router.post('/', authenticate, adminOnly, createService);
router.put('/:id', authenticate, adminOnly, updateService);
router.delete('/:id', authenticate, adminOnly, deleteService);

module.exports = router;
