// server/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { sequelize, Product, Blog, Order, OrderItem, User } = require('./models');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { authenticate, adminOnly } = require('./middleware/authMiddleware');

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
// Use the primary users router which includes /me and public profile endpoints
const userRoutes = require('./routes/users');
const blogRoutes = require('./routes/blogs');
const categoryRoutes = require('./routes/categories');
const blogCategoryRoutes = require('./routes/blogCategories');
const cartRoutes = require('./routes/cart');
const wishlistRoutes = require('./routes/wishlist');
const serviceRoutes = require('./routes/services');
const adminRoutes = require('./routes/admin');
const rolesRoutes = require('./routes/roles');
const pagesRoutes = require('./routes/pages');

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

// Simple request logger that writes to `server/logs/requests.log` for debugging
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
const requestsLog = path.join(logsDir, 'requests.log');
app.use((req, res, next) => {
  try {
    const line = `${new Date().toISOString()} ${req.method} ${req.originalUrl} query=${JSON.stringify(req.query)}\n`;
    fs.appendFile(requestsLog, line, () => {});
  } catch (e) {
    // ignore logging errors
  }
  next();
});

// Enable CORS for frontend
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/blogcategories', blogCategoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes); // includes admin-only routes
app.use('/api/admin', adminRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/pages', pagesRoutes);

// Serve uploaded images
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Protect direct access to /admin and its subroutes on the server-side (use cookie token)
app.get(['/admin', '/admin/*'], (req, res, next) => {
  const token = req.cookies && req.cookies.token;
  if (!token) {
    // Redirect to login (client will render login page)
    return res.redirect('/login');
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload && payload.role === 'admin') {
      // serve index.html (React will handle the rest)
      return res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
    }
    return res.redirect('/login');
  } catch (err) {
    return res.redirect('/login');
  }
});

// Serve React frontend build (catch-all for non-admin and other routes)
const clientBuildDir = path.join(__dirname, '../client/build');
if (fs.existsSync(clientBuildDir)) {
  app.use(express.static(clientBuildDir));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildDir, 'index.html'));
  });
} else {
  // If the React build is not present (dev environment), redirect unknown routes
  // to the client dev server so OAuth callbacks and client routes resolve there.
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  app.get('*', (req, res) => {
    // preserve path so client can handle /auth/success?token=...
    return res.redirect(clientUrl + req.originalUrl);
  });
}

// Test route
app.get('/test', (req, res) => res.json({ message: 'Server is running!' }));

// Start server
const PORT = process.env.PORT || 4000;
sequelize.sync({ alter: true })
  .then(() => {
    console.log('Database synced');
    // No automatic data seeding in server.js. Seeding has been removed to avoid populating test data on startup.
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error('Database connection error:', err));
