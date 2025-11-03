const db = require('../models');
const { Order, OrderItem, Product, sequelize } = db;
const { Op, fn, col, literal } = require('sequelize');

// GET /api/orders?start=YYYY-MM-DD&end=YYYY-MM-DD
exports.getAll = async (req, res) => {
  try {
    const { start, end } = req.query;
    const where = {};
    if (start || end) {
      // build inclusive date range
      let startDate = start ? new Date(start + 'T00:00:00Z') : null;
      let endDate = end ? new Date(end + 'T23:59:59Z') : null;
      if (startDate && isNaN(startDate.getTime())) return res.status(400).json({ message: 'Invalid start date' });
      if (endDate && isNaN(endDate.getTime())) return res.status(400).json({ message: 'Invalid end date' });
      if (startDate && endDate && startDate > endDate) return res.status(400).json({ message: 'Start date must be before end date' });
      if (startDate && endDate) where.createdAt = { [Op.between]: [startDate, endDate] };
      else if (startDate) where.createdAt = { [Op.gte]: startDate };
      else if (endDate) where.createdAt = { [Op.lte]: endDate };
    }

    const orders = await Order.findAll({
      where,
      order: [['createdAt', 'DESC']],
      include: [
        { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] }
      ]
    });
    res.json(orders);
  } catch (err) {
    console.error('Error fetching orders', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/orders/top-products?start=YYYY-MM-DD&end=YYYY-MM-DD&limit=10
exports.topProducts = async (req, res) => {
  try {
    const { start, end, limit } = req.query;
    const whereOrder = {};
    if (start || end) {
      let startDate = start ? new Date(start + 'T00:00:00Z') : null;
      let endDate = end ? new Date(end + 'T23:59:59Z') : null;
      if (startDate && isNaN(startDate.getTime())) return res.status(400).json({ message: 'Invalid start date' });
      if (endDate && isNaN(endDate.getTime())) return res.status(400).json({ message: 'Invalid end date' });
      if (startDate && endDate && startDate > endDate) return res.status(400).json({ message: 'Start date must be before end date' });
      if (startDate && endDate) whereOrder.createdAt = { [Op.between]: [startDate, endDate] };
      else if (startDate) whereOrder.createdAt = { [Op.gte]: startDate };
      else if (endDate) whereOrder.createdAt = { [Op.lte]: endDate };
    }

    // Aggregate quantities and revenue per product across order items joined to orders in the range
    const lim = Math.max(1, Math.min(100, parseInt(limit || '10')));

    const rows = await OrderItem.findAll({
      attributes: [
        'productId',
        [fn('SUM', col('quantity')), 'qty'],
        [fn('SUM', literal('quantity * price')), 'revenue']
      ],
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'image', 'price'] },
        { model: Order, as: 'order', attributes: [], where: whereOrder }
      ],
      group: ['productId', 'product.id'],
      order: [[literal('qty'), 'DESC']],
      limit: lim,
    });

    // Map results
    const result = rows.map(r => ({
      productId: r.productId,
      qty: Number(r.get('qty') || 0),
      revenue: Number(r.get('revenue') || 0),
      product: r.product || null,
    }));

    res.json(result);
  } catch (err) {
    console.error('Error fetching top products', err);
    res.status(500).json({ message: 'Server error' });
  }
};
