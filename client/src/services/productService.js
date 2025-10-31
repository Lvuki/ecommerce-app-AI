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
  return res.json();
}

export async function addProduct(productData) {
  const token = getToken();
  const form = new FormData();
  Object.entries(productData).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
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
    if (value !== undefined && value !== null) {
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
