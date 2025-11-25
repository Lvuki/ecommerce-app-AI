const { Sequelize } = require('sequelize');
const path = require('path');
const config = require(path.join(__dirname, '..', 'config', 'config.json'));

// Prefer DATABASE_URL env var for safety. Falls back to config.json for convenience.
const env = process.env.NODE_ENV || 'development';
let conf = config[env] || {};

// If the user provided a DATABASE_URL env var, use it and skip config.json
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

    const qi = sequelize.getQueryInterface();

    // Try both 'Products' and 'products' table name variants
    const tableCandidates = ['Products', 'products'];
    let found = false;
    for (const t of tableCandidates) {
      try {
        const cols = await qi.describeTable(t);
        console.log(JSON.stringify({ table: t, columns: cols }, null, 2));
        found = true;
        break;
      } catch (err) {
        // ignore and try next
      }
    }

    if (!found) {
      console.error('Could not find table using candidates:', tableCandidates.join(', '));
      console.error('If your table uses a different name or schema, update the script accordingly.');
      process.exitCode = 2;
    }

    await sequelize.close();
  } catch (err) {
    console.error('Error connecting or describing table:');
    console.error(err && (err.stack || err.message || err));
    process.exitCode = 3;
  }
}

main();
