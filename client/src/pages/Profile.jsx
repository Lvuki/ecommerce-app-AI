import React, { useEffect, useState } from 'react';
import API_BASE_URL from '../config';
import { getToken } from '../services/authService';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    const token = getToken();
    // Try to fetch user using stored token (if any). Also include credentials so the server-side HttpOnly cookie can be used as a fallback.
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API_BASE_URL}/users/me`, { headers, credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setUser(data);
      setName(data.name || '');
      setSurname(data.surname || '');
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const token = getToken();
      const fd = new FormData();
      fd.append('name', name);
      fd.append('surname', surname);
      if (file) fd.append('profileImage', file);

      const res = await fetch(`${API_BASE_URL}/users/me`, {
        method: 'PUT',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
        credentials: 'include',
      });

      if (!res.ok) {
        const err = await res.json();
        setMessage(err.message || 'Failed to save');
      } else {
        const updated = await res.json();
        setUser(updated);
        setMessage('Profile saved');
        setFile(null);
      }
    } catch (err) {
      console.error(err);
      setMessage('Error saving profile');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-container" style={{ padding: 20 }}>
      <h2>My profile</h2>
      {user ? (
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20 }}>
          <div>
            <div style={{ width: 200, height: 200, borderRadius: 8, overflow: 'hidden', background: '#f3f3f3' }}>
              {user.profileImage ? (
                <img src={user.profileImage.startsWith('http') ? user.profileImage : `http://localhost:4000${user.profileImage}`} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ padding: 16, color: '#666' }}>{(user.name || '').charAt(0).toUpperCase()}</div>
              )}
            </div>
          </div>

          <div>
            <form onSubmit={handleSave} style={{ display: 'grid', gap: 12, maxWidth: 640 }}>
              <label>
                First name
                <input value={name} onChange={(e) => setName(e.target.value)} />
              </label>

              <label>
                Surname
                <input value={surname} onChange={(e) => setSurname(e.target.value)} />
              </label>

              <label>
                Change profile picture
                <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </label>

              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                <button type="button" onClick={fetchProfile}>Reload</button>
              </div>

              {message ? <div style={{ marginTop: 8 }}>{message}</div> : null}
            </form>

            <div style={{ marginTop: 24 }}>
              <h4>Account</h4>
              <div><strong>Email:</strong> {user.email}</div>
              <div><strong>Role:</strong> {user.role}</div>
            </div>
          </div>
        </div>
      ) : (
        <div>Please log in to view your profile.</div>
      )}
    </div>
  );
}
