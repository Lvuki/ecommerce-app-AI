module.exports = (sequelize, DataTypes) => {
  const Service = sequelize.define('Service', {
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    price: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 }
  });

  Service.associate = (models) => {
    if (models && models.Product) {
      Service.belongsToMany(models.Product, { through: 'ProductServices', foreignKey: 'serviceId', otherKey: 'productId', as: 'products' });
    }
  };

  return Service;
};
