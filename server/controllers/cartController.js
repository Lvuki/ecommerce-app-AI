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
    services: i.services || null,
    // productPrice: the product's effective price (salePrice when present, else regular price)
    productPrice: i.product ? ((i.product.salePrice && Number(i.product.salePrice) > 0) ? Number(i.product.salePrice) : Number(i.product.price)) : null
  }));
  res.json({ id: order.id, total: Number(order.total) || 0, items: normalized });
};

exports.addItem = async (req, res) => {
  const userId = req.user.id;
  const { productId, quantity = 1, services = [] } = req.body;
  if (!productId) return res.status(400).json({ message: 'productId required' });
  const order = await getOrCreateCart(userId);
  // get product price
  const product = await Product.findByPk(productId);
  if (!product) return res.status(404).json({ message: 'Product not found' });

  // compute services total
  let servicesList = null;
  let servicesSum = 0;
  try {
    if (Array.isArray(services) && services.length) {
      // support either array of ids or array of objects ({id,name,price}) from client
      let serviceIds = [];
      if (typeof services[0] === 'object') {
        serviceIds = services.map(s => s.id).filter(Boolean);
      } else {
        serviceIds = services;
      }
      const { Service } = require('../models');
      const svcRows = await Service.findAll({ where: { id: serviceIds } });
      servicesList = svcRows.map(s => ({ id: s.id, name: s.name, price: Number(s.price) }));
      servicesSum = servicesList.reduce((s, it) => s + Number(it.price || 0), 0);
    }
  } catch (e) {
    servicesList = null;
    servicesSum = 0;
  }

  let item = await OrderItem.findOne({ where: { orderId: order.id, productId } });
  // use salePrice when present and valid (lower than regular price)
  const effectiveProductPrice = (product.salePrice && Number(product.salePrice) > 0) ? Number(product.salePrice) : Number(product.price);
  // store per-item price as product price + servicesSum
  const perItemPrice = Number(effectiveProductPrice) + Number(servicesSum || 0);
  if (item) {
    // if existing item present and services differ, create a separate line instead of merging
    const existingServices = item.services || null;
    const sameServices = JSON.stringify(existingServices || []) === JSON.stringify(servicesList || []);
    if (!sameServices) {
      // create a new order item for different service selection
      item = await OrderItem.create({ orderId: order.id, productId, quantity: quantity || 1, price: perItemPrice, services: servicesList });
    } else {
      item.quantity = item.quantity + (quantity || 1);
      item.price = perItemPrice; // update price in case services or product price changed
      if (servicesList) item.services = servicesList;
      await item.save();
    }
  } else {
    item = await OrderItem.create({ orderId: order.id, productId, quantity: quantity || 1, price: perItemPrice, services: servicesList });
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
  const { quantity, services } = req.body;
  const order = await getOrCreateCart(userId);
  const item = await OrderItem.findOne({ where: { id: itemId, orderId: order.id } });
  if (!item) return res.status(404).json({ message: 'Item not found' });
  // If services provided, update services and per-item price accordingly
  if (services !== undefined) {
    let servicesList = null;
    let servicesSum = 0;
    try {
      if (Array.isArray(services) && services.length) {
        let serviceIds = [];
        if (typeof services[0] === 'object') {
          serviceIds = services.map(s => s.id).filter(Boolean);
        } else {
          serviceIds = services;
        }
        const { Service } = require('../models');
        const svcRows = await Service.findAll({ where: { id: serviceIds } });
        servicesList = svcRows.map(s => ({ id: s.id, name: s.name, price: Number(s.price) }));
        servicesSum = servicesList.reduce((s, it) => s + Number(it.price || 0), 0);
      }
    } catch (e) {
      servicesList = null;
      servicesSum = 0;
    }
    // get product price to compute per-item price
    const product = await Product.findByPk(item.productId);
    const effectiveProductPrice = (product && product.salePrice && Number(product.salePrice) > 0) ? Number(product.salePrice) : (product ? Number(product.price) : 0);
    item.services = servicesList;
    item.price = Number(effectiveProductPrice) + Number(servicesSum || 0);
  }

  if (quantity !== undefined) {
    if (quantity <= 0) {
      await item.destroy();
    } else {
      item.quantity = quantity;
      await item.save();
    }
  } else {
    // save changes when only services were updated
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
