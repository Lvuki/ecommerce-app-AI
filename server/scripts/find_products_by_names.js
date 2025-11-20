#!/usr/bin/env node
require('dotenv').config();
const { sequelize, Product } = require('../models');
(async ()=>{
  const names = [
    'Access Point Wireless TP-Link N-YL-WA801ND AM',
    'Adaptor Gembird Display to VGA',
    'Adaptor Ugreen USB-A to USB-C Grey',
    'Adaptor Bluetooth Ugreen USB',
    'Antene Netis Wireless N USB WF2119C',
    'Barcode Skaner Zebra DS2208-SR7U2100AZW',
    'Bokse BOSE Soundlink Micro Bluetooth Black',
    'Bokse BOSE Soundlink Micro Bluetooth Orange',
    'Bokse Pleomax 2.0 S-220BU',
    'Boje printeri Canon GI490 Magenta PK'
  ];
  try{
    await sequelize.authenticate();
    const rows = await Product.findAll({ where: { name: names } });
    console.log('Found rows by name:', rows.length);
    rows.forEach(r=> console.log(r.id, r.sku, r.name));
    await sequelize.close();
    process.exit(0);
  }catch(err){ console.error(err); try{ await sequelize.close(); }catch(_){}; process.exit(1); }
})();
