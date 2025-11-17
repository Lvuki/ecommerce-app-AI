#!/usr/bin/env node
/**
 * importCategoriesAndMapProducts.js
 *
 * Usage:
 *   node importCategoriesAndMapProducts.js "C:\Users\AVI\Projects\shop-app\category and subcategory.xlsx"
 *
 * What it does:
 * - Reads the spreadsheet (first sheet). Heuristically finds parent and child columns.
 * - Backs up existing categories and product category values to JSON files in server/tmp/
 * - Deletes all rows from Categories table.
 * - Recreates parent categories and their subcategories.
 * - For each product in Products table, if product.category exactly matches (case-insensitive)
 *   a created subcategory or parent category, updates the product.category to the normalized name.
 * - Writes unmatched product ids/names to a JSON file for manual review.
 *
 * Safety: This script creates backups before making destructive changes. It only updates product.category
 * when there's an exact case-insensitive match to a new category/subcategory name.
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

async function main() {
  const args = process.argv.slice(2);
  const arg = args[0];
  const dry = args.includes('--dry-run');
  if (!arg) {
    console.error('Usage: node importCategoriesAndMapProducts.js <path-to-xlsx-or-csv> [--dry-run]');
    process.exit(1);
  }

  const workbookPath = path.resolve(arg);
  if (!fs.existsSync(workbookPath)) {
    console.error('File not found:', workbookPath);
    process.exit(1);
  }

  const tmpDir = path.join(__dirname, '..', 'tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  // load app models
  const { sequelize, Category, Product } = require('../models');

  console.log('Reading workbook:', workbookPath);
  const wb = XLSX.readFile(workbookPath);
  const sheetName = wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
  if (!rows || rows.length === 0) {
    console.error('No rows found in spreadsheet. Aborting.');
    process.exit(1);
  }

  // Determine header keys for parent, child1 and child2
  // Accept explicit mapping via --cols="Category,Sub-category 1,Sub-category 2"
  const colsArg = args.find(a => a.startsWith('--cols='));
  let parentKey, childKey1, childKey2;
  if (colsArg) {
    const parts = colsArg.replace('--cols=', '').split(',').map(s => s.trim()).filter(Boolean);
    parentKey = parts[0] || null;
    childKey1 = parts[1] || null;
    childKey2 = parts[2] || null;
    console.log('Using explicit columns:', parentKey, childKey1, childKey2);
  } else {
    const headerKeys = Object.keys(rows[0]);
    parentKey = headerKeys.find(k => /^(category|parent|cat)$/i.test(k)) || headerKeys[0];
    childKey1 = headerKeys.find(k => /sub-?category\s*1|sub\s*category\s*1|sub-category 1|sub category 1|sub1|child1/i.test(k)) || headerKeys.find(k => /(sub|child)/i.test(k)) || headerKeys[1];
    childKey2 = headerKeys.find(k => /sub-?category\s*2|sub\s*category\s*2|sub-category 2|sub category 2|sub2|child2/i.test(k)) || headerKeys[2] || null;
    console.log('Detected columns:', parentKey, childKey1, childKey2);
  }

  // Build mapping of parent -> child1 -> set(child2)
  const map = new Map();
  for (const row of rows) {
    const parentName = parentKey ? String(row[parentKey] || '').trim() : '';
    const child1Name = childKey1 ? String(row[childKey1] || '').trim() : '';
    const child2Name = childKey2 ? String(row[childKey2] || '').trim() : '';

    // If parent is empty but child1 exists, treat child1 as parent
    const pName = parentName || child1Name || child2Name;
    if (!pName) continue;

    if (!map.has(pName)) map.set(pName, new Map());
    const child1Map = map.get(pName);

    const c1 = child1Name && child1Name !== pName ? child1Name : null;
    const c2 = child2Name ? child2Name : null;

    if (c1) {
      if (!child1Map.has(c1)) child1Map.set(c1, new Set());
      if (c2 && c2 !== c1 && c2 !== pName) child1Map.get(c1).add(c2);
    } else if (c2) {
      // No child1 but child2 exists: attach child2 directly under parent
      const orphanKey = '__direct__';
      if (!child1Map.has(orphanKey)) child1Map.set(orphanKey, new Set());
      child1Map.get(orphanKey).add(c2);
    }
  }

  // Backup existing categories and products' category fields
  console.log('Backing up existing categories and product category values...');
  const categoriesBackup = await Category.findAll({ raw: true });
  const productsBackup = await Product.findAll({ attributes: ['id', 'name', 'category'], raw: true });
  const backupCategoriesPath = path.join(tmpDir, `categories-backup-${timestamp}.json`);
  const backupProductsPath = path.join(tmpDir, `products-category-backup-${timestamp}.json`);
  fs.writeFileSync(backupCategoriesPath, JSON.stringify(categoriesBackup, null, 2));
  fs.writeFileSync(backupProductsPath, JSON.stringify(productsBackup, null, 2));
  console.log('Backups written to:', backupCategoriesPath, backupProductsPath);

  // Start transaction for category deletion and re-creation
  const t = await sequelize.transaction();
  try {
    console.log('Deleting existing categories...');
    if (!dry) await Category.destroy({ where: {}, truncate: true, cascade: false, transaction: t });

    // Create parents, child1 and child2 (two sub-levels)
    const createdParents = new Map(); // parentNameLower -> parentInstance or dry placeholder
    for (const [parentName, child1Map] of map.entries()) {
      if (!parentName) continue;
      if (dry) console.log(`[dry-run] Would create parent: "${parentName}"`);
      const parent = dry ? { id: null, name: parentName } : await Category.create({ name: parentName }, { transaction: t });
      createdParents.set(parentName.toLowerCase(), parent);

      // child1Map is Map(child1Name -> Set(child2Names))
      for (const [child1Name, child2Set] of child1Map.entries()) {
        if (child1Name === '__direct__') {
          // child2 items to create directly under parent
          for (const child2Name of Array.from(child2Set)) {
            if (!child2Name) continue;
            if (dry) console.log(`[dry-run] Would create child (level2) "${child2Name}" under parent "${parentName}"`);
            if (!dry) await Category.create({ name: child2Name, parentId: parent.id }, { transaction: t });
          }
          continue;
        }

        // create child1 under parent
        if (dry) console.log(`[dry-run] Would create child (level1) "${child1Name}" under parent "${parentName}"`);
        const child1 = dry ? { id: null, name: child1Name } : await Category.create({ name: child1Name, parentId: parent.id }, { transaction: t });

        // create child2 under child1
        for (const child2Name of Array.from(child2Set || [])) {
          if (!child2Name) continue;
          if (dry) console.log(`[dry-run] Would create child (level2) "${child2Name}" under child1 "${child1Name}"`);
          if (!dry) await Category.create({ name: child2Name, parentId: child1.id }, { transaction: t });
        }
      }
    }

    await t.commit();
    console.log('Categories recreated successfully.');
  } catch (err) {
    console.error('Error creating categories, rolling back:', err);
    await t.rollback();
    process.exit(2);
  }

  // Build lookup of new category names (case-insensitive)
  const allCats = await Category.findAll({ raw: true });
  const nameLookup = new Map(); // lower -> exactName
  for (const c of allCats) {
    if (!c.name) continue;
    nameLookup.set(String(c.name).toLowerCase(), c.name);
  }

  // Update products only when exact (case-insensitive) match exists
  console.log('Updating products with matching category names (exact match only)...');
  const allProducts = await Product.findAll();
  const unmatched = [];
  for (const p of allProducts) {
    const cur = String(p.category || '').trim();
    if (!cur) {
      unmatched.push({ id: p.id, name: p.name, category: p.category });
      continue;
    }
    const match = nameLookup.get(cur.toLowerCase());
    if (match) {
      if (p.category !== match) {
        if (!dry) {
          p.category = match;
          await p.save();
        } else {
          console.log(`[dry-run] Would update product id=${p.id} name="${p.name}" category="${p.category}" -> "${match}"`);
        }
      }
    } else {
      unmatched.push({ id: p.id, name: p.name, category: p.category });
    }
  }

  const unmatchedPath = path.join(tmpDir, `unmatched-products-${timestamp}.json`);
  fs.writeFileSync(unmatchedPath, JSON.stringify(unmatched, null, 2));
  console.log('Product update complete. Unmatched products logged to:', unmatchedPath);

  console.log('Import finished successfully. Backups are in server/tmp. Review unmatched file to map any remaining products manually.');
}

main().catch(err => { console.error(err); process.exit(10); });
