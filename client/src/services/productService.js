import API_BASE_URL from "../config";
import { getToken } from "./authService";

export async function getProducts() {
  const res = await fetch(`${API_BASE_URL}/products`);
  return res.json();
}

export async function getProductById(id) {
  const res = await fetch(`${API_BASE_URL}/products/${id}`);
  return res.json();
}

export async function getCategoriesAndBrands() {
  const res = await fetch(`${API_BASE_URL}/products/categories/list`);
  return res.json();
}

export async function searchProducts(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.append(k, v);
  });
  const res = await fetch(`${API_BASE_URL}/products?${qs.toString()}`);
  if (!res.ok) {
    let err = 'Failed to load products';
    try { const body = await res.json(); if (body && (body.error || body.message)) err = body.error || body.message; } catch (_) {}
    throw new Error(err);
  }
  return res.json();
}

export async function addProduct(productData) {
  const token = getToken();
  const form = new FormData();
  Object.entries(productData).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    // If it's a FileList or array of files, append each file as 'images'
    if ((value instanceof FileList) || (Array.isArray(value) && value.length && value[0] instanceof File)) {
      for (const f of value) form.append('images', f);
      return;
    }
    form.append(key, value);
  });
  const res = await fetch(`${API_BASE_URL}/products`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });
  return res.json();
}

export async function updateProduct(id, productData) {
  const token = getToken();
  const form = new FormData();
  Object.entries(productData).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if ((value instanceof FileList) || (Array.isArray(value) && value.length && value[0] instanceof File)) {
      for (const f of value) form.append('images', f);
      return;
    }
    form.append(key, value);
  });
  const res = await fetch(`${API_BASE_URL}/products/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });
  return res.json();
}

export async function deleteProduct(id) {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/products/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.json();
}

export async function rateProduct(id, value) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE_URL}/products/${id}/rate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ value }),
  });
  return res.json();
}
