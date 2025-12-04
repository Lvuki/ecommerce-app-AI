const { Service, Product } = require('../models');

const listServices = async (req, res) => {
  try {
    const rows = await Service.findAll();
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const getService = async (req, res) => {
  try {
    const s = await Service.findByPk(req.params.id);
    if (!s) return res.status(404).json({ error: 'Service not found' });
    res.json(s);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const createService = async (req, res) => {
  try {
    const body = { ...req.body };
    if (body.price && typeof body.price === 'string') body.price = parseFloat(body.price);
    const svc = await Service.create(body);
    res.json(svc);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const body = { ...req.body };
    if (body.price && typeof body.price === 'string') body.price = parseFloat(body.price);
    await Service.update(body, { where: { id } });
    const updated = await Service.findByPk(id);
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    await Service.destroy({ where: { id } });
    res.json({ message: 'Service deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { listServices, getService, createService, updateService, deleteService };
