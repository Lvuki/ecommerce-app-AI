const { Order, OrderItem, Product } = require('../models');

// helper to get or create a cart order for a user
async function getOrCreateCart(userId) {
  const [order] = await Order.findOrCreate({
    where: { userId, status: 'cart' },
    defaults: { userId, status: 'cart', total: 0 }
  });
  return order;
}

exports.getCart = async (req, res) => {
  const userId = req.user.id;
  const order = await getOrCreateCart(userId);
  const items = await OrderItem.findAll({ where: { orderId: order.id }, include: [{ model: Product, as: 'product' }] });
  const normalized = items.map(i => ({
    id: i.id,
    productId: i.productId,
    qty: i.quantity,
    price: Number(i.price),
    name: i.product ? i.product.name : undefined,
    image: i.product ? i.product.image : undefined,
    sku: i.product ? i.product.sku : undefined,
  }));
  res.json({ id: order.id, total: Number(order.total) || 0, items: normalized });
};

exports.addItem = async (req, res) => {
  const userId = req.user.id;
  const { productId, quantity = 1 } = req.body;
  if (!productId) return res.status(400).json({ message: 'productId required' });
  const order = await getOrCreateCart(userId);
  // get product price
  const product = await Product.findByPk(productId);
  if (!product) return res.status(404).json({ message: 'Product not found' });

  let item = await OrderItem.findOne({ where: { orderId: order.id, productId } });
  // use salePrice when present and valid (lower than regular price)
  const effectivePrice = (product.salePrice && Number(product.salePrice) > 0) ? Number(product.salePrice) : Number(product.price);
  if (item) {
    item.quantity = item.quantity + (quantity || 1);
    item.price = effectivePrice;
    await item.save();
  } else {
    item = await OrderItem.create({ orderId: order.id, productId, quantity: quantity || 1, price: effectivePrice });
  }
  // recalc total
  const items = await OrderItem.findAll({ where: { orderId: order.id } });
  const total = items.reduce((s, it) => s + Number(it.price) * Number(it.quantity), 0);
  order.total = total;
  await order.save();
  return exports.getCart(req, res);
};

exports.updateItem = async (req, res) => {
  const userId = req.user.id;
  const { itemId } = req.params;
  const { quantity } = req.body;
  const order = await getOrCreateCart(userId);
  const item = await OrderItem.findOne({ where: { id: itemId, orderId: order.id } });
  if (!item) return res.status(404).json({ message: 'Item not found' });
  if (quantity <= 0) {
    await item.destroy();
  } else {
    item.quantity = quantity;
    await item.save();
  }
  // recalc total
  const items = await OrderItem.findAll({ where: { orderId: order.id } });
  const total = items.reduce((s, it) => s + Number(it.price) * Number(it.quantity), 0);
  order.total = total;
  await order.save();
  return exports.getCart(req, res);
};

exports.removeItem = async (req, res) => {
  const userId = req.user.id;
  const { itemId } = req.params;
  const order = await getOrCreateCart(userId);
  const item = await OrderItem.findOne({ where: { id: itemId, orderId: order.id } });
  if (!item) return res.status(404).json({ message: 'Item not found' });
  await item.destroy();
  // recalc total
  const items = await OrderItem.findAll({ where: { orderId: order.id } });
  const total = items.reduce((s, it) => s + Number(it.price) * Number(it.quantity), 0);
  order.total = total;
  await order.save();
  return exports.getCart(req, res);
};

exports.clearCart = async (req, res) => {
  const userId = req.user.id;
  const order = await getOrCreateCart(userId);
  await OrderItem.destroy({ where: { orderId: order.id } });
  order.total = 0;
  await order.save();
  res.json({ ok: true });
};
