import API_BASE_URL from '../config';
import { getToken } from './authService';

export async function getCategories() {
  const res = await fetch(`${API_BASE_URL}/categories`);
  return res.json();
}

export async function getCategoryById(id) {
  const res = await fetch(`${API_BASE_URL}/categories/${id}`);
  return res.json();
}

export async function addCategory(fd) {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/categories`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: fd,
  });
  return res.json();
}

export async function updateCategory(id, fd) {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/categories/${id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: fd,
  });
  return res.json();
}

export async function deleteCategory(id) {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/categories/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.json();
}
