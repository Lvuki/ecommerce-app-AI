const { User } = require("../models");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const path = require('path');

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    // Set HttpOnly cookie for server-side route protection (useful for direct /admin requests)
    const cookieOptions = {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
    };
    res.cookie('token', token, cookieOptions);

    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.logout = async (req, res) => {
  try {
    res.clearCookie('token');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Register new user (accepts optional profileImage via multipart/form-data)
exports.register = async (req, res) => {
  // form fields: name, surname, email, password. Optional file: profileImage
  const { name, surname, email, password } = req.body;
  try {
    if (!name || !email || !password) return res.status(400).json({ message: 'Missing name, email or password' });
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ message: 'Email already in use' });

    const hashed = await bcrypt.hash(password, 8);

    let profileImage = null;
    if (req.file && req.file.filename) {
      profileImage = path.posix.join('/uploads', req.file.filename);
    }

    const user = await User.create({ name, surname: surname || null, email, password: hashed, role: 'user', profileImage });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
    const cookieOptions = {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
    };
    res.cookie('token', token, cookieOptions);
    res.json({ token });
  } catch (err) {
    console.error('Register error', err);
    res.status(500).json({ message: 'Server error' });
  }
};
