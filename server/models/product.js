module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define('Product', {
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    price: { type: DataTypes.FLOAT, allowNull: false },
    salePrice: { type: DataTypes.FLOAT, allowNull: true, defaultValue: null },
    offerPrice: { type: DataTypes.FLOAT, allowNull: true, defaultValue: null },
    offerFrom: { type: DataTypes.DATE, allowNull: true },
    offerTo: { type: DataTypes.DATE, allowNull: true },
    image: { type: DataTypes.STRING },
  images: { type: DataTypes.JSON },
    category: { type: DataTypes.STRING },
  sku: { type: DataTypes.STRING, field: 'kodi_i_produktit' },
  brand: { type: DataTypes.STRING, field: 'marka' },
    stock: { type: DataTypes.INTEGER, defaultValue: 0 },
    specs: { type: DataTypes.JSON },
  garancia: { type: DataTypes.STRING },
  modeli: { type: DataTypes.STRING },
    categories: { type: DataTypes.JSON },
    categoryIds: { type: DataTypes.JSON },
  });
  Product.associate = (models) => {
    if (models && models.Rating) {
      Product.hasMany(models.Rating, { foreignKey: 'productId', as: 'ratings' });
    }
  };

  return Product;
};
