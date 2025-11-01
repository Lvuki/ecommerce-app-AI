'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Category extends Model {
    static associate(models) {
      // Optional association: products may store category as string in this app.
      // If products are migrated to use categoryId, uncomment the association below.
      // Category.hasMany(models.Product, { foreignKey: 'categoryId' });
    }
  }
  Category.init({
    name: DataTypes.STRING,
    description: DataTypes.TEXT,
    image: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'Category',
  });
  return Category;
};
