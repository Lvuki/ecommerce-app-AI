import API_BASE_URL from '../config';
import { getToken } from './authService';

export async function getBlogCategories() {
  const res = await fetch(`${API_BASE_URL}/blogcategories`);
  return res.json();
}

export async function getBlogCategoryById(id) {
  const res = await fetch(`${API_BASE_URL}/blogcategories/${id}`);
  return res.json();
}

export async function addBlogCategory(fd) {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/blogcategories`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: fd,
  });
  return res.json();
}

export async function updateBlogCategory(id, fd) {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/blogcategories/${id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: fd,
  });
  return res.json();
}

export async function deleteBlogCategory(id) {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/blogcategories/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.json();
}

export default { getBlogCategories, getBlogCategoryById, addBlogCategory, updateBlogCategory, deleteBlogCategory };