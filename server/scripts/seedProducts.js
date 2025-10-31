require('dotenv').config();
const { sequelize, Product } = require('../models');

async function main() {
  await sequelize.sync();
  const items = Array.from({ length: 20 }).map((_, i) => {
    const id = i + 1;
    const brand = ["Acme", "Globex", "Umbrella", "Soylent", "Initech"][i % 5];
    const category = ["Electronics", "Apparel", "Home", "Sports", "Toys"][i % 5];
    return {
      name: `Sample Product ${id}`,
      description: `This is a great product number ${id}.`,
      price: 9.99 + i,
      image: `https://picsum.photos/seed/product${id}/600/400`,
      category,
      sku: `SKU-${1000 + id}`,
      brand,
      stock: 10 + i,
      specs: { color: ["red","blue","green"][i % 3], size: ["S","M","L"][i % 3], weight: `${0.5 + i*0.1}kg` },
    };
  });

  // Upsert by sku to be idempotent
  await Promise.all(items.map((p) => Product.upsert(p, { where: { sku: p.sku } })));
  console.log('Seeded 20 products.');
  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


