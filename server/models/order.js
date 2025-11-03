'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Order extends Model {
    static associate(models) {
      Order.belongsTo(models.User, { foreignKey: 'userId' });
      Order.hasMany(models.OrderItem, { foreignKey: 'orderId', as: 'items' });
    }
  }
  Order.init({
    userId: DataTypes.INTEGER,
    total: DataTypes.DECIMAL,
    status: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Order',
  });
  return Order;
};
