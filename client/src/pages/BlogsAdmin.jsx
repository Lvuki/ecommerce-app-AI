import React, { useEffect, useState } from 'react';
import { getPosts, addPost, updatePost, deletePost } from '../services/blogService';
import { isAdmin } from '../services/authService';
import { useNavigate } from 'react-router-dom';

export default function BlogsAdmin() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ id: null, title: '', excerpt: '', content: '', category: '', image: '', imageFile: null });
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/login');
      return;
    }
    load();
  }, [navigate]);

  const load = async () => {
    setLoading(true);
    const p = await getPosts();
    setPosts(p || []);
    setLoading(false);
  };

  const startAdd = () => {
    setForm({ id: null, title: '', excerpt: '', content: '', category: '', image: '', imageFile: null });
    setShowForm(true);
  };

  const startEdit = (post) => {
    setForm({ id: post.id, title: post.title, excerpt: post.excerpt, content: post.content, category: post.category, image: post.image, imageFile: null });
    setShowForm(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('title', form.title);
    fd.append('excerpt', form.excerpt);
    fd.append('content', form.content);
    fd.append('category', form.category);
    if (form.imageFile) fd.append('image', form.imageFile);
    if (form.id) await updatePost(form.id, fd);
    else await addPost(fd);
    await load();
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this post?')) return;
    await deletePost(id);
    await load();
  };

  if (loading) return <div style={{ padding: 16 }}>Loading...</div>;

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Manage Blogs</h2>
        <div>
          <button onClick={startAdd}>Add Blog Post</button>
        </div>
      </div>

  <div className="table-responsive">
  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
            <th style={{ padding: 8 }}>Image</th>
            <th style={{ padding: 8 }}>Title</th>
            <th style={{ padding: 8 }}>Category</th>
            <th style={{ padding: 8 }}>Date</th>
            <th style={{ padding: 8 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {posts.map(post => (
            <tr key={post.id} style={{ borderBottom: '1px solid #f3f3f3' }}>
              <td style={{ padding: 8 }}>{post.image ? <img src={post.image.startsWith('http') ? post.image : `http://localhost:4000${post.image}`} alt={post.title} style={{ height: 60, width: 100, objectFit: 'cover' }} /> : null}</td>
              <td style={{ padding: 8 }}>{post.title}</td>
              <td style={{ padding: 8 }}>{post.category}</td>
              <td style={{ padding: 8 }}>{new Date(post.createdAt).toLocaleDateString()}</td>
              <td style={{ padding: 8 }}>
                <button onClick={() => startEdit(post)}>Edit</button>
                <button onClick={() => handleDelete(post.id)} style={{ marginLeft: 8, color: 'red' }}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
  </table>
  </div>

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', zIndex: 90 }}>
          <div style={{ width: '90%', maxWidth: 700, background: '#fff', padding: 16, borderRadius: 8 }}>
            <h3>{form.id ? 'Edit Blog' : 'New Blog'}</h3>
            <form onSubmit={submit} style={{ display: 'grid', gap: 8 }}>
              <input placeholder='Title' value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <input placeholder='Category' value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              <input type='file' accept='image/*' onChange={(e) => setForm({ ...form, imageFile: e.target.files?.[0] || null })} />
              {form.image && !form.imageFile ? <div style={{ marginTop: 8 }}><img src={form.image} alt='blog' style={{ maxHeight: 120 }} /></div> : null}
              <input placeholder='Excerpt' value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
              <textarea placeholder='Content' rows={6} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button type='submit'>Save</button>
                <button type='button' onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
