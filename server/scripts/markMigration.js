const { Client } = require('pg');
const url = 'postgres://postgres:mypassword@localhost:5432/shop_db';
const migrationName = '20251101120000-add-surname-profileimage-to-users.js';

(async () => {
  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    // Ensure SequelizeMeta table exists
    const res = await client.query("SELECT to_regclass('public.\"SequelizeMeta\"') AS exists");
    if (!res.rows[0].exists) {
      console.log('SequelizeMeta table not found; creating...');
      await client.query('CREATE TABLE IF NOT EXISTS "SequelizeMeta" (name VARCHAR(255) NOT NULL PRIMARY KEY)');
    }
    // Insert migration name if not present
    const r = await client.query('SELECT name FROM "SequelizeMeta" WHERE name=$1', [migrationName]);
    if (r.rowCount === 0) {
      await client.query('INSERT INTO "SequelizeMeta" (name) VALUES ($1)', [migrationName]);
      console.log('Inserted migration into SequelizeMeta:', migrationName);
    } else {
      console.log('Migration already recorded in SequelizeMeta:', migrationName);
    }
  } catch (err) {
    console.error('Failed to mark migration:', err.message || err);
    process.exitCode = 1;
  } finally {
    try { await client.end(); } catch (_) {}
  }
})();
