const { Sequelize } = require('sequelize');

(async function(){
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('Please set DATABASE_URL env var before running this script.');
    process.exit(2);
  }
  const sequelize = new Sequelize(databaseUrl, { logging: false });
  try {
    const [rows] = await sequelize.query('SELECT name FROM "SequelizeMeta" ORDER BY name');
    console.log(JSON.stringify(rows, null, 2));
    await sequelize.close();
  } catch (err) {
    console.error('Error querying SequelizeMeta:', err && (err.stack || err.message || err));
    process.exit(3);
  }
})();
