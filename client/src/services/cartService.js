import API_BASE_URL from '../config';
import { getToken } from './authService';

const CART_KEY = 'cart';

function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

function writeLocal(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  try { window.dispatchEvent(new Event('storage')); } catch (_) {}
}

export async function getCart() {
  const token = getToken();
  if (!token) return readLocal();
  const res = await fetch(`${API_BASE_URL}/cart`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return [];
  const data = await res.json();
  const mapped = data.items.map(i => ({ id: i.productId, name: i.name, image: i.image, price: i.price, qty: i.qty }));
  try { window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { items: mapped } })); } catch (_) {}
  return mapped;
}

export function getCount() {
  const token = getToken();
  if (!token) {
    const cart = readLocal();
    return cart.reduce((s, it) => s + (it.qty || 0), 0);
  }
  // when logged in, client should fetch cart via getCart and derive count; return 0 for sync usage
  return 0;
}

export async function addItem(item, qty = 1) {
  const token = getToken();
  if (!token) {
    const cart = readLocal();
    const idx = cart.findIndex((c) => String(c.id) === String(item.id));
    if (idx >= 0) cart[idx].qty = (cart[idx].qty || 0) + qty;
    else cart.push({ ...item, qty });
    writeLocal(cart);
    return cart;
  }
  const res = await fetch(`${API_BASE_URL}/cart/items`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ productId: item.id, quantity: qty })
  });
  if (!res.ok) throw new Error('Failed to add item');
  const data = await res.json();
  const mapped = data.items.map(i => ({ id: i.productId, name: i.name, image: i.image, price: i.price, qty: i.qty }));
  try { window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { items: mapped } })); } catch (_) {}
  return mapped;
}

export async function updateQty(id, qty) {
  const token = getToken();
  if (!token) {
    const cart = readLocal();
    const idx = cart.findIndex((c) => String(c.id) === String(id));
    if (idx >= 0) {
      if (qty <= 0) cart.splice(idx, 1); else cart[idx].qty = qty;
      writeLocal(cart);
    }
    return cart;
  }
  // Need to map product id to orderItem id on server; client doesn't know orderItem id. For simplicity, call addItem with negative delta or a special endpoint is required.
  // We'll call server to fetch cart, find item with productId and update by its orderItem id.
  const cart = await getCartFull();
  const item = cart.items.find(i => i.productId === Number(id) || String(i.productId) === String(id));
  if (!item) throw new Error('Item not found in server cart');
  const res = await fetch(`${API_BASE_URL}/cart/items/${item.id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ quantity: qty })
  });
  if (!res.ok) throw new Error('Failed to update item');
  const data = await res.json();
  const mapped = data.items.map(i => ({ id: i.productId, name: i.name, image: i.image, price: i.price, qty: i.qty }));
  try { window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { items: mapped } })); } catch (_) {}
  return mapped;
}

export async function removeItem(id) {
  const token = getToken();
  if (!token) {
    const cart = readLocal().filter((c) => String(c.id) !== String(id));
    writeLocal(cart);
    return cart;
  }
  const cartFull = await getCartFull();
  const item = cartFull.items.find(i => i.productId === Number(id) || String(i.productId) === String(id));
  if (!item) throw new Error('Item not found');
  const res = await fetch(`${API_BASE_URL}/cart/items/${item.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Failed to remove item');
  const data = await res.json();
  const mapped = data.items.map(i => ({ id: i.productId, name: i.name, image: i.image, price: i.price, qty: i.qty }));
  try { window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { items: mapped } })); } catch (_) {}
  return mapped;
}

export async function clearCart() {
  const token = getToken();
  if (!token) { writeLocal([]); return []; }
  const res = await fetch(`${API_BASE_URL}/cart/clear`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Failed to clear cart');
  try { window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { items: [] } })); } catch (_) {}
  return [];
}

// helper to fetch full cart including orderItem ids
async function getCartFull() {
  const token = getToken();
  if (!token) return { items: [] };
  const res = await fetch(`${API_BASE_URL}/cart`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return { items: [] };
  return await res.json();
}

export default { getCart, getCount, addItem, updateQty, removeItem, clearCart };
