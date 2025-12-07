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
    if (lines.length < 2) {
      console.error('CSV has no data');
      process.exit(1);
    }

    const skus = new Set();
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const idx = line.indexOf(',');
      if (idx === -1) continue;
      const sku = line.substring(0, idx).trim();
      if (sku) skus.add(sku);
    }

    if (!skus.size) {
      console.error('No SKUs found in CSV');
      process.exit(1);
    }

    // load models
    const models = require('../models');
    const { Product } = models;

    const skuArray = Array.from(skus);
    // query products in batches to avoid huge IN lists
    const batchSize = 500;
    const results = [];
    for (let i = 0; i < skuArray.length; i += batchSize) {
      const batch = skuArray.slice(i, i + batchSize);
      const rows = await Product.findAll({ where: { sku: batch } });
      for (const r of rows) results.push(r && typeof r.toJSON === 'function' ? r.toJSON() : r);
    }

    const outPath = path.join(__dirname, `specs-backup-${Date.now()}.json`);
    fs.writeFileSync(outPath, JSON.stringify({ created: new Date().toISOString(), count: results.length, products: results }, null, 2), 'utf8');
    console.log('Backup written to', outPath, 'products saved:', results.length);
    process.exit(0);
  } catch (err) {
    console.error('Error', err);
    process.exit(2);
  }
}

run();
