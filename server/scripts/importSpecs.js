const fs = require('fs');
const path = require('path');

async function run() {
  try {
    const root = path.resolve(__dirname, '..', '..');
    const csvPath = process.argv[2] || path.join(root, 'Products Spec.cleaned.csv');
    if (!fs.existsSync(csvPath)) {
      console.error('CSV file not found:', csvPath);
      process.exit(1);
    }

    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split(/\r?\n/).filter(Boolean);
    if (!lines.length) {
      console.error('CSV is empty');
      process.exit(1);
    }

    // load models (Sequelize) and initialize DB connection
    const models = require('../models');
    const { Product } = models;

    let updated = 0;
    let missing = 0;
    let parsed = 0;

    // skip header
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // split only at first comma; SKU contains no commas
      const idx = line.indexOf(',');
      if (idx === -1) continue;
      const sku = line.substring(0, idx).trim();
      let specRaw = line.substring(idx + 1).trim();
      if (!sku) continue;
      if (!specRaw) continue;

      // unquote if wrapped in double quotes and unescape doubled quotes
      if (specRaw.startsWith('"') && specRaw.endsWith('"')) {
        specRaw = specRaw.substring(1, specRaw.length - 1).replace(/""/g, '"');
      }

      let specObj = null;
      try {
        specObj = JSON.parse(specRaw);
        parsed++;
      } catch (e) {
        console.warn(`Failed to parse JSON for SKU ${sku} on line ${i + 1}:`, e.message);
        continue;
      }

      // find product by sku
      const product = await Product.findOne({ where: { sku } });
      if (!product) {
        missing++;
        continue;
      }

      // normalize existing specs
      let existing = product.specs;
      if (existing && typeof existing === 'string') {
        try { existing = JSON.parse(existing); } catch (_) { existing = null; }
      }
      if (!existing || typeof existing !== 'object') existing = {};

      const merged = Object.assign({}, existing, specObj);

      try {
        product.specs = merged;
        await product.save();
        updated++;
      } catch (e) {
        console.error(`Failed to save product SKU ${sku}:`, e.message);
      }
    }

    console.log('Import complete. lines:', lines.length - 1, 'parsed:', parsed, 'updated:', updated, 'missing:', missing);
    process.exit(0);
  } catch (err) {
    console.error('Error', err);
    process.exit(2);
  }
}

run();
