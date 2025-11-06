import API_BASE_URL from '../config';
import { getToken } from './authService';
import { getCart } from './cartService';

const WISHLIST_KEY = 'wishlist';

function readLocal() {
  try { return JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]'); } catch (_) { return []; }
}

function writeLocal(list) {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
  try { window.dispatchEvent(new CustomEvent('wishlistUpdated', { detail: { items: list } })); } catch (_) {}
}

export async function getWishlist() {
  const token = getToken();
  if (!token) return readLocal();
  const res = await fetch(`${API_BASE_URL}/wishlist`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return [];
  const data = await res.json();
  const mapped = (data.items || []).map(i => ({ id: i.productId, name: i.name, image: i.image, price: i.price }));
  try { window.dispatchEvent(new CustomEvent('wishlistUpdated', { detail: { items: mapped } })); } catch (_) {}
  return mapped;
}

export function getCount() {
  const token = getToken();
  if (!token) return readLocal().length;
  // when logged in, client should call getWishlist
  return 0;
}

export async function addItem(product) {
  const token = getToken();
  if (!token) {
    const list = readLocal();
    if (!list.find(i => String(i.id) === String(product.id))) {
      list.push({ id: product.id, name: product.name, image: product.image, price: product.price });
      writeLocal(list);
    }
    return list;
  }
  const res = await fetch(`${API_BASE_URL}/wishlist/items`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ productId: product.id }) });
  if (!res.ok) throw new Error('Failed to add wishlist item');
  const data = await res.json();
  const mapped = (data.items || []).map(i => ({ id: i.productId, name: i.name, image: i.image, price: i.price }));
  try { window.dispatchEvent(new CustomEvent('wishlistUpdated', { detail: { items: mapped } })); } catch (_) {}
  return mapped;
}

export async function removeItem(productOrItemId) {
  const token = getToken();
  if (!token) {
    const id = productOrItemId && productOrItemId.id ? productOrItemId.id : productOrItemId;
    const list = readLocal().filter(i => String(i.id) !== String(id));
    writeLocal(list);
    return list;
  }
  // server expects wishlist item id when deleting; to simplify, fetch wishlist and find by productId
  const wl = await fetch(`${API_BASE_URL}/wishlist`, { headers: { Authorization: `Bearer ${token}` } });
  if (!wl.ok) throw new Error('Failed to query wishlist');
  const data = await wl.json();
  const item = (data.items || []).find(i => String(i.productId) === String(productOrItemId) || String(i.productId) === String((productOrItemId && productOrItemId.id)));
  if (!item) return (data.items || []);
  const res = await fetch(`${API_BASE_URL}/wishlist/items/${item.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Failed to remove wishlist item');
  const out = await res.json();
  const mapped = (out.items || []).map(i => ({ id: i.productId, name: i.name, image: i.image, price: i.price }));
  try { window.dispatchEvent(new CustomEvent('wishlistUpdated', { detail: { items: mapped } })); } catch (_) {}
  return mapped;
}

export async function toggleItem(product) {
  const token = getToken();
  if (!token) {
    const list = readLocal();
    const idx = list.findIndex(i => String(i.id) === String(product.id));
    if (idx >= 0) {
      list.splice(idx, 1);
    } else {
      list.push({ id: product.id, name: product.name, image: product.image, price: product.price });
    }
    writeLocal(list);
    return list;
  }
  const res = await fetch(`${API_BASE_URL}/wishlist/toggle`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ productId: product.id }) });
  if (!res.ok) throw new Error('Failed to toggle wishlist item');
  const data = await res.json();
  const mapped = (data.items || []).map(i => ({ id: i.productId, name: i.name, image: i.image, price: i.price }));
  try { window.dispatchEvent(new CustomEvent('wishlistUpdated', { detail: { items: mapped } })); } catch (_) {}
  return mapped;
}

const wishlistService = { getWishlist, getCount, addItem, removeItem, toggleItem };
export default wishlistService;
