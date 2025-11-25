#!/usr/bin/env node
require('dotenv').config();
const { sequelize, Product } = require('../models');
(async ()=>{
  try{
    await sequelize.authenticate();
    const rows = await Product.findAll({ order: [['updatedAt','DESC']], limit: 20 });
    console.log('Recent products count:', rows.length);
    rows.forEach(r=> console.log(r.id, r.sku, r.name, r.updatedAt));
    await sequelize.close();
    process.exit(0);
  }catch(err){ console.error(err); try{ await sequelize.close(); }catch(_){}; process.exit(1); }
})();
