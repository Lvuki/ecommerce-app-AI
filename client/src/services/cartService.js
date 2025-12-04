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
  // include services array if present
  const mappedWithServices = data.items.map(i => ({ id: i.productId, name: i.name, image: i.image, price: i.price, qty: i.qty, services: i.services || [] }));
  try { window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { items: mappedWithServices } })); } catch (_) {}
  return mappedWithServices;
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
    // consider services when deduping local cart entries: use item id + servicesIds signature
    const signature = (it) => `${String(it.id)}|${(Array.isArray(it.services) ? it.services.map(s => (s && (s.id || s)) || s).sort().join(',') : '')}`;
    const sig = signature(item);
    const idx = cart.findIndex((c) => signature(c) === sig);
    // compute services sum when services provided as objects with price
    let servicesSum = 0;
    let servicesList = [];
    if (Array.isArray(item.services) && item.services.length) {
      // if services are objects with price, use them; otherwise assume ids and leave sum 0
      if (typeof item.services[0] === 'object') {
        servicesList = item.services.map(s => ({ id: s.id, name: s.name, price: Number(s.price || 0) }));
        servicesSum = servicesList.reduce((s, it) => s + Number(it.price || 0), 0);
      } else {
        // services are ids; we could fetch prices here but skip for now (server will compute when authenticated)
        servicesList = item.services.slice();
      }
    }
    // per-item stored price should include product price + servicesSum
    const perItemPrice = Number(item.price || 0) + Number(servicesSum || 0);
    if (idx >= 0) {
      cart[idx].qty = (cart[idx].qty || 0) + qty;
    } else {
      cart.push({ ...item, qty, services: servicesList, price: perItemPrice });
    }
    writeLocal(cart);
    return cart;
  }
  const res = await fetch(`${API_BASE_URL}/cart/items`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ productId: item.id, quantity: qty, services: item.services || [] })
  });
  if (!res.ok) {
    let errMsg = 'Failed to add item';
    try { const body = await res.json(); if (body && (body.error || body.message)) errMsg = body.error || body.message; } catch (_) {}
    throw new Error(errMsg);
  }
  const data = await res.json();
  const mapped = data.items.map(i => ({ id: i.productId, name: i.name, image: i.image, price: i.price, qty: i.qty, services: i.services || [] }));
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
  const mapped = data.items.map(i => ({ id: i.productId, name: i.name, image: i.image, price: i.price, qty: i.qty, services: i.services || [] }));
  try { window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { items: mapped } })); } catch (_) {}
  return mapped;
}

export async function updateItemServices(itemOrProduct, newServices) {
  const token = getToken();
  // determine whether caller passed the full item object or just productId
  let productId = null;
  let originalServices = null;
  if (itemOrProduct && typeof itemOrProduct === 'object') {
    productId = itemOrProduct.id;
    originalServices = Array.isArray(itemOrProduct.services) ? itemOrProduct.services : null;
  } else {
    productId = itemOrProduct;
  }

  if (!token) {
    const cart = readLocal();
    // find index by productId and original services signature when available
    const idx = cart.findIndex((c) => {
      if (String(c.id) !== String(productId)) return false;
      if (!originalServices) return true;
      const a = JSON.stringify(c.services || []);
      const b = JSON.stringify(originalServices || []);
      return a === b;
    });
    if (idx >= 0) {
      const oldServices = Array.isArray(cart[idx].services) ? cart[idx].services : [];
      const oldServicesSum = oldServices.reduce((s, sv) => s + Number((sv && sv.price) || 0), 0);
      const productPrice = Number(cart[idx].price || 0) - oldServicesSum;
      let servicesList = [];
      let servicesSum = 0;
      if (Array.isArray(newServices) && newServices.length) {
        if (typeof newServices[0] === 'object') {
          servicesList = newServices.map(s => ({ id: s.id, name: s.name, price: Number(s.price || 0) }));
          servicesSum = servicesList.reduce((s, it) => s + Number(it.price || 0), 0);
        } else {
          servicesList = newServices.slice();
        }
      }
      cart[idx].services = servicesList;
      cart[idx].price = Number(productPrice) + Number(servicesSum || 0);
      writeLocal(cart);
    }
    try { window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { items: cart } })); } catch (_) {}
    return cart;
  }
  const cartFull = await getCartFull();
  // find the matching order item for this product; prefer matching services signature when originalServices available
  const item = cartFull.items.find(i => {
    if (!(i.productId === Number(productId) || String(i.productId) === String(productId))) return false;
    if (!originalServices) return true;
    return JSON.stringify(i.services || []) === JSON.stringify(originalServices || []);
  });
  if (!item) throw new Error('Item not found in server cart');
  const res = await fetch(`${API_BASE_URL}/cart/items/${item.id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ services: newServices })
  });
  if (!res.ok) {
    let errMsg = 'Failed to update item services';
    try { const body = await res.json(); if (body && (body.error || body.message)) errMsg = body.error || body.message; } catch (_) {}
    throw new Error(errMsg);
  }
  const data = await res.json();
  const mapped = data.items.map(i => ({ id: i.productId, name: i.name, image: i.image, price: i.price, qty: i.qty, services: i.services || [] }));
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
  const mapped = data.items.map(i => ({ id: i.productId, name: i.name, image: i.image, price: i.price, qty: i.qty, services: i.services || [] }));
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

const cartService = { getCart, getCount, addItem, updateQty, removeItem, clearCart };
export default cartService;
