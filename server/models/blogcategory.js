"use strict";
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class BlogCategory extends Model {
    static associate(models) {
      BlogCategory.hasMany(models.BlogCategory, { as: 'subcategories', foreignKey: 'parentId' });
      BlogCategory.belongsTo(models.BlogCategory, { as: 'parent', foreignKey: 'parentId' });
    }
  }
  BlogCategory.init({
    name: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.TEXT,
    image: DataTypes.STRING,
    parentId: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'BlogCategory',
  });
  return BlogCategory;
};
