'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class OrderItem extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
    OrderItem.belongsTo(models.Order, { foreignKey: 'orderId', as: 'order' });
OrderItem.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });

    }
  }
  OrderItem.init({
    orderId: DataTypes.INTEGER,
    productId: DataTypes.INTEGER,
    quantity: DataTypes.INTEGER,
    price: DataTypes.DECIMAL,
    services: DataTypes.JSON
  }, {
    sequelize,
    modelName: 'OrderItem',
  });
  return OrderItem;
};