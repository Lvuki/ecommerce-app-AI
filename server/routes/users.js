const express = require('express');
const router = express.Router();
const { authenticate, adminOnly } = require('../middleware/authMiddleware');
const { getUsers, updateUserRole, deleteUser, getMe, updateMe, updateUser } = require('../controllers/userController');
const { User } = require('../models');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');

// Multer storage for profile images (reuse uploads folder)
const storage = multer.diskStorage({
	destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
	filename: (req, file, cb) => {
		const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
		const ext = path.extname(file.originalname || '');
		cb(null, unique + ext);
	}
});
const upload = multer({ storage });

router.get('/', authenticate, adminOnly, getUsers);
// Admin: create user (accept optional profileImage)
router.post('/', authenticate, adminOnly, upload.single('profileImage'), async (req, res) => {
	try {
		const { name, surname, email, password, role = 'user' } = req.body;
		if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required' });
		const existing = await User.findOne({ where: { email } });
		if (existing) return res.status(409).json({ message: 'Email already in use' });

		const hashed = await bcrypt.hash(password, 10);
		let profileImage = null;
		if (req.file && req.file.filename) profileImage = path.posix.join('/uploads', req.file.filename);

		const user = await User.create({ name, surname: surname || null, email, password: hashed, role, profileImage });
		res.status(201).json({ id: user.id, name: user.name, surname: user.surname, email: user.email, role: user.role, profileImage: user.profileImage });
	} catch (err) {
		console.error('Create user error', err);
		res.status(500).json({ message: 'Server error' });
	}
});
router.put('/:id/role', authenticate, adminOnly, updateUserRole);
// Admin: update user details (name, surname, email, password, role, profileImage)
router.put('/:id', authenticate, adminOnly, upload.single('profileImage'), updateUser);
router.delete('/:id', authenticate, adminOnly, deleteUser);

// Current user profile
router.get('/me', authenticate, getMe);
router.put('/me', authenticate, upload.single('profileImage'), updateMe);

// Public profile by id (keep after /me to avoid capturing the literal 'me')
const { getUserById } = require('../controllers/userController');
router.get('/:id', getUserById);

module.exports = router;
