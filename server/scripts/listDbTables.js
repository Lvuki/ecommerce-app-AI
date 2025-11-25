const { Sequelize } = require('sequelize');
const path = require('path');
const config = require(path.join(__dirname, '..', 'config', 'config.json'));

// Prefer DATABASE_URL env var for safety. Falls back to config.json for convenience.
const env = process.env.NODE_ENV || 'development';
let conf = config[env] || {};
const databaseUrl = process.env.DATABASE_URL || process.env.DB_URL || conf.url;

async function main() {
  let sequelize;
  try {
    if (databaseUrl) {
      sequelize = new Sequelize(databaseUrl, { dialect: conf.dialect || 'postgres', logging: false });
    } else if (conf.database) {
      sequelize = new Sequelize(conf.database, conf.username, conf.password, {
        host: conf.host || 'localhost',
        port: conf.port || 5432,
        dialect: conf.dialect || 'postgres',
        logging: false,
      });
    } else {
      console.error('No database connection information found. Set the DATABASE_URL env var or configure server/config/config.json.');
      process.exitCode = 5;
      return;
    }

    const [results] = await sequelize.query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema') ORDER BY table_schema, table_name; ");
    console.log(JSON.stringify(results, null, 2));

    await sequelize.close();
  } catch (err) {
    console.error('Error connecting or listing tables:');
    console.error(err && (err.stack || err.message || err));
    process.exitCode = 4;
  }
}

main();
