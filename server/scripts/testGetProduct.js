require('dotenv').config();
const { getProductById } = require('../controllers/productController');

// Minimal fake req/res to call controller.getProductById
function makeRes() {
  return {
    statusCode: 200,
    _json: null,
    status(code) { this.statusCode = code; return this; },
    json(obj) { this._json = obj; console.log('STATUS', this.statusCode); console.log(JSON.stringify(obj, null, 2)); }
  };
}

(async () => {
  const id = process.argv[2] || '8';
  const req = { params: { id } };
  const res = makeRes();
  try {
    await getProductById(req, res);
  } catch (err) {
    console.error('Controller threw:', err.message || err);
  }
})();
