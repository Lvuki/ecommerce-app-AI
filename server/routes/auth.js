const express = require("express");
const router = express.Router();
const { login, logout, register } = require("../controllers/authController");
const multer = require('multer');
const path = require('path');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
require('dotenv').config();

// Multer storage for uploads (profile images)
const storage = multer.diskStorage({
	destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
	filename: (req, file, cb) => {
		const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
		const ext = path.extname(file.originalname || '');
		cb(null, unique + ext);
	}
});
const upload = multer({ storage });

router.post("/login", login);
router.post('/logout', logout);
// Register accepts multipart/form-data (optional profileImage)
router.post('/register', upload.single('profileImage'), register);

// --- OAuth: Google ---
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT = process.env.GOOGLE_REDIRECT || (process.env.SERVER_ROOT ? `${process.env.SERVER_ROOT}/api/auth/google/callback` : 'http://localhost:4000/api/auth/google/callback');

router.get('/google', (req, res) => {
	if (!GOOGLE_CLIENT_ID) return res.status(500).send('Google OAuth not configured');
	const params = new URLSearchParams({
		client_id: GOOGLE_CLIENT_ID,
		redirect_uri: GOOGLE_REDIRECT,
		response_type: 'code',
		scope: 'openid email profile',
		access_type: 'offline',
		prompt: 'consent'
	});
	res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

router.get('/google/callback', async (req, res) => {
	const code = req.query.code;
	if (!code) return res.redirect(`${CLIENT_URL}/login?error=no_code`);
	try {
		const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				code,
				client_id: GOOGLE_CLIENT_ID,
				client_secret: GOOGLE_CLIENT_SECRET,
				redirect_uri: GOOGLE_REDIRECT,
				grant_type: 'authorization_code'
			})
		});
		const tokenJson = await tokenRes.json();
		const access_token = tokenJson.access_token;
		if (!access_token) return res.redirect(`${CLIENT_URL}/login?error=token`);

		const profileRes = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${access_token}`);
		const profile = await profileRes.json();
		// profile: { id, email, name, picture }
		if (!profile || !profile.email) return res.redirect(`${CLIENT_URL}/login?error=no_email`);

		let user = await User.findOne({ where: { email: profile.email } });
		if (!user) {
			const parts = (profile.name || '').split(' ');
			const name = parts.shift() || profile.email.split('@')[0];
			const surname = parts.join(' ') || null;
			user = await User.create({ name, surname, email: profile.email, password: '', role: 'user', profileImage: profile.picture || null });
		}

		const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
		const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 };
		res.cookie('token', token, cookieOptions);
		// redirect to client with token param (client will store it)
		return res.redirect(`${CLIENT_URL}/auth/success?token=${token}`);
	} catch (err) {
		console.error('Google OAuth error', err);
		return res.redirect(`${CLIENT_URL}/login?error=server`);
	}
});

// --- OAuth: Facebook / Meta ---
const FACEBOOK_CLIENT_ID = process.env.FACEBOOK_CLIENT_ID;
const FACEBOOK_CLIENT_SECRET = process.env.FACEBOOK_CLIENT_SECRET;
const FACEBOOK_REDIRECT = process.env.FACEBOOK_REDIRECT || (process.env.SERVER_ROOT ? `${process.env.SERVER_ROOT}/api/auth/facebook/callback` : 'http://localhost:4000/api/auth/facebook/callback');

router.get('/facebook', (req, res) => {
	if (!FACEBOOK_CLIENT_ID) return res.status(500).send('Facebook OAuth not configured');
	const params = new URLSearchParams({
		client_id: FACEBOOK_CLIENT_ID,
		redirect_uri: FACEBOOK_REDIRECT,
		scope: 'email,public_profile',
		response_type: 'code'
	});
	res.redirect(`https://www.facebook.com/v12.0/dialog/oauth?${params.toString()}`);
});

router.get('/facebook/callback', async (req, res) => {
	const code = req.query.code;
	if (!code) return res.redirect(`${CLIENT_URL}/login?error=no_code`);
	try {
		// exchange code for access token
		const tokenUrl = `https://graph.facebook.com/v12.0/oauth/access_token?client_id=${FACEBOOK_CLIENT_ID}&redirect_uri=${encodeURIComponent(FACEBOOK_REDIRECT)}&client_secret=${FACEBOOK_CLIENT_SECRET}&code=${encodeURIComponent(code)}`;
		const tokenRes = await fetch(tokenUrl);
		const tokenJson = await tokenRes.json();
		const access_token = tokenJson.access_token;
		if (!access_token) return res.redirect(`${CLIENT_URL}/login?error=token`);

		// fetch profile
		const profileRes = await fetch(`https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${access_token}`);
		const profile = await profileRes.json();
		if (!profile || !profile.email) return res.redirect(`${CLIENT_URL}/login?error=no_email`);

		let user = await User.findOne({ where: { email: profile.email } });
		if (!user) {
			const parts = (profile.name || '').split(' ');
			const name = parts.shift() || profile.email.split('@')[0];
			const surname = parts.join(' ') || null;
			const pictureUrl = profile.picture && profile.picture.data && profile.picture.data.url ? profile.picture.data.url : null;
			user = await User.create({ name, surname, email: profile.email, password: '', role: 'user', profileImage: pictureUrl });
		}

		const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
		const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 };
		res.cookie('token', token, cookieOptions);
		return res.redirect(`${CLIENT_URL}/auth/success?token=${token}`);
	} catch (err) {
		console.error('Facebook OAuth error', err);
		return res.redirect(`${CLIENT_URL}/login?error=server`);
	}
});

module.exports = router;
