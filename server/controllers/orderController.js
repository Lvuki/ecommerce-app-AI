const { Order } = require('../models');

exports.getAll = async (req, res) => {
  const orders = await Order.findAll();
  res.json(orders);
};
