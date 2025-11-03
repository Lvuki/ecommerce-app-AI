module.exports = (sequelize, DataTypes) => {
  const Page = sequelize.define('Page', {
    title: { type: DataTypes.STRING, allowNull: false },
    slug: { type: DataTypes.STRING, allowNull: false, unique: true },
    type: { type: DataTypes.STRING, allowNull: false, defaultValue: 'custom' },
    content: { type: DataTypes.JSONB, allowNull: true },
    "order": { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    visible: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, {
    tableName: 'Pages',
  });

  Page.associate = (models) => {
    // no associations for now
  };

  return Page;
};
