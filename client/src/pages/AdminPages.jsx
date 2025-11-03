import React, { useEffect, useState } from 'react';
import { getToken } from '../services/authService';
import { getAllPagesAdmin, addPage, updatePage, deletePage } from '../services/pageService';

export default function AdminPages() {
  const [pages, setPages] = useState([]);
  const [form, setForm] = useState({ title: '', slug: '', type: 'custom', content: '', order: 0, visible: true });
  const [editId, setEditId] = useState(null);

  const load = async () => {
    try {
      const token = getToken();
      const data = await getAllPagesAdmin(token);
      setPages(data || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const token = getToken();
  const payload = { ...form };
  if (payload.slug && typeof payload.slug === 'string') payload.slug = payload.slug.trim();
      // try parse content if JSON-like
      try { payload.content = JSON.parse(form.content); } catch (_) { payload.content = form.content; }
      if (editId) {
        await updatePage(editId, payload, token);
      } else {
        await addPage(payload, token);
      }
      setForm({ title: '', slug: '', type: 'custom', content: '', order: 0, visible: true });
      setEditId(null);
      await load();
    } catch (err) { console.error(err); alert('Failed to save page'); }
  };

  const handleEdit = (p) => {
    setEditId(p.id);
    setForm({ title: p.title || '', slug: p.slug || '', type: p.type || 'custom', content: typeof p.content === 'object' ? JSON.stringify(p.content, null, 2) : (p.content || ''), order: p.order || 0, visible: !!p.visible });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this page?')) return;
    try { await deletePage(id, getToken()); await load(); } catch (err) { console.error(err); alert('Failed to delete'); }
  };

  return (
    <div>
      <h2>Pages</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 18 }}>
        <div>
          <div style={{ display: 'grid', gap: 8 }}>
            {pages.map(p => (
              <div key={p.id} style={{ padding: 12, border: '1px solid #eee', borderRadius: 8, background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{p.title}</div>
                  <div style={{ fontSize: 13, color: '#666' }}>/{p.slug} • {p.type} • {p.visible ? 'visible' : 'hidden'}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => handleEdit(p)}>Edit</button>
                  <button onClick={() => handleDelete(p.id)} style={{ color: 'red' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: 12, border: '1px solid #eee', borderRadius: 8, background: '#fff' }}>
          <h3 style={{ marginTop: 0 }}>{editId ? 'Edit page' : 'Add page'}</h3>
          <form onSubmit={handleSave} style={{ display: 'grid', gap: 8 }}>
            <input placeholder="Title" value={form.title} required onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <input placeholder="Slug (url-friendly) e.g. about-us" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="custom">Custom</option>
              <option value="products">Products</option>
              <option value="blogs">Blogs</option>
              <option value="slider">Slider</option>
            </select>
            <label style={{ fontSize: 13, color: '#444' }}>Content (JSON or free text)
              <textarea rows={6} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            </label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value || 0) })} style={{ width: 120 }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={form.visible} onChange={(e) => setForm({ ...form, visible: e.target.checked })} /> Visible</label>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit">Save</button>
              <button type="button" onClick={() => { setEditId(null); setForm({ title: '', slug: '', type: 'custom', content: '', order: 0, visible: true }); }}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
