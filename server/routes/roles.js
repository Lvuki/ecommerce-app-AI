const express = require('express');
const router = express.Router();
const { sequelize, Role, User } = require('../models');
const { authenticate, adminOnly } = require('../middleware/authMiddleware');

// Public: list roles (returns array of names)
router.get('/', async (req, res) => {
  try {
    const roles = await Role.findAll({ order: [['name', 'ASC']] });
    return res.json(roles.map(r => r.name));
  } catch (err) {
    console.error('Failed to list roles', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Admin: add a role
router.post('/', authenticate, adminOnly, async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) return res.status(400).json({ message: 'Invalid role name' });
  try {
    const [role, created] = await Role.findOrCreate({ where: { name: name.trim() } });
    if (!created) return res.status(409).json({ message: 'Role already exists' });
    const roles = await Role.findAll({ order: [['name','ASC']] });
    return res.status(201).json(roles.map(r => r.name));
  } catch (err) {
    console.error('Failed to add role', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Admin: rename a role (old name in URL) — atomic: rename role and update affected users
router.put('/:old', authenticate, adminOnly, async (req, res) => {
  const { old } = req.params;
  const { name } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) return res.status(400).json({ message: 'Invalid role name' });
  const newName = name.trim();
  const t = await sequelize.transaction();
  try {
    const role = await Role.findOne({ where: { name: old } }, { transaction: t });
    if (!role) {
      await t.rollback();
      return res.status(404).json({ message: 'Role not found' });
    }
    const exists = await Role.findOne({ where: { name: newName } }, { transaction: t });
    if (exists && exists.name !== old) {
      await t.rollback();
      return res.status(409).json({ message: 'Role already exists' });
    }

    // rename role record
    role.name = newName;
    await role.save({ transaction: t });

    // update users who had the old role
    await User.update({ role: newName }, { where: { role: old } , transaction: t });

    await t.commit();
    const roles = await Role.findAll({ order: [['name','ASC']] });
    return res.json(roles.map(r => r.name));
  } catch (err) {
    await t.rollback();
    console.error('Failed to rename role', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Admin: delete a role — set affected users to 'user'
router.delete('/:name', authenticate, adminOnly, async (req, res) => {
  const { name } = req.params;
  if (name === 'user') return res.status(400).json({ message: 'Cannot delete default role' });
  const t = await sequelize.transaction();
  try {
    const role = await Role.findOne({ where: { name } }, { transaction: t });
    if (!role) {
      await t.rollback();
      return res.status(404).json({ message: 'Role not found' });
    }
    await role.destroy({ transaction: t });
    await User.update({ role: 'user' }, { where: { role: name }, transaction: t });
    await t.commit();
    const roles = await Role.findAll({ order: [['name','ASC']] });
    return res.json(roles.map(r => r.name));
  } catch (err) {
    await t.rollback();
    console.error('Failed to delete role', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
