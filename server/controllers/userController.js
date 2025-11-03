const { User } = require('../models');
const bcrypt = require('bcryptjs');
const path = require('path');

// Get all users (admin only)
exports.getUsers = async (req, res) => {
  try {
    const users = await User.findAll({ attributes: ['id', 'name', 'surname', 'email', 'role', 'profileImage'] });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update user role (admin only)
exports.updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  // Allow custom role strings (non-empty, reasonable length)
  if (typeof role !== 'string' || !role.trim() || role.length > 60) {
    return res.status(400).json({ message: 'Invalid role' });
  }

  try {
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.role = role;
    await user.save();

    res.json({ message: 'User role updated', user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete user (admin only)
exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await user.destroy();
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Return profile for current user
exports.getMe = async (req, res) => {
  try {
    const u = req.user;
    const user = await User.findByPk(u.id, { attributes: ['id', 'name', 'surname', 'email', 'role', 'profileImage'] });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update profile for current user (name, surname, profile image)
exports.updateMe = async (req, res) => {
  try {
    const u = req.user;
    const user = await User.findByPk(u.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { name, surname } = req.body;
    if (name !== undefined) user.name = name;
    if (surname !== undefined) user.surname = surname;

    // If a file was uploaded (profileImage), set the path
    if (req.file && req.file.filename) {
      // keep same pattern as other uploads: /uploads/<filename>
      user.profileImage = path.posix.join('/uploads', req.file.filename);
    }

    await user.save();
    const out = await User.findByPk(user.id, { attributes: ['id', 'name', 'surname', 'email', 'role', 'profileImage'] });
    res.json(out);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// Public: get basic profile by id (expose non-sensitive fields)
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    // return all fields except password to allow public profile to show email, role, timestamps, etc.
    const user = await User.findByPk(id, { attributes: { exclude: ['password'] } });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: update a user's details (name, surname, email, password, profileImage, role)
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { name, surname, email, password, role } = req.body;

    if (name !== undefined) user.name = name;
    if (surname !== undefined) user.surname = surname;
    if (email !== undefined) user.email = email;
    if (role !== undefined) {
      if (typeof role !== 'string' || !role.trim() || role.length > 60) return res.status(400).json({ message: 'Invalid role' });
      user.role = role;
    }

    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      user.password = hashed;
    }

    // profile image file (optional)
    if (req.file && req.file.filename) {
      user.profileImage = path.posix.join('/uploads', req.file.filename);
    }

    await user.save();
    const out = await User.findByPk(user.id, { attributes: ['id', 'name', 'surname', 'email', 'role', 'profileImage'] });
    res.json(out);
  } catch (err) {
    console.error('Update user error', err);
    res.status(500).json({ message: 'Server error' });
  }
};
