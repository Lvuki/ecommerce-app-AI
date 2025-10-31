module.exports = (sequelize, DataTypes) => {
  const Blog = sequelize.define('Blog', {
    title: { type: DataTypes.STRING, allowNull: false },
    excerpt: { type: DataTypes.STRING },
    content: { type: DataTypes.TEXT },
    category: { type: DataTypes.STRING },
    image: { type: DataTypes.STRING },
  });

  return Blog;
};
