const express = require("express");
const router = express.Router();
const { authenticate, adminOnly } = require("../middleware/authMiddleware");
const { User } = require("../models");
const bcrypt = require("bcryptjs");

// GET all users (admin only)
router.get("/", authenticate, adminOnly, async (req, res) => {
  const users = await User.findAll({ attributes: ["id", "name", "email", "role"] });
  res.json(users);
});

// CREATE user (admin only)
router.post("/", authenticate, adminOnly, async (req, res) => {
  try {
    const { name, email, password, role = "user" } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(409).json({ message: "Email already in use" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed, role });
    res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// UPDATE user (admin only) — name, email, role, optional password
router.put("/:id", authenticate, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, password } = req.body;
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (role !== undefined) user.role = role;
    if (password) user.password = await bcrypt.hash(password, 10);

    await user.save();
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// UPDATE user role
router.put("/:id/role", authenticate, adminOnly, async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.role = req.body.role;
  await user.save();
  res.json({ message: "Role updated" });
});

// DELETE user
router.delete("/:id", authenticate, adminOnly, async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  await user.destroy();
  res.json({ message: "User deleted" });
});

module.exports = router;
