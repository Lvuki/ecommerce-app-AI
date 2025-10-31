import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getPosts, deletePost, addPost, updatePost } from '../services/blogService';
import { isAdmin } from '../services/authService';

export default function BlogsPage() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    getPosts().then(p => setPosts(p || []));
  }, []);

  const navigate = useNavigate();
  const admin = isAdmin();

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this post?')) return;
    await deletePost(id);
    setPosts(await getPosts());
  };

  // modal state for add/edit on this page
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ id: null, title: '', excerpt: '', content: '', category: '', image: '', imageFile: null });

  const openAdd = () => {
    setForm({ id: null, title: '', excerpt: '', content: '', category: '', image: '', imageFile: null });
    setShowForm(true);
  };

  const openEdit = (post) => {
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
    setPosts(await getPosts());
    setShowForm(false);
  };

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Blog</h1>
        {admin ? <button onClick={openAdd}>Add Blog Post</button> : null}
      </div>
      <div className="responsive-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {posts.map(post => (
          <div key={post.id} style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
            {post.image ? <img src={post.image} alt={post.title} style={{ width: '100%', height: 160, objectFit: 'cover' }} /> : <div style={{ height: 160, background: '#fafafa' }} />}
            <div style={{ padding: 12 }}>
              <div style={{ fontWeight: 700 }}>{post.title}</div>
              <div style={{ color: '#666', fontSize: 13 }}>{post.category} • {new Date(post.createdAt).toLocaleDateString()}</div>
              <div style={{ marginTop: 8 }}>{post.excerpt}</div>
              <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                <Link to={`/blogs/${post.id}`}><button>Read more</button></Link>
                {admin ? (
                  <>
                    <button onClick={() => openEdit(post)}>Edit</button>
                    <button onClick={() => handleDelete(post.id)} style={{ color: 'red' }}>Delete</button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', zIndex: 90 }}>
          <div style={{ width: '90%', maxWidth: 700, background: '#fff', padding: 16, borderRadius: 8 }}>
            <h3>{form.id ? 'Edit Blog' : 'New Blog'}</h3>
            <form onSubmit={submit} style={{ display: 'grid', gap: 8 }}>
              <input placeholder='Title' value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <input placeholder='Category' value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              <input type='file' accept='image/*' onChange={(e) => setForm({ ...form, imageFile: e.target.files?.[0] || null })} />
              {form.image && !form.imageFile ? <div style={{ marginTop: 8 }}><img src={form.image.startsWith('http') ? form.image : `http://localhost:4000${form.image}`} alt='blog' style={{ maxHeight: 120 }} /></div> : null}
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
