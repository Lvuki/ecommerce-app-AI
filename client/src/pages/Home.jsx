import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getProducts } from "../services/productService";
import { getPosts, addPost, updatePost, deletePost } from "../services/blogService";
import { isAdmin } from "../services/authService";
import { addItem } from "../services/cartService";
import { getToken } from "../services/authService";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 5;
  const [slideIdx, setSlideIdx] = useState(0);
  const isLoggedIn = useMemo(() => !!getToken(), []);

  useEffect(() => {
    getProducts().then(setProducts);
  }, []);

  // Reset to first page if products list changes (e.g., after reload)
  useEffect(() => {
    setCurrentPage(1);
  }, [products.length]);

  useEffect(() => {
    const id = setInterval(() => setSlideIdx((i) => (i + 1) % Math.max(1, Math.min(5, products.length))), 4000);
    return () => clearInterval(id);
  }, [products.length]);

  const featured = products.slice(0, 5);
  const current = featured[slideIdx] || {};
  const [posts, setPosts] = useState([]);
  const [showBlogForm, setShowBlogForm] = useState(false);
  const [blogForm, setBlogForm] = useState({ title: '', excerpt: '', content: '', category: '', image: '', imageFile: null });
  const admin = isAdmin();

  useEffect(() => {
    getPosts().then((p) => setPosts(p || []));
  }, []);

  const submitBlog = async (e) => {
    e.preventDefault();
    // build FormData to support file upload
    const fd = new FormData();
    fd.append('title', blogForm.title);
    fd.append('excerpt', blogForm.excerpt);
    fd.append('content', blogForm.content);
    fd.append('category', blogForm.category);
    if (blogForm.imageFile) fd.append('image', blogForm.imageFile);
    if (blogForm.id) {
      await updatePost(blogForm.id, fd);
    } else {
      await addPost(fd);
    }
    setPosts(await getPosts());
    setShowBlogForm(false);
    setBlogForm({ title: '', excerpt: '', content: '', category: '', image: '', imageFile: null });
  };

  const removeBlog = async (id) => {
    await deletePost(id);
    setPosts(await getPosts());
  };

  return (
    <div className="page-container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>ShopApp</h1>
      </div>

  <div className="two-col" style={{ borderRadius: 12, background: "#f7f8fa", padding: 16, alignItems: "center", minHeight: 220 }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{current.name || "Featured product"}</div>
          <div style={{ marginTop: 6, color: "#444" }}>{current.brand || current.category || ""}</div>
          <div style={{ marginTop: 8, fontWeight: 700 }}>{current.price ? `$${current.price}` : ""}</div>
          <div style={{ marginTop: 12 }}>
            <Link to="/products" style={{ background: "#111", color: "#fff", padding: "8px 14px", borderRadius: 6, textDecoration: "none" }}>Shop now</Link>
          </div>
          <div style={{ marginTop: 10 }}>
            {featured.map((p, i) => (
              <span key={p.id || i} style={{ width: 8, height: 8, borderRadius: 999, background: i === slideIdx ? "#111" : "#bbb", display: "inline-block", marginRight: 6 }} />
            ))}
          </div>
        </div>
        <div>
          {current.image ? (
            <img src={current.image?.startsWith("http") ? current.image : `http://localhost:4000${current.image}`} alt={current.name} style={{ width: "100%", height: 220, objectFit: "cover", borderRadius: 10, background: "#fafafa" }} />
          ) : (
            <div style={{ width: "100%", height: 220, borderRadius: 10, background: "#fafafa" }} />
          )}
        </div>
      </div>

        <h2 style={{ marginTop: 24, marginBottom: 12, textAlign: 'center' }}>Popular products</h2>
        <div style={{ width: '100%', maxWidth: '100%', margin: '0 auto', textAlign: 'center' }}>
          {/* Horizontal five-column product row */}
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', alignItems: 'stretch', width: '100%', boxSizing: 'border-box', padding: '0 8px' }}>
            {products.slice((currentPage - 1) * perPage, currentPage * perPage).map((p) => (
              <div key={p.id} style={{ flex: '1 1 calc((100% - 80px) / 5)', maxWidth: 'calc((100% - 80px) / 5)', minWidth: 0, boxSizing: 'border-box', border: '1px solid #eee', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
                {p.image ? (
                  <img
                    src={p.image?.startsWith('http') ? p.image : `http://localhost:4000${p.image}`}
                    alt={p.name}
                    style={{ display: 'block', width: '100%', height: 240, objectFit: 'cover', background: '#fafafa' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: 240, background: '#fafafa' }} />
                )}
                <div style={{ padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 150 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div style={{ color: '#666', fontSize: 14 }}>{p.brand || p.category}</div>
                  </div>
                  <div>
                    <div style={{ marginTop: 10, fontWeight: 800, fontSize: 18 }}>${p.price}</div>
                    <div style={{ marginTop: 12, display: 'flex', gap: 10, justifyContent: 'center' }}>
                      <Link to={`/products/${p.id}`} style={{ border: '1px solid #111', padding: '8px 12px', borderRadius: 6, color: '#111', textDecoration: 'none' }}>View</Link>
                      <button onClick={() => { addItem({ id: p.id, name: p.name, price: p.price, image: p.image, sku: p.sku }, 1); alert('Added to cart'); }} style={{ background: '#fff', border: '1px solid #e6e6e6', padding: '8px 10px', borderRadius: 6, fontSize: 14, cursor: 'pointer' }}>🛒 Add</button>
                      <button onClick={() => { addItem({ id: p.id, name: p.name, price: p.price, image: p.image, sku: p.sku }, 1); window.location.href = '/cart'; }} style={{ background: '#0b79d0', color: '#fff', borderRadius: 6, padding: '8px 12px', fontSize: 14, border: 'none', cursor: 'pointer', boxShadow: '0 4px 10px rgba(11,121,208,0.18)' }}>💳 Buy</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      {/* Pagination controls for products */}
      {products.length > perPage ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12, gap: 8 }}>
          <button onClick={() => setCurrentPage((s) => Math.max(1, s - 1))} disabled={currentPage === 1} style={{ padding: '6px 10px' }}>Prev</button>
          {Array.from({ length: Math.ceil(products.length / perPage) }).map((_, i) => {
            const page = i + 1;
            return (
              <button key={page} onClick={() => setCurrentPage(page)} style={{ padding: '6px 10px', fontWeight: page === currentPage ? 700 : 400 }}>{page}</button>
            );
          })}
          <button onClick={() => setCurrentPage((s) => Math.min(Math.ceil(products.length / perPage), s + 1))} disabled={currentPage === Math.ceil(products.length / perPage)} style={{ padding: '6px 10px' }}>Next</button>
        </div>
      ) : null}
 
    <h2 style={{ marginTop: 28, marginBottom: 12, textAlign: 'center' }}>Latest blog posts</h2>
      <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
      <div className="responsive-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', justifyContent: 'center' }}>
        {posts.slice(0, 3).map(post => (
          <div key={post.id} style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
            {post.image ? <img src={post.image} alt={post.title} style={{ width: '100%', height: 200, objectFit: 'cover' }} /> : <div style={{ height: 200, background: '#fafafa' }} />}
            <div style={{ padding: 12, textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{post.title}</div>
              <div style={{ color: '#666', fontSize: 13 }}>{post.category} • {new Date(post.createdAt).toLocaleDateString()}</div>
              <div style={{ marginTop: 8 }}>{post.excerpt}</div>
              <div style={{ marginTop: 10 }}>
                <Link to={`/blogs/${post.id}`}><button>Read more</button></Link>
              </div>
            </div>
          </div>
        ))}
      </div>
      </div>

      {/* Image marketing banner under latest blog posts */}
    <div style={{ marginTop: 20, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ position: 'relative' }}>
          <img src="https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=1400&q=80" alt="Marketing banner" style={{ width: '100%', height: 260, objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', left: 24, top: 24, color: '#fff', textShadow: '0 4px 12px rgba(0,0,0,0.6)', maxWidth: 680 }}>
            <div style={{ fontSize: 26, fontWeight: 800 }}>Discover our latest arrivals</div>
            <div style={{ marginTop: 8, fontSize: 15 }}>Handpicked products, expert tips, and exclusive deals — all in one place.</div>
            <div style={{ marginTop: 12 }}>
              <a href="/products" style={{ background: '#ff6b6b', color: '#fff', padding: '10px 14px', borderRadius: 8, textDecoration: 'none', fontWeight: 700 }}>Shop Now</a>
              <a href="/blogs" style={{ marginLeft: 12, background: 'rgba(255,255,255,0.85)', color: '#111', padding: '8px 12px', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>Read Blog</a>
            </div>
          </div>
        </div>
      </div>

      {/* Add Blog Post button moved to the Blogs page */}

      {showBlogForm ? (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', zIndex: 80 }}>
          <div style={{ width: '90%', maxWidth: 700, background: '#fff', padding: 16, borderRadius: 8 }}>
            <h3>{blogForm.id ? 'Edit Blog Post' : 'New Blog Post'}</h3>
            <form onSubmit={submitBlog} style={{ display: 'grid', gap: 8 }}>
                <input placeholder='Title' value={blogForm.title} onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })} />
                <input placeholder='Category' value={blogForm.category} onChange={(e) => setBlogForm({ ...blogForm, category: e.target.value })} />
                <input type="file" accept="image/*" onChange={(e) => setBlogForm({ ...blogForm, imageFile: e.target.files?.[0] || null })} />
                {blogForm.image && !blogForm.imageFile ? <div style={{ marginTop: 8 }}><img src={blogForm.image} alt="blog" style={{ maxHeight: 120 }} /></div> : null}
                <input placeholder='Excerpt' value={blogForm.excerpt} onChange={(e) => setBlogForm({ ...blogForm, excerpt: e.target.value })} />
                <textarea placeholder='Content' rows={6} value={blogForm.content} onChange={(e) => setBlogForm({ ...blogForm, content: e.target.value })} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button type='submit'>Save</button>
                <button type='button' onClick={() => setShowBlogForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}


