'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Category extends Model {
    static associate(models) {
      // Optional association: products may store category as string in this app.
      // If products are migrated to use categoryId, uncomment the association below.
      // Category.hasMany(models.Product, { foreignKey: 'categoryId' });

      // Self-referential associations to support a two-level category tree
      // A category can have many subcategories (children) and optionally belong to a parent category
      Category.hasMany(models.Category, { as: 'subcategories', foreignKey: 'parentId' });
      Category.belongsTo(models.Category, { as: 'parent', foreignKey: 'parentId' });
    }
  }
  Category.init({
    name: DataTypes.STRING,
    description: DataTypes.TEXT,
    image: DataTypes.STRING,
    parentId: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'Category',
  });
  return Category;
};
