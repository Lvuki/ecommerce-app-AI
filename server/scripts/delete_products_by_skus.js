#!/usr/bin/env node
// Deletes products by SKU list. Use with caution.
require('dotenv').config();
const { sequelize, Product } = require('../models');

(async function(){
  try{
    const skus = [
      'B0ACPOWITPLTLWA801NDAM',
      'B0ANGBDPTOVGAWAM',
      'B0ANUGUSBAUSBCG',
      'B0ANUGUSBBTADAM',
      'B0ANWANWF2119CI',
      'B0BASKZDS2208SR7U2100AZW',
      'B0BOBOSESMB178334201',
      'B0BOBOSESMO178334209',
      'B0BOPLS220BU',
      'B0BOPRCAGI490MGPK'
    ];

    console.log('Connecting to DB...');
    await sequelize.authenticate();
    console.log('Connected. Deleting products with SKUs:', skus.join(', '));

    const deleted = await Product.destroy({ where: { sku: skus } });
    console.log('Products deleted:', deleted);

    await sequelize.close();
    process.exit(0);
  }catch(err){
    console.error('Error deleting products:', err && err.message || err);
    try{ await sequelize.close(); }catch(_){}
    process.exit(1);
  }
})();
