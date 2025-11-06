module.exports = (sequelize, DataTypes) => {
  const WishlistItem = sequelize.define('WishlistItem', {
    // no extra attributes; associations hold userId and productId
  });

  WishlistItem.associate = function(models) {
    WishlistItem.belongsTo(models.User, { foreignKey: 'userId' });
    WishlistItem.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
  };

  return WishlistItem;
};
