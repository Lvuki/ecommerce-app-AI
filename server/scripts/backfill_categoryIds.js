const models = require('../models');
const { Product, Category } = models;

async function resolveCategoryPathIds(identifier) {
  if (!identifier) return null;
  const asNum = Number(identifier);
  let cat = null;
  if (!Number.isNaN(asNum) && Number.isFinite(asNum)) {
    cat = await Category.findByPk(asNum);
  }
  if (!cat && typeof identifier === 'string') {
    const decoded = String(identifier).trim();
    const parts = decoded.split(/\s*[›>\/\\-]\s*/).map(s => s.trim()).filter(Boolean);
    const candidates = parts.length ? [parts[parts.length - 1], decoded] : [decoded];
    for (const cand of candidates) {
      if (!cand) continue;
      const found = await Category.findOne({ where: { name: cand } });
      if (found) { cat = found; break; }
    }
  }
  if (!cat) {
    // try exact name
    cat = await Category.findOne({ where: { name: identifier } });
  }
  if (!cat) return null;
  const ids = [];
  let cur = cat;
  while (cur) {
    ids.push(cur.id);
    if (!cur.parentId) break;
    cur = await Category.findByPk(cur.parentId);
  }
  return ids.reverse();
}

(async function run() {
  try {
    console.log('Loading products...');
    const products = await Product.findAll();
    console.log(`Found ${products.length} products`);
    let updated = 0;
    let skipped = 0;
    let missing = 0;
    for (const p of products) {
      const pj = p && typeof p.toJSON === 'function' ? p.toJSON() : p;
      if (pj.categoryIds && Array.isArray(pj.categoryIds) && pj.categoryIds.length) {
        skipped++;
        continue;
      }
      let identifier = null;
      if (pj.category) identifier = pj.category;
      else if (pj.categories && Array.isArray(pj.categories) && pj.categories.length) {
        // prefer the most specific category name
        identifier = pj.categories[pj.categories.length - 1];
      }
      if (!identifier) {
        missing++;
        continue;
      }
      const ids = await resolveCategoryPathIds(identifier);
      if (ids && ids.length) {
        await Product.update({ categoryIds: ids }, { where: { id: pj.id } });
        updated++;
      } else {
        missing++;
      }
    }
    console.log('Backfill complete. Updated:', updated, 'Skipped:', skipped, 'Missing:', missing);
    process.exit(0);
  } catch (err) {
    console.error('Backfill failed', err);
    process.exit(2);
  }
})();
