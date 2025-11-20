const fs = require('fs');
const path = require('path');
const minimist = require('minimist');
require('dotenv').config();

const args = minimist(process.argv.slice(2), {
  boolean: ['dry', 'apply'],
  default: { dry: true, apply: false },
});

const dateArg = args.date || new Date().toISOString().slice(0, 10); // YYYY-MM-DD
const isApply = !!args.apply;

(async function main(){
  const { sequelize, Product } = require('../models');
  const { Op } = require('sequelize');

  console.log(`Using date: ${dateArg}  (apply=${isApply})`);

  const start = new Date(`${dateArg}T00:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);

  await sequelize.authenticate();

  const where = {
    createdAt: {
      [Op.gte]: start,
      [Op.lt]: end,
    },
  };

  const count = await Product.count({ where });
  console.log(`Found ${count} products with createdAt on ${dateArg}`);

  if (count === 0) {
    console.log('Nothing to do. Exiting.');
    process.exit(0);
  }

  const rows = await Product.findAll({ where, raw: true });

  const tmpDir = path.join(__dirname, '..', 'tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const ts = Date.now();
  const backupFile = path.join(tmpDir, `deleted-products-backup-${dateArg}-${ts}.csv`);

  const headers = Object.keys(rows[0]);
  const csvLines = [headers.join(',')];
  for (const r of rows) {
    const line = headers.map(h => {
      const v = r[h] == null ? '' : String(r[h]).replace(/"/g, '""');
      return (/,|\n|\r|"/.test(v)) ? `"${v}"` : v;
    }).join(',');
    csvLines.push(line);
  }

  fs.writeFileSync(backupFile, csvLines.join('\n'), 'utf8');
  console.log(`Backup written: ${backupFile}`);

  console.log('\nSample (up to 50) rows:');
  rows.slice(0,50).forEach(r => console.log(`  id:${r.id} sku:${r.kodi_i_produktit} name:${r.name}`));

  if (isApply) {
    console.log('\n--apply provided, deleting rows now...');
    const t = await sequelize.transaction();
    try {
      const deleted = await Product.destroy({ where, transaction: t });
      await t.commit();
      console.log(`Deleted ${deleted} rows.`);
      process.exit(0);
    } catch (err) {
      await t.rollback();
      console.error('Error during delete, rolled back.', err);
      process.exit(2);
    }
  } else {
    console.log('\nDry-run (no rows deleted). To delete these rows run with --apply');
    process.exit(0);
  }

})().catch(err => {
  console.error(err);
  process.exit(2);
});
