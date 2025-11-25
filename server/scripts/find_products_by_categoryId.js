#!/usr/bin/env node
// Usage: node server/scripts/find_products_by_categoryId.js <categoryId>
// Prints products that contain the given category id in their categoryIds JSON column.

const path = require('path');
const models = require(path.join(__dirname, '..', 'models'));

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: node server/scripts/find_products_by_categoryId.js <categoryId>');
    process.exit(1);
  }
  const cid = Number(arg);
  if (Number.isNaN(cid)) {
    console.error('categoryId must be a number');
    process.exit(1);
  }

  const sequelize = models.sequelize;
  try {
    await sequelize.authenticate();
  } catch (e) {
    console.error('Failed to connect to DB via Sequelize:', e && e.message ? e.message : e);
    process.exit(2);
  }

  try {
    // Try to find a likely column name that stores category IDs
    const q = `SELECT column_name FROM information_schema.columns WHERE lower(table_name) = lower('Products') AND column_name ILIKE '%category%';`;
    const cols = await sequelize.query(q, { type: sequelize.QueryTypes.SELECT });
    if (!Array.isArray(cols) || cols.length === 0) {
      console.error('No category-like column found on Products table. Columns:', JSON.stringify(cols));
      process.exit(3);
    }
    // pick the most likely candidate
    const candidates = cols.map(r => r.column_name);
    let col = null;
    const prefer = ['categoryids', 'category_ids', 'categoryIds', 'categoryids'];
    for (const p of prefer) {
      const found = candidates.find(c => c.toLowerCase() === p.toLowerCase());
      if (found) { col = found; break; }
    }
    if (!col) col = candidates[0];

    console.log('Using column:', col);

    const arr = JSON.stringify([cid]);
    const quotedCol = `"${col.replace(/"/g, '""')}"`;
    const sql = `SELECT id, name, ${quotedCol} FROM \"Products\" WHERE ${quotedCol}::jsonb @> '${arr}'::jsonb LIMIT 500;`;
    const rows = await sequelize.query(sql, { type: sequelize.QueryTypes.SELECT });
    console.log('Matched rows:', rows.length);
    for (const r of rows) {
      console.log(`- id=${r.id} name=${r.name} ${col}=${JSON.stringify(r[col])}`);
    }

    // also print a quick count using COUNT(*)
    const countSql = `SELECT count(*) AS cnt FROM \"Products\" WHERE ${quotedCol}::jsonb @> '${arr}'::jsonb;`;
    const cntRows = await sequelize.query(countSql, { type: sequelize.QueryTypes.SELECT });
    if (Array.isArray(cntRows) && cntRows.length) {
      console.log('Total count (raw):', cntRows[0].cnt);
    }

    process.exit(0);
  } catch (err) {
    console.error('Query failed:', err && err.message ? err.message : err);
    process.exit(4);
  }
}

main();
