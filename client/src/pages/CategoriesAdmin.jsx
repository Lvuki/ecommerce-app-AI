import React, { useEffect, useState } from 'react';
import { getCategories, addCategory, updateCategory, deleteCategory } from '../services/categoryService';
import { isAdmin, getToken } from '../services/authService';

export default function CategoriesAdmin() {
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', imageFile: null, image: '' });
  const [editId, setEditId] = useState(null);
  const admin = isAdmin();

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  const openAdd = () => {
    setEditId(null);
    setForm({ name: '', description: '', imageFile: null, image: '' });
    setShowForm(true);
  };

  const openEdit = (cat) => {
    setEditId(cat.id);
    setForm({ name: cat.name || '', description: cat.description || '', imageFile: null, image: cat.image || '' });
    setShowForm(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('description', form.description);
    if (form.imageFile) fd.append('image', form.imageFile);
    if (editId) await updateCategory(editId, fd); else await addCategory(fd);
    setCategories(await getCategories());
    setShowForm(false);
  };

  const remove = async (id) => {
    if (!confirm('Delete this category?')) return;
    await deleteCategory(id);
    setCategories(await getCategories());
  };

  if (!admin) return <div style={{ padding: 20 }}>Admin only</div>;

  return (
    <div className="page-container" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Categories</h2>
        <button onClick={openAdd}>Add Category</button>
      </div>

      <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
        {categories.map(c => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, border: '1px solid #eee', padding: 12, borderRadius: 8 }}>
            <div style={{ width: 84, height: 64, background: '#fafafa', borderRadius: 6, overflow: 'hidden' }}>
              {c.image ? <img src={c.image.startsWith('http') ? c.image : `http://localhost:4000${c.image}`} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ padding: 8, color: '#888' }}>No image</div>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{c.name}</div>
              <div style={{ color: '#666' }}>{c.description}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => openEdit(c)}>Edit</button>
              <button onClick={() => remove(c.id)} style={{ color: 'red' }}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
          <div style={{ width: '90%', maxWidth: 700, background: '#fff', padding: 16, borderRadius: 8 }}>
            <h3>{editId ? 'Edit Category' : 'New Category'}</h3>
            <form onSubmit={submit} style={{ display: 'grid', gap: 8 }}>
              <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} />
              <input type="file" accept="image/*" onChange={(e) => setForm({ ...form, imageFile: e.target.files?.[0] || null })} />
              {form.image && !form.imageFile ? <div style={{ marginTop: 8 }}><img src={form.image} alt="preview" style={{ maxHeight: 120 }} /></div> : null}
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit">Save</button>
                <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
