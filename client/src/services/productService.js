import API_BASE_URL from "../config";
import { getToken } from "./authService";
import filterService from './filterService';

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

// Get categories and brands, optionally scoped to a category name
export async function getCategoriesAndBrandsScoped(category, debug = false) {
  const qs = new URLSearchParams();
  if (category) qs.set('category', category);
  if (debug) qs.set('debug', '1');
  const res = await fetch(`${API_BASE_URL}/products/categories/list${qs.toString() ? `?${qs.toString()}` : ''}`);
  return res.json();
}

export async function searchProducts(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    // If value is an array, append each element separately (brand[]=a&brand[]=b style)
    if (Array.isArray(v)) {
      v.forEach(item => { if (item !== undefined && item !== null && item !== '') qs.append(k, item); });
    } else {
      qs.append(k, v);
    }
  });
  const url = `${API_BASE_URL}/products?${qs.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    let err = 'Failed to load products';
    try { const body = await res.json(); if (body && (body.error || body.message)) err = body.error || body.message; } catch (_) {}
    throw new Error(err);
  }
  return res.json();
}

// Convenience: search using Filters component's filter object
export async function searchWithFilters(filters = {}) {
  const params = filterService.buildParams(filters || {});
  return searchProducts(params);
}

export async function addProduct(productData) {
  const token = getToken();
  const form = new FormData();
  Object.entries(productData).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    // If it's an array, it may contain File objects and/or existing URLs.
    if (Array.isArray(value)) {
      const files = value.filter(v => v instanceof File);
      const nonFiles = value.filter(v => !(v instanceof File));
      if (files.length) for (const f of files) form.append('images', f);
      if (nonFiles.length) form.append('existingImages', JSON.stringify(nonFiles));
      return;
    }

    // If it's a FileList, append each file
    if (value instanceof FileList) {
      for (const f of value) form.append('images', f);
      return;
    }

    // If it's a plain object (e.g., specs), stringify it
    if (typeof value === 'object' && !(value instanceof File)) {
      form.append(key, JSON.stringify(value));
    } else {
      form.append(key, value);
    }
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
    // If it's an array, it may contain File objects and/or existing URLs.
    if (Array.isArray(value)) {
      const files = value.filter(v => v instanceof File);
      const nonFiles = value.filter(v => !(v instanceof File));
      if (files.length) for (const f of files) form.append('images', f);
      if (nonFiles.length) form.append('existingImages', JSON.stringify(nonFiles));
      return;
    }

    if (value instanceof FileList) {
      for (const f of value) form.append('images', f);
      return;
    }

    if (typeof value === 'object' && !(value instanceof File)) {
      form.append(key, JSON.stringify(value));
    } else {
      form.append(key, value);
    }
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
