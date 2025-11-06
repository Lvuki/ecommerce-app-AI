const { WishlistItem, Product } = require('../models');

exports.getWishlist = async (req, res) => {
  const userId = req.user.id;
  const items = await WishlistItem.findAll({ where: { userId }, include: [{ model: Product, as: 'product' }] });
  const normalized = items.map(i => ({
    id: i.id,
    productId: i.productId,
    name: i.product ? i.product.name : undefined,
    image: i.product ? i.product.image : undefined,
    price: i.product ? Number(i.product.price) : undefined,
    salePrice: i.product ? Number(i.product.salePrice || 0) : undefined
  }));
  res.json({ items: normalized });
};

exports.addItem = async (req, res) => {
  const userId = req.user.id;
  const { productId } = req.body;
  if (!productId) return res.status(400).json({ message: 'productId required' });
  const product = await Product.findByPk(productId);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  // avoid duplicates
  const existing = await WishlistItem.findOne({ where: { userId, productId } });
  if (!existing) {
    await WishlistItem.create({ userId, productId });
  }
  return exports.getWishlist(req, res);
};

exports.removeItem = async (req, res) => {
  const userId = req.user.id;
  const { itemId } = req.params;
  const item = await WishlistItem.findOne({ where: { id: itemId, userId } });
  if (!item) return res.status(404).json({ message: 'Item not found' });
  await item.destroy();
  return exports.getWishlist(req, res);
};

// Optional toggle: add if missing, remove if exists
exports.toggleItem = async (req, res) => {
  const userId = req.user.id;
  const { productId } = req.body;
  if (!productId) return res.status(400).json({ message: 'productId required' });
  const product = await Product.findByPk(productId);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  const existing = await WishlistItem.findOne({ where: { userId, productId } });
  if (existing) {
    await existing.destroy();
  } else {
    await WishlistItem.create({ userId, productId });
  }
  return exports.getWishlist(req, res);
};
