const fs = require('fs');
const path = require('path');  // <-- Add this line
const Sequelize = require('sequelize');

// Ensure environment variables from .env are loaded when scripts require models directly
require('dotenv').config();

const { DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT } = process.env;

// Coerce env values to expected types and provide sensible defaults where appropriate
const dbName = DB_NAME || 'shopdb';
const dbUser = DB_USER || 'postgres';
const dbPassword = DB_PASSWORD === undefined ? '' : String(DB_PASSWORD);
const dbHost = DB_HOST || 'localhost';
const dbPort = DB_PORT ? Number(DB_PORT) : undefined;

const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
  host: dbHost,
  port: dbPort,
  dialect: 'postgres',
});

const db = {};

fs.readdirSync(__dirname)
  .filter(file => file !== 'index.js' && file.endsWith('.js'))
  .forEach(file => {
    const modelImport = require(path.join(__dirname, file));
    if (typeof modelImport === 'function') {
      const model = modelImport(sequelize, Sequelize.DataTypes);
      db[model.name] = model;
    } else {
      console.warn(`${file} does not export a function`);
    }
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
