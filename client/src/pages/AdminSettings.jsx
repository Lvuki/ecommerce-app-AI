import React, { useEffect, useState } from 'react';
import { isAdmin } from '../services/authService';
import { useNavigate } from 'react-router-dom';

export default function AdminSettings() {
  const navigate = useNavigate();
  useEffect(() => { if (!isAdmin()) navigate('/login'); }, [navigate]);

  // Simple local settings example — replace with API calls if you have a settings endpoint
  const [siteTitle, setSiteTitle] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // load from localStorage as a temporary store
    try {
      const raw = localStorage.getItem('admin_settings_v1');
      if (raw) {
        const s = JSON.parse(raw);
        setSiteTitle(s.siteTitle || '');
        setSupportEmail(s.supportEmail || '');
      }
    } catch (err) {
      // ignore
    }
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { siteTitle, supportEmail };
      // Persist locally for now. If you have a backend settings API, replace this with a fetch call.
      localStorage.setItem('admin_settings_v1', JSON.stringify(payload));
      setMessage('Settings saved (localStorage).');
    } catch (err) {
      setMessage('Failed to save settings');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div>
      <h2>Settings</h2>
      <p style={{ color: '#666' }}>Site-wide settings. Currently saved to localStorage — I can wire this to the server if you prefer persistent storage.</p>
      <form onSubmit={handleSave} style={{ maxWidth: 720, display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontWeight: 700 }}>Site title</label>
          <input value={siteTitle} onChange={(e) => setSiteTitle(e.target.value)} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontWeight: 700 }}>Support email</label>
          <input value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button type="submit" disabled={saving} style={{ padding: '8px 12px' }}>{saving ? 'Saving…' : 'Save settings'}</button>
          {message ? <div style={{ color: '#0b74de' }}>{message}</div> : null}
        </div>
      </form>
    </div>
  );
}
