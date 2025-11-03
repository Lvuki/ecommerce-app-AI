// Run this from the server folder: node scripts/seedCategoriesAndNormalize.js
// It creates 10 dummy categories (if they don't already exist) and normalizes Product.category

const path = require('path');
const fs = require('fs');
const https = require('https');
const { sequelize, Category, Product } = require('../models');

// directory to store downloaded images
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

function slugify(name) {
  return (name || '')
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

function extFromUrl(url) {
  try {
    const p = new URL(url).pathname;
    function slugify(input) {
      return (input || '').toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }

    function getExtensionFromUrl(url) {
      try {
        const pathname = new URL(url).pathname;
        const ext = path.extname(pathname).split('?')[0] || '.jpg';
        return ext;
      } catch (err) {
        return '.jpg';
      }
    }
    const idx = p.lastIndexOf('.');
    if (idx > 0) return p.slice(idx);
  } catch (e) {}
  return '.jpg';
}

async function downloadImage(url, dst) {
  if (fs.existsSync(dst)) return dst;
  return new Promise((resolve, reject) => {
    try {
      const proto = url.startsWith('https') ? https : require('http');
      const req = proto.get(url, (res) => {
        // follow redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return downloadImage(res.headers.location, dst).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          return reject(new Error('Failed to download image: ' + res.statusCode));
        }
        const file = fs.createWriteStream(dst);
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve(dst)));
        file.on('error', (err) => {
          fs.unlink(dst, () => {});
          reject(err);
        });
      });
      req.on('error', (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
}

async function main() {
  try {
    await sequelize.authenticate();
    console.log('DB connection OK');

    // Top-level categories with image URLs (Unsplash placeholders)
    const categoriesToCreate = [
      { name: 'Electronics', description: 'Gadgets, devices and accessories', image: 'https://images.unsplash.com/photo-1510557880182-3d4d3c5b0b9b?auto=format&fit=crop&w=800&q=60' },
      { name: 'Books', description: 'Printed and digital books', image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=60' },
      { name: 'Clothing', description: 'Apparel for men, women and children', image: 'https://images.unsplash.com/photo-1520975698518-6f9c8b9f1d6f?auto=format&fit=crop&w=800&q=60' },
      { name: 'Home & Kitchen', description: 'Household items and kitchenware', image: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=800&q=60' },
      { name: 'Toys', description: 'Toys and games for kids', image: 'https://images.unsplash.com/photo-1542129763-6b1f0b9b3d11?auto=format&fit=crop&w=800&q=60' },
      { name: 'Beauty', description: 'Cosmetics and beauty products', image: 'https://images.unsplash.com/photo-1541534401786-6e6e6f3b0c5b?auto=format&fit=crop&w=800&q=60' },
      { name: 'Sports', description: 'Sporting goods and outdoor gear', image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=800&q=60' },
      { name: 'Health', description: 'Health and personal care', image: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=800&q=60' },
      { name: 'Garden', description: 'Gardening tools and outdoor supplies', image: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=800&q=60' },
      { name: 'Automotive', description: 'Car parts and accessories', image: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=800&q=60' },
    ];

    // Create or find top-level categories and download their images locally
    const created = [];
    for (const c of categoriesToCreate) {
      const [cat] = await Category.findOrCreate({
        where: { name: c.name },
        defaults: { description: c.description, image: c.image || null, parentId: null },
      });
      // ensure image/description updated if missing
      let changed = false;
      if (!cat.description && c.description) { cat.description = c.description; changed = true; }
      // if there's a remote image, download it and point to local /uploads path
      if (c.image) {
        try {
          const filename = `${slugify(c.name)}${extFromUrl(c.image)}`;
          const dst = path.join(uploadsDir, filename);
          await downloadImage(c.image, dst);
          const localPath = `/uploads/${filename}`;
          if (cat.image !== localPath) { cat.image = localPath; changed = true; }
        } catch (err) {
          console.warn(`Failed to download image for ${c.name}:`, err.message || err);
          // Try picsum.photos fallback
          try {
            const fallbackUrl = `https://picsum.photos/seed/${slugify(c.name)}/800/600`;
            const filename = `${slugify(c.name)}-picsum-${Date.now()}.jpg`;
            const dst = path.join(uploadsDir, filename);
            await downloadImage(fallbackUrl, dst);
            const localPath = `/uploads/${filename}`;
            if (cat.image !== localPath) { cat.image = localPath; changed = true; }
          } catch (err2) {
            console.warn(`Picsum fallback failed for ${c.name}:`, err2.message || err2);
            if (!cat.image && c.image) { cat.image = c.image; changed = true; }
          }
        }
      }
      if (changed) await cat.save();
      created.push(cat);
    }

    console.log(`Ensured ${created.length} top-level categories exist.`);

    // Add some subcategories to a few categories
    const subcategories = [
      { parent: 'Electronics', name: 'Phones', description: 'Smartphones and mobile devices', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=60' },
      { parent: 'Electronics', name: 'Computers', description: 'Laptops, desktops and accessories', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=60' },
      { parent: 'Clothing', name: 'Men', description: 'Men clothing', image: 'https://images.unsplash.com/photo-1520975698518-6f9c8b9f1d6f?auto=format&fit=crop&w=600&q=60' },
      { parent: 'Clothing', name: 'Women', description: 'Women clothing', image: 'https://images.unsplash.com/photo-1520975698518-6f9c8b9f1d6f?auto=format&fit=crop&w=600&q=60' },
      { parent: 'Home & Kitchen', name: 'Decor', description: 'Home decor items', image: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=600&q=60' },
      { parent: 'Toys', name: 'Educational', description: 'Educational toys', image: 'https://images.unsplash.com/photo-1601758123927-3c2b6b6ba0f7?auto=format&fit=crop&w=600&q=60' },
    ];

    const createdSub = [];
    for (const s of subcategories) {
      const parent = created.find(c => c.name === s.parent);
      if (!parent) continue;
      const [subcat] = await Category.findOrCreate({
        where: { name: s.name, parentId: parent.id },
        defaults: { description: s.description, image: s.image || null, parentId: parent.id },
      });
      // try to download subcategory image as well
      let changed = false;
      if (!subcat.description && s.description) { subcat.description = s.description; changed = true; }
      if (s.image) {
        try {
          const filename = `${slugify(parent.name)}-${slugify(s.name)}${extFromUrl(s.image)}`;
          const dst = path.join(uploadsDir, filename);
          await downloadImage(s.image, dst);
          const localPath = `/uploads/${filename}`;
          if (subcat.image !== localPath) { subcat.image = localPath; changed = true; }
        } catch (err) {
          console.warn(`Failed to download image for ${s.name}:`, err.message || err);
          // Try picsum.photos fallback for subcategory
          try {
            const fallbackUrl = `https://picsum.photos/seed/${slugify(parent.name)}-${slugify(s.name)}/600/400`;
            const filename = `${slugify(parent.name)}-${slugify(s.name)}-picsum-${Date.now()}.jpg`;
            const dst = path.join(uploadsDir, filename);
            await downloadImage(fallbackUrl, dst);
            const localPath = `/uploads/${filename}`;
            if (subcat.image !== localPath) { subcat.image = localPath; changed = true; }
          } catch (err2) {
            console.warn(`Picsum fallback failed for ${s.name}:`, err2.message || err2);
            if (!subcat.image && s.image) { subcat.image = s.image; changed = true; }
          }
        }
      }
      if (changed) await subcat.save();
      createdSub.push(subcat);
    }

    console.log(`Ensured ${createdSub.length} subcategories exist.`);

    // Build a set of allowed category names (lowercase) including subcategories
    const allowed = new Set([...created.map(c => (c.name || '').toLowerCase()), ...createdSub.map(c => (c.name || '').toLowerCase())]);

    // Fetch all products
    const products = await Product.findAll();
    console.log(`Found ${products.length} products.`);

    // Assign categories to products if missing or randomize some
    const allCategoryNames = [...created.map(c => c.name), ...createdSub.map(c => c.name)];
    let assigned = 0;
    for (const p of products) {
      // if product already has a valid category, skip 60% of the time to preserve existing data
      const current = (p.category || '').toString().trim();
      if (current && allowed.has(current.toLowerCase()) && Math.random() < 0.6) continue;
      // pick a random category
      const cat = allCategoryNames[Math.floor(Math.random() * allCategoryNames.length)];
      p.category = cat;
      await p.save();
      assigned++;
    }

    console.log(`Assigned categories to ${assigned} products.`);

    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error('Error in seeding/normalizing:', err);
    process.exit(1);
  }
}

if (require.main === module) main();
