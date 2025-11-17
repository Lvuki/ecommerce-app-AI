const path = require('path');
const fs = require('fs');

(async function(){
  try {
    process.chdir(path.join(__dirname, '..'));
    const db = require('../models');
    const Category = db.Category;
    const sequelize = db.sequelize;

    const tmpDir = path.join(__dirname);
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[.:]/g, '-');

    console.log('Backing up current categories...');
    const cats = await Category.findAll({ raw: true });
    const backupPath = path.join(tmpDir, `categories-backup-before-delete-${timestamp}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(cats, null, 2));
    console.log('Backup written to:', backupPath);

    console.log('Deleting (TRUNCATE) Categories table...');
    await sequelize.transaction(async (t) => {
      await Category.destroy({ where: {}, truncate: true, cascade: false, transaction: t });
    });
    console.log('Categories table truncated successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error during backup/delete:', err);
    process.exit(2);
  }
})();
