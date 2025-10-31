// server/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { sequelize, Product, Blog } = require('./models');
const { authenticate, adminOnly } = require('./middleware/authMiddleware');

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const userRoutes = require('./routes/userRoutes');
const blogRoutes = require('./routes/blogs');

const app = express();

// Middleware
app.use(express.json());

// Enable CORS for frontend
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes); // includes admin-only routes

// Serve uploaded images
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Serve React frontend build
app.use(express.static(path.join(__dirname, '../client/build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

// Test route
app.get('/test', (req, res) => res.json({ message: 'Server is running!' }));

// Start server
const PORT = process.env.PORT || 4000;
sequelize.sync({ alter: true })
  .then(() => {
    console.log('Database synced');
    // Seed dummy products if none exist
    Product.count().then(async (count) => {
      if (count === 0) {
        const items = Array.from({ length: 20 }).map((_, i) => {
          const id = i + 1;
          const brand = ["Acme", "Globex", "Umbrella", "Soylent", "Initech"][i % 5];
          const category = ["Electronics", "Apparel", "Home", "Sports", "Toys"][i % 5];
          return {
            name: `Sample Product ${id}`,
            description: `This is a great product number ${id}.`,
            price: 9.99 + i,
            image: `https://picsum.photos/seed/product${id}/600/400`,
            category,
            sku: `SKU-${1000 + id}`,
            brand,
            stock: 10 + i,
            specs: { color: ["red","blue","green"][i % 3], size: ["S","M","L"][i % 3], weight: `${0.5 + i*0.1}kg` },
          };
        });
        await Product.bulkCreate(items);
        console.log('Seeded 20 sample products');
      }
    }).catch(() => {});

    // Seed dummy blog posts if none exist
    if (Blog) {
      Blog.count().then(async (count) => {
        if (count === 0) {
          const categories = ['Announcements','Tips','Development','News','Guides'];
          const posts = Array.from({ length: 10 }).map((_, i) => {
            const id = i + 1;
            return {
              title: `Sample Blog Post ${id}`,
              excerpt: `This is a short excerpt for sample blog post ${id}.`,
              content: `Full content for sample blog post ${id}. Replace this with your actual post content.`,
              category: categories[i % categories.length],
              image: `https://picsum.photos/seed/blog${id}/1200/600`,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          });
          await Blog.bulkCreate(posts);
          console.log('Seeded 10 sample blog posts');
        }
      }).catch(() => {});
    }
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error('Database connection error:', err));
