const fs = require('fs');
const path = require('path');

async function main() {
  const csvPath = path.resolve(__dirname, '..', 'tmp', 'import-template-produkti-image2.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('CSV not found at', csvPath);
    process.exit(1);
  }

  // Load DB
  const db = require('../models');
  const Product = db.Product || db.product || db.Products || db.products;
  if (!Product) {
    console.error('Could not find Product model in ../models');
    process.exit(1);
  }

  try {
    if (db.sequelize && typeof db.sequelize.authenticate === 'function') {
      await db.sequelize.authenticate();
    }
  } catch (err) {
    console.error('DB connection failed:', err && err.message ? err.message : err);
    process.exit(1);
  }

  const raw = fs.readFileSync(csvPath, 'utf8');
  const lines = raw.split(/\r?\n/);
  if (lines.length < 2) {
    console.error('CSV has no data');
    process.exit(1);
  }

  // Simple CSV parser for this file (handles quoted fields)
  function parseCSVLine(line) {
    const fields = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
        continue;
      }
      if (ch === ',' && !inQuotes) { fields.push(cur); cur = ''; continue; }
      cur += ch;
    }
    fields.push(cur);
    return fields;
  }

  const header = parseCSVLine(lines[0]);
  const skuIdx = header.findIndex(h => h.trim().toLowerCase() === 'sku');
  const categoriesIdx = header.findIndex(h => h.trim().toLowerCase() === 'categories');
  if (skuIdx === -1 || categoriesIdx === -1) {
    console.error('CSV header missing `sku` or `categories` columns');
    process.exit(1);
  }

  let updated = 0;
  let missing = 0;
  let errors = 0;
  const missingSkus = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.trim() === '') continue;
    const fields = parseCSVLine(line);
    const sku = (fields[skuIdx] || '').trim();
    if (!sku) continue;
    let categoriesField = (fields[categoriesIdx] || '').trim();

    // Normalize categories: expect JSON array string like ["A","B"] or []
    let parsedCategories = null;
    if (!categoriesField) parsedCategories = null;
    else {
      try {
        // If the field is not quoted JSON but plain like [A,B] this script expects the CSV fixer has run.
        parsedCategories = JSON.parse(categoriesField);
        if (!Array.isArray(parsedCategories)) parsedCategories = null;
      } catch (e) {
        // fallback: try to parse unquoted list like [A,B]
        try {
          const inner = categoriesField.replace(/^\[/, '').replace(/\]$/, '');
          const parts = inner.split(',').map(s => s.trim()).filter(Boolean);
          parsedCategories = parts.length ? parts : null;
        } catch (ee) {
          parsedCategories = null;
        }
      }
    }

    try {
      const product = await Product.findOne({ where: { sku } });
      if (!product) {
        missing++;
        missingSkus.push(sku);
        continue;
      }

      // Only update the `categories` field
      // If parsedCategories is null/empty, we will set null (do not overwrite with empty string)
      const newValue = parsedCategories && parsedCategories.length ? parsedCategories : null;

      // Compare current value to avoid unnecessary writes
      const current = product.categories;
      const equal = JSON.stringify(current || null) === JSON.stringify(newValue);
      if (equal) continue;

      await product.update({ categories: newValue });
      updated++;
    } catch (err) {
      errors++;
      console.error('Error updating sku', sku, err && err.message ? err.message : err);
    }
  }

  console.log('Backfill complete. Updated:', updated, 'Missing products:', missing, 'Errors:', errors);
  if (missingSkus.length) console.log('Missing SKUs sample:', missingSkus.slice(0,50).join(', '));

  if (db.sequelize && typeof db.sequelize.close === 'function') await db.sequelize.close();
  process.exit(0);
}

main();
