module.exports = (sequelize, DataTypes) => {
  const Rating = sequelize.define('Rating', {
    productId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: true },
    value: { type: DataTypes.INTEGER, allowNull: false },
  });

  Rating.associate = (models) => {
    Rating.belongsTo(models.Product, { foreignKey: 'productId' });
  };

  return Rating;
};
