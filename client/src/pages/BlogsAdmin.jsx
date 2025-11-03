import React, { useEffect, useState } from 'react';
import { getPosts, addPost, updatePost, deletePost } from '../services/blogService';
import { getBlogCategories, addBlogCategory, updateBlogCategory, deleteBlogCategory } from '../services/blogCategoryService';
import { isAdmin } from '../services/authService';
import { useNavigate } from 'react-router-dom';

export default function BlogsAdmin() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [showCategoriesPanel, setShowCategoriesPanel] = useState(false);
  const [catForm, setCatForm] = useState({ id: null, name: '', description: '', imageFile: null, image: '', parentId: '' });
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
  const cats = await getBlogCategories();
  setCategories(cats || []);
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
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={startAdd}>Add Blog Post</button>
          <button onClick={async () => { setShowCategoriesPanel(s => !s); setCatForm({ id: null, name: '', description: '', imageFile: null, image: '', parentId: '' }); setCategories(await getBlogCategories()); }}>{showCategoriesPanel ? 'Close Categories' : 'Manage Categories'}</button>
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
              <label style={{ fontSize: 13, color: '#444' }}>Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="">— none —</option>
                {/** build recursive options */}
                {categories.map(cat => {
                  const renderOpts = (node, prefix = '') => {
                    const opts = [];
                    opts.push(<option key={node.id} value={node.name}>{prefix + node.name}</option>);
                    if (Array.isArray(node.subcategories) && node.subcategories.length) {
                      node.subcategories.forEach(child => {
                        opts.push(...renderOpts(child, prefix + '-- '));
                      });
                    }
                    return opts;
                  };
                  return renderOpts(cat);
                })}
              </select>
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
        {/* Blog categories management modal (admin only) */}
        {showCategoriesPanel ? (
          <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', zIndex: 90 }}>
            <div style={{ width: '92%', maxWidth: 1000, maxHeight: '90vh', overflow: 'auto', background: '#fff', padding: 18, borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>Manage Blog Categories</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setShowCategoriesPanel(false); setCatForm({ id: null, name: '', description: '', imageFile: null, image: '', parentId: '' }); }}>Close</button>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                {(() => {
                  const renderNode = (node, depth = 0) => (
                    <div key={node.id} style={{ border: '1px solid #eee', padding: 12, borderRadius: 8, marginLeft: depth ? (24 * depth) : 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 84, height: 64, background: '#fafafa', borderRadius: 6, overflow: 'hidden' }}>
                          {node.image ? <img src={node.image.startsWith('http') ? node.image : `http://localhost:4000${node.image}`} alt={node.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ padding: 8, color: '#888' }}>No image</div>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700 }}>{node.name}</div>
                          <div style={{ color: '#666' }}>{node.description}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => setCatForm({ id: node.id, name: node.name || '', description: node.description || '', imageFile: null, image: node.image || '', parentId: node.parentId || '' })}>Edit</button>
                          <button onClick={async () => { if (!window.confirm('Delete this category?')) return; await deleteBlogCategory(node.id); setCategories(await getBlogCategories()); }} style={{ color: 'red' }}>Delete</button>
                        </div>
                      </div>
                      {Array.isArray(node.subcategories) && node.subcategories.length > 0 ? (
                        <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
                          {node.subcategories.map(child => renderNode(child, depth + 1))}
                        </div>
                      ) : null}
                    </div>
                  );

                  return categories.map(c => renderNode(c, 0));
                })()}

                <div style={{ border: '1px dashed #ddd', padding: 12, borderRadius: 8 }}>
                  <h4>{catForm.id ? 'Edit Category' : 'Add Category'}</h4>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const fd = new FormData();
                    fd.append('name', catForm.name);
                    fd.append('description', catForm.description);
                    if (catForm.imageFile) fd.append('image', catForm.imageFile);
                    if (catForm.parentId) fd.append('parentId', catForm.parentId);
                    if (catForm.id) {
                      await updateBlogCategory(catForm.id, fd);
                    } else {
                      await addBlogCategory(fd);
                    }
                    setCategories(await getBlogCategories());
                    setCatForm({ id: null, name: '', description: '', imageFile: null, image: '', parentId: '' });
                  }} style={{ display: 'grid', gap: 8 }}>
                    <input placeholder="Name" value={catForm.name} required onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} />
                    <textarea placeholder="Description" value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} rows={3} />
                    <label style={{ fontSize: 13, color: '#444' }}>Parent category (optional)</label>
                    <select value={catForm.parentId || ''} onChange={(e) => setCatForm({ ...catForm, parentId: e.target.value || '' })}>
                      <option value="">— none —</option>
                      {categories.map(cat => {
                        const renderOpts = (node, prefix = '') => {
                          const opts = [];
                          opts.push(<option key={node.id} value={node.id}>{prefix + node.name}</option>);
                          if (Array.isArray(node.subcategories) && node.subcategories.length) {
                            node.subcategories.forEach(child => {
                              opts.push(...renderOpts(child, prefix + '-- '));
                            });
                          }
                          return opts;
                        };
                        return renderOpts(cat);
                      })}
                    </select>
                    <input type="file" accept="image/*" onChange={(e) => setCatForm({ ...catForm, imageFile: e.target.files?.[0] || null })} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="submit">Save</button>
                      <button type="button" onClick={() => setCatForm({ id: null, name: '', description: '', imageFile: null, image: '', parentId: '' })}>Reset</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        ) : null}
    </div>
  );
}
