import API_BASE_URL from '../config';

export async function getPublicPages() {
  const res = await fetch(`${API_BASE_URL}/pages`);
  return res.json();
}

export async function getPageBySlug(slug) {
  const res = await fetch(`${API_BASE_URL}/pages/slug/${encodeURIComponent(slug)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch page');
  return res.json();
}

export async function getAllPagesAdmin(token) {
  const res = await fetch(`${API_BASE_URL}/pages/admin/all`, {
    headers: { Authorization: token ? `Bearer ${token}` : '' }
  });
  return res.json();
}

export async function addPage(payload, token) {
  const res = await fetch(`${API_BASE_URL}/pages/admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function updatePage(id, payload, token) {
  const res = await fetch(`${API_BASE_URL}/pages/admin/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function deletePage(id, token) {
  const res = await fetch(`${API_BASE_URL}/pages/admin/${id}`, {
    method: 'DELETE',
    headers: { Authorization: token ? `Bearer ${token}` : '' }
  });
  return res.json();
}

const pageService = { getPublicPages, getPageBySlug, getAllPagesAdmin, addPage, updatePage, deletePage };
export default pageService;
