const CART_KEY = 'cart';

function read() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

function write(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  // trigger storage event for other tabs/components
  try {
    window.dispatchEvent(new Event('storage'));
  } catch (_) {}
}

export function getCart() {
  return read();
}

export function getCount() {
  const cart = read();
  return cart.reduce((s, it) => s + (it.qty || 0), 0);
}

export function addItem(item, qty = 1) {
  const cart = read();
  const idx = cart.findIndex((c) => String(c.id) === String(item.id));
  if (idx >= 0) {
    cart[idx].qty = (cart[idx].qty || 0) + qty;
  } else {
    cart.push({ ...item, qty });
  }
  write(cart);
  return cart;
}

export function updateQty(id, qty) {
  const cart = read();
  const idx = cart.findIndex((c) => String(c.id) === String(id));
  if (idx >= 0) {
    if (qty <= 0) cart.splice(idx, 1);
    else cart[idx].qty = qty;
    write(cart);
  }
  return cart;
}

export function removeItem(id) {
  const cart = read().filter((c) => String(c.id) !== String(id));
  write(cart);
  return cart;
}

export function clearCart() {
  write([]);
}

export default { getCart, getCount, addItem, updateQty, removeItem, clearCart };
