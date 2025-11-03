require('dotenv').config();
const { sequelize, Product } = require('../models');

async function run() {
  try {
    await sequelize.authenticate();
    console.log('DB connected');
    const products = await Product.findAll({ limit: 10, order: [['id', 'ASC']] });
    const out = products.map(p => {
      const obj = p && typeof p.toJSON === 'function' ? p.toJSON() : p;
      return {
        id: obj.id,
        name: obj.name,
        price: obj.price,
        salePrice: obj.salePrice,
        image: obj.image,
        images: obj.images,
        specs: obj.specs
      };
    });
    console.log(JSON.stringify(out, null, 2));
  } catch (err) {
    console.error('Error reading products:', err.message || err);
    process.exitCode = 1;
  } finally {
    try { await sequelize.close(); } catch (_) {}
  }
}

run();
