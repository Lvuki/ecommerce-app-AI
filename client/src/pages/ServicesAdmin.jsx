import React, { useEffect, useState } from 'react';
import { isAdmin, getToken } from '../services/authService';
import { useNavigate } from 'react-router-dom';
import { listServices, addService, updateService, deleteService } from '../services/serviceService';

export default function ServicesAdmin() {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ id: null, name: '', description: '', price: '' });

  useEffect(() => {
    if (!isAdmin()) navigate('/login');
    (async () => { setServices(await listServices()); })();
  }, [navigate]);

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = { name: form.name, description: form.description, price: Number(form.price || 0) };
    if (form.id) {
      await updateService(form.id, payload);
      setServices(await listServices());
    } else {
      await addService(payload);
      setServices(await listServices());
    }
    setShowForm(false);
    setForm({ id: null, name: '', description: '', price: '' });
  };

  const handleEdit = (s) => { setForm({ id: s.id, name: s.name || '', description: s.description || '', price: s.price || 0 }); setShowForm(true); };
  const handleDelete = async (id) => { if (!window.confirm('Delete this service?')) return; await deleteService(id); setServices(await listServices()); };

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Services</h2>
        <div>
          <button onClick={() => { setShowForm(true); setForm({ id: null, name: '', description: '', price: '' }); }}>Add Service</button>
        </div>
      </div>

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
          <div style={{ width: 600, background: '#fff', padding: 18, borderRadius: 8 }}>
            <h3>{form.id ? 'Edit Service' : 'Add Service'}</h3>
            <form onSubmit={handleSave} style={{ display: 'grid', gap: 8 }}>
              <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} />
              <input type="number" step="0.01" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit">Save</button>
                <button type="button" onClick={() => { setShowForm(false); setForm({ id: null, name: '', description: '', price: '' }); }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
              <th style={{ padding: 8 }}>Name</th>
              <th style={{ padding: 8 }}>Description</th>
              <th style={{ padding: 8 }}>Price</th>
              <th style={{ padding: 8 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {services.map(s => (
              <tr key={s.id} style={{ borderBottom: '1px solid #f3f3f3' }}>
                <td style={{ padding: 8 }}>{s.name}</td>
                <td style={{ padding: 8 }}>{s.description}</td>
                <td style={{ padding: 8 }}>${Number(s.price || 0).toFixed(2)}</td>
                <td style={{ padding: 8 }}>
                  <button onClick={() => handleEdit(s)}>Edit</button>
                  <button onClick={() => handleDelete(s.id)} style={{ color: 'red' }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
