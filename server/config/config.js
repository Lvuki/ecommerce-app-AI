require('dotenv').config();

module.exports = {
  development: {
    username: String(process.env.DB_USER),
    password: String(process.env.DB_PASSWORD),
    database: String(process.env.DB_NAME),
    host: String(process.env.DB_HOST),
    dialect: 'postgres',
  },
  test: {
    username: String(process.env.DB_USER),
    password: String(process.env.DB_PASSWORD),
    database: String(process.env.DB_NAME),
    host: String(process.env.DB_HOST),
    dialect: 'postgres',
  },
  production: {
    username: String(process.env.DB_USER),
    password: String(process.env.DB_PASSWORD),
    database: String(process.env.DB_NAME),
    host: String(process.env.DB_HOST),
    dialect: 'postgres',
  },
};
