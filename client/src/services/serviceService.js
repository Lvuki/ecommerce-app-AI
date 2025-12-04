import API_BASE_URL from '../config';
import { getToken } from './authService';

export async function listServices() {
  const res = await fetch(`${API_BASE_URL}/services`);
  if (!res.ok) return [];
  return await res.json();
}

export async function getService(id) {
  const res = await fetch(`${API_BASE_URL}/services/${id}`);
  if (!res.ok) return null;
  return await res.json();
}

export async function addService(payload) {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/services`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
  return await res.json();
}

export async function updateService(id, payload) {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/services/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
  return await res.json();
}

export async function deleteService(id) {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/services/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  return await res.json();
}

const svc = { listServices, getService, addService, updateService, deleteService };
export default svc;
