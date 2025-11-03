module.exports = (sequelize, DataTypes) => {
  const Role = sequelize.define('Role', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
  }, {
    tableName: 'Roles',
    timestamps: true,
  });

  Role.associate = (models) => {
    // Roles are referenced by User.role (string) — no FK relation
  };

  return Role;
};
