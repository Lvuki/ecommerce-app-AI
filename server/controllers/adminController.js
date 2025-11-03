const { Order, OrderItem, Product, User } = require('../models');

// Create a number of dummy orders for testing
exports.seedOrders = async (req, res) => {
  try {
    // ensure some users exist
    let users = await User.findAll();
    if (!users || users.length === 0) {
      const bcrypt = require('bcryptjs');
      const pwd = await bcrypt.hash('password', 8);
      const sampleUsers = Array.from({ length: 5 }).map((_, i) => ({ name: `Customer ${i+1}`, email: `customer${i+1}@example.com`, password: pwd, role: 'user' }));
      await User.bulkCreate(sampleUsers);
      users = await User.findAll();
    }

    const products = await Product.findAll({ limit: 100 });
    if (!products || products.length === 0) return res.status(400).json({ message: 'No products to seed orders from' });

    const count = Number(req.query.count) || 30;
    const createdOrders = [];
    for (let i = 0; i < count; i++) {
      const user = users[i % users.length];
      const daysAgo = Math.floor(Math.random() * 30);
      const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 - Math.floor(Math.random() * 86400000));
      const itemCount = 1 + Math.floor(Math.random() * 4);
      let total = 0;
      const order = await Order.create({ userId: user.id, total: 0, status: ['pending','paid','shipped','completed'][Math.floor(Math.random()*4)], createdAt, updatedAt: createdAt });
      for (let j = 0; j < itemCount; j++) {
        const p = products[Math.floor(Math.random() * products.length)];
        const qty = 1 + Math.floor(Math.random() * 3);
        const price = Number((p.price || (5 + Math.random()*95)).toFixed(2));
        total += qty * price;
        await OrderItem.create({ orderId: order.id, productId: p.id, quantity: qty, price, createdAt, updatedAt: createdAt });
      }
      order.total = Number(total.toFixed(2));
      await order.save();
      createdOrders.push(order);
    }

    res.json({ ok: true, created: createdOrders.length });
  } catch (err) {
    console.error('seedOrders error', err);
    res.status(500).json({ message: 'Failed to seed orders' });
  }
};
