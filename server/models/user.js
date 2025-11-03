module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define("User", {
    name: { type: DataTypes.STRING, allowNull: false },
    surname: { type: DataTypes.STRING },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING, defaultValue: "user" }, // <-- important
    profileImage: { type: DataTypes.STRING }
  });

  return User;
};
