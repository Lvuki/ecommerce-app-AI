#!/usr/bin/env node
require('dotenv').config();
const { sequelize, Product } = require('../models');
(async ()=>{
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
  try{
    await sequelize.authenticate();
    const rows = await Product.findAll({ where: { sku: skus } });
    console.log('Found rows:', rows.length);
    rows.forEach(r=> console.log(r.id, r.sku, r.name));
    await sequelize.close();
    process.exit(0);
  }catch(err){ console.error(err); try{ await sequelize.close(); }catch(_){}; process.exit(1); }
})();
