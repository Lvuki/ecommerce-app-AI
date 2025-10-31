require('dotenv').config(); // MUST be first
const bcrypt = require('bcryptjs');
const { User, sequelize } = require('./models');

async function createAdmin() {
  try {
    await sequelize.sync();

    const hashedPassword = await bcrypt.hash('123456', 10);

    const admin = await User.create({
      name: 'Admin2',
      email: 'admin2@example.com',
      password: hashedPassword.toString(), // make sure it's a string
      role: 'admin'
    });

    console.log('Admin user created:', admin.toJSON());
    process.exit(0);
  } catch (err) {
    console.error('Error creating admin:', err);
    process.exit(1);
  }
}

createAdmin();
