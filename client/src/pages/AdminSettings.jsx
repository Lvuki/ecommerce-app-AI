import React, { useEffect, useState } from 'react';
import { isAdmin } from '../services/authService';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';

export default function AdminSettings() {
  const navigate = useNavigate();
  useEffect(() => { if (!isAdmin()) navigate('/login'); }, [navigate]);

  const [settings, setSettings] = useState({
    siteTitle: '',
    supportEmail: '',
    exchange_rate_eur: '100', // Default
    exchange_rate_usd: '95',  // Default
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Fetch settings from API
    async function load() {
      try {
        const res = await fetch(`${API_BASE_URL}/settings`);
        if (res.ok) {
          const data = await res.json();
          setSettings(prev => ({ ...prev, ...data }));
        }
      } catch (err) {
        console.error('Failed to load settings', err);
      }
    }
    load();
  }, []);

  const handleChange = (key, val) => {
    setSettings(prev => ({ ...prev, [key]: val }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setMessage('Settings saved successfully.');
      } else {
        setMessage('Failed to save settings.');
      }
    } catch (err) {
      setMessage('Error saving settings');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div>
      <h2>Settings</h2>
      <p style={{ color: '#666' }}>Manage site-wide settings and exchange rates.</p>
      <form onSubmit={handleSave} style={{ maxWidth: 720, display: 'grid', gap: 16 }}>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontWeight: 700 }}>Site title</label>
          <input value={settings.siteTitle} onChange={(e) => handleChange('siteTitle', e.target.value)} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontWeight: 700 }}>Support email</label>
          <input value={settings.supportEmail} onChange={(e) => handleChange('supportEmail', e.target.value)} />
        </div>

        <h3 style={{ marginTop: 16, marginBottom: 8, borderBottom: '1px solid #eee', paddingBottom: 4 }}>Exchange Rates (Base: ALL)</h3>
        <p style={{ fontSize: 13, color: '#666', marginTop: 0 }}>Enter the value of 1 unit in ALL (e.g. 1 EUR = 100 ALL).</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontWeight: 700 }}>EUR Rate (1€ = ? L)</label>
            <input
              type="number"
              step="0.01"
              value={settings.exchange_rate_eur}
              onChange={(e) => handleChange('exchange_rate_eur', e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontWeight: 700 }}>USD Rate (1$ = ? L)</label>
            <input
              type="number"
              step="0.01"
              value={settings.exchange_rate_usd}
              onChange={(e) => handleChange('exchange_rate_usd', e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 16 }}>
          <button type="submit" disabled={saving} style={{ padding: '8px 16px', background: '#0b74de', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
          {message && <div style={{ color: message.includes('Failed') ? 'red' : 'green' }}>{message}</div>}
        </div>
      </form>
    </div>
  );
}
