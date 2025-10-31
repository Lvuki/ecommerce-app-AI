const express = require('express');
const router = express.Router();
const { authenticate, adminOnly } = require('../middleware/authMiddleware');
const { getUsers, updateUserRole, deleteUser } = require('../controllers/userController');

router.get('/', authenticate, adminOnly, getUsers);
router.put('/:id/role', authenticate, adminOnly, updateUserRole);
router.delete('/:id', authenticate, adminOnly, deleteUser);

module.exports = router;
