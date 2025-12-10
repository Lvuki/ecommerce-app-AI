const express = require('express');
const router = express.Router();
const { Setting } = require('../models');
const { authenticate, adminOnly } = require('../middleware/authMiddleware'); // Use existing auth middleware

// GET /api/settings - Public or Protected? 
// Rates need to be public for the frontend to calculate prices.
router.get('/', async (req, res) => {
    try {
        const settings = await Setting.findAll();
        const out = {};
        settings.forEach(s => {
            out[s.key] = s.value;
        });
        res.json(out);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/settings - Admin only
// Body: { exchange_rate_eur: "100", exchange_rate_usd: "95" }
router.put('/', authenticate, adminOnly, async (req, res) => {
    try {
        const updates = req.body; // Key-Value pairs
        const keys = Object.keys(updates);

        for (const key of keys) {
            const val = String(updates[key]);
            const [setting, created] = await Setting.findOrCreate({
                where: { key },
                defaults: { value: val }
            });
            if (!created && setting.value !== val) {
                setting.value = val;
                await setting.save();
            }
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
