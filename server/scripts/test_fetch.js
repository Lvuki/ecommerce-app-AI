const fetch = require('node-fetch');
(async () => {
  try {
    const res = await fetch('http://localhost:4000/api/products?categoryId=444');
    const body = await res.text();
    console.log('status', res.status);
    console.log('body:', body.substring(0, 1000));
  } catch (e) {
    console.error('fetch error', e.message);
  }
})();
