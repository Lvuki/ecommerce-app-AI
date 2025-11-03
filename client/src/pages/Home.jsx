import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getProducts } from "../services/productService";
import { getCategories } from '../services/categoryService';
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
  const [categories, setCategories] = useState([]);
  // Helpers for pricing/offer visuals
  const getOfferRemaining = (p) => {
    try {
      if (!p || !p.offerTo) return null;
      const t = new Date(p.offerTo).getTime();
      const now = Date.now();
      if (isNaN(t) || t <= now) return null;
      let diff = Math.max(0, t - now);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      diff -= days * (1000 * 60 * 60 * 24);
      const hours = Math.floor(diff / (1000 * 60 * 60));
      diff -= hours * (1000 * 60 * 60);
      const mins = Math.floor(diff / (1000 * 60));
      if (days > 0) return `Ends in ${days}d ${hours}h`;
      if (hours > 0) return `Ends in ${hours}h ${mins}m`;
      return `Ends in ${mins}m`;
    } catch (_) { return null; }
  };

  const priceInfo = (p) => {
    const price = p && p.price ? Number(p.price) : 0;
    const sale = p && p.salePrice ? Number(p.salePrice) : 0;
    const offer = p && p.offerPrice ? Number(p.offerPrice) : 0;
    const useOffer = offer && offer > 0 && p.offerTo && new Date(p.offerTo).getTime() > Date.now();
    // Show sale when salePrice is provided; mark invalidSale when sale >= price
    const useSale = !useOffer && sale && sale > 0;
    const isInvalidSale = !!(sale && sale > 0 && price && sale >= price);
    const display = useOffer ? offer : (useSale ? sale : price);
    const discounted = useOffer || (useSale && !isInvalidSale);
    return { display, original: price, isOffer: useOffer, isSale: useSale, isInvalidSale, discounted, remaining: useOffer ? getOfferRemaining(p) : null };
  };
  // list of currently active offers
  const offers = products.filter(p => priceInfo(p).isOffer);
  const brands = useMemo(() => {
    const m = new Map();
    products.forEach(p => {
      const name = (p.brand || '').toString().trim();
      if (!name) return;
      if (!m.has(name)) m.set(name, p.image || null);
    });
    return Array.from(m.entries()).map(([name, image]) => ({ name, image }));
  }, [products]);
  const [showBlogForm, setShowBlogForm] = useState(false);
  const [blogForm, setBlogForm] = useState({ title: '', excerpt: '', content: '', category: '', image: '', imageFile: null });
  const admin = isAdmin();

  useEffect(() => {
    getPosts().then((p) => setPosts(p || []));
  }, []);

  useEffect(() => {
    getCategories().then((c) => setCategories(c || []));
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <h1 style={{ margin: 0 }}>ShopApp</h1>
      </div>

  <div className="two-col" style={{ borderRadius: 12, background: "#f7f8fa", padding: 16, alignItems: "center", minHeight: 286 }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{current.name || "Featured product"}</div>
          <div style={{ marginTop: 6, color: "#444" }}>{current.brand || current.category || ""}</div>
          <div style={{ marginTop: 8, fontWeight: 700 }}>
            {current ? (() => {
              const info = priceInfo(current);
              return (
                <div>
                  <div style={{ fontSize: 22, color: info.isOffer ? '#b71c1c' : (info.isSale ? '#d32' : '#111'), fontWeight: 800 }}>${Number(info.display).toFixed(2)}</div>
                  {info.discounted ? <div style={{ textDecoration: 'line-through', color: '#888', fontSize: 14 }}>${Number(info.original).toFixed(2)}</div> : null}
                  {info.remaining ? <div style={{ marginTop: 6, fontSize: 13, color: '#b71c1c' }}>{info.remaining}</div> : null}
                  {info.isInvalidSale ? <div style={{ marginTop: 6, display: 'inline-block', background: '#f0ad4e', color: '#fff', padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>Check sale</div> : null}
                </div>
              );
            })() : ""}
          </div>
          <div style={{ marginTop: 12 }}>
            <Link to="/products" style={{ background: "#111", color: "#fff", padding: "8px 14px", borderRadius: 6, textDecoration: "none" }}>Shop now</Link>
          </div>
          <div style={{ marginTop: 10 }}>
            {featured.map((p, i) => (
              <span key={p.id || i} style={{ width: 8, height: 8, borderRadius: 999, background: i === slideIdx ? "#111" : "#bbb", display: "inline-block", marginRight: 6 }} />
            ))}
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          {current.image ? (
            <img src={current.image?.startsWith("http") ? current.image : `http://localhost:4000${current.image}`} alt={current.name} style={{ width: "100%", height: 286, objectFit: "cover", borderRadius: 10, background: "#fafafa" }} />
          ) : (
            <div style={{ width: "100%", height: 286, borderRadius: 10, background: "#fafafa" }} />
          )}
          {/* Badge */}
          {(() => {
            const info = priceInfo(current);
            if (!info || (!info.isOffer && !info.isSale)) return null;
            return (
              <div style={{ position: 'absolute', left: 12, top: 12, background: info.isOffer ? '#b71c1c' : '#d32', color: '#fff', padding: '6px 10px', borderRadius: 6, fontWeight: 700, fontSize: 13 }}>
                {info.isOffer ? 'OFFER' : 'SALE'}
              </div>
            );
          })()}
        </div>
      </div>

  {/* Offers section: show only active offers */}
  {offers && offers.length > 0 ? (
    <>
      <h2 style={{ marginTop: 32, marginBottom: 12, textAlign: 'center' }}>Current offers</h2>
      <div style={{ width: '100%', maxWidth: '100%', margin: '0 auto', textAlign: 'center' }}>
  <div style={{ display: 'flex', gap: 20, justifyContent: 'center', alignItems: 'flex-start', width: '100%', boxSizing: 'border-box', padding: '0 8px', paddingBottom: 12 }}>
          {offers.slice(0, 6).map((p) => (
            <div key={`offer-${p.id}`} style={{ flex: '1 1 calc((100% - 80px) / 5)', maxWidth: 'calc((100% - 80px) / 5)', minWidth: 0, boxSizing: 'border-box', border: '1px solid #eee', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
              <div style={{ position: 'relative' }}>
                {p.image ? (
                  <img src={p.image?.startsWith('http') ? p.image : `http://localhost:4000${p.image}`} alt={p.name} style={{ display: 'block', width: '100%', height: 220, objectFit: 'cover', background: '#fafafa' }} />
                ) : (
                  <div style={{ width: '100%', height: 220, background: '#fafafa' }} />
                )}
                <div style={{ position: 'absolute', left: 10, top: 10, background: '#b71c1c', color: '#fff', padding: '6px 8px', borderRadius: 6, fontWeight: 700, fontSize: 12 }}>OFFER</div>
              </div>
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 150 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ color: '#666', fontSize: 14 }}>{p.brand || p.category}</div>
                </div>
                <div>
                  <div style={{ marginTop: 10 }}>
                    {(() => {
                      const info = priceInfo(p);
                      return (
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 18, color: '#b71c1c' }}>${Number(info.display).toFixed(2)}</div>
                          {info.discounted ? <div style={{ textDecoration: 'line-through', color: '#888', fontSize: 13 }}>${Number(info.original).toFixed(2)}</div> : null}
                          {info.remaining ? <div style={{ marginTop: 6, fontSize: 12, color: '#b71c1c' }}>{info.remaining}</div> : null}
                        </div>
                      );
                    })()}
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', gap: 10, justifyContent: 'center' }}>
                    <Link to={`/products/${p.id}`} style={{ border: '1px solid #111', padding: '8px 12px', borderRadius: 6, color: '#111', textDecoration: 'none' }}>View</Link>
                    {(() => { const info = priceInfo(p); return (
                      <>
                        <button onClick={async () => { try { const priceToUse = info.display; await addItem({ id: p.id, name: p.name, price: priceToUse, image: p.image, sku: p.sku }, 1); alert('Added to cart'); } catch (err) { console.error(err); alert('Failed to add to cart'); } }} style={{ background: '#fff', border: '1px solid #e6e6e6', padding: '8px 10px', borderRadius: 6, fontSize: 14, cursor: 'pointer' }}>🛒 Add</button>
                        <button onClick={async () => { try { const priceToUse = info.display; await addItem({ id: p.id, name: p.name, price: priceToUse, image: p.image, sku: p.sku }, 1); window.location.href = '/cart'; } catch (err) { console.error(err); alert('Failed to add to cart'); } }} style={{ background: '#0b79d0', color: '#fff', borderRadius: 6, padding: '8px 12px', fontSize: 14, border: 'none', cursor: 'pointer', boxShadow: '0 4px 10px rgba(11,121,208,0.18)' }}>💳 Buy</button>
                      </>
                    ); })()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  ) : null}

  <h2 style={{ marginTop: 48, marginBottom: 24, textAlign: 'center' }}>Popular products</h2>
        <div style={{ width: '100%', maxWidth: '100%', margin: '0 auto', textAlign: 'center' }}>
          {/* Horizontal five-column product row */}
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', alignItems: 'stretch', width: '100%', boxSizing: 'border-box', padding: '0 8px' }}>
            {products.slice(0, 6).map((p) => {
              const info = priceInfo(p);
              return (
                <div key={p.id} style={{ flex: '1 1 calc((100% - 80px) / 5)', maxWidth: 'calc((100% - 80px) / 5)', minWidth: 0, boxSizing: 'border-box', border: '1px solid #eee', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
                  <div style={{ position: 'relative' }}>
                    {p.image ? (
                      <img
                        src={p.image?.startsWith('http') ? p.image : `http://localhost:4000${p.image}`}
                        alt={p.name}
                        style={{ display: 'block', width: '100%', height: 240, objectFit: 'cover', background: '#fafafa' }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: 240, background: '#fafafa' }} />
                    )}
                    {/* Badge on product image */}
                    {info && (info.isOffer || info.isSale) ? (
                      <div style={{ position: 'absolute', left: 10, top: 10, background: info.isOffer ? '#b71c1c' : '#d32', color: '#fff', padding: '6px 8px', borderRadius: 6, fontWeight: 700, fontSize: 12 }}>
                        {info.isOffer ? 'OFFER' : 'SALE'}
                      </div>
                    ) : null}
                  </div>
                  <div style={{ padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 150 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                        {info && (info.isOffer || info.isSale) ? (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <div style={{ background: info.isOffer ? '#b71c1c' : '#d32', color: '#fff', padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>{info.isOffer ? 'OFFER' : 'SALE'}</div>
                            {info.isInvalidSale ? <div style={{ background: '#f0ad4e', color: '#fff', padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>Check sale</div> : null}
                          </div>
                        ) : null}
                      </div>
                      <div style={{ color: '#666', fontSize: 14 }}>{p.brand || p.category}</div>
                    </div>
                    <div>
                      <div style={{ marginTop: 10 }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 18, color: info.isOffer ? '#b71c1c' : (info.isSale ? '#d32' : '#111') }}>${Number(info.display).toFixed(2)}</div>
                          {info.discounted ? <div style={{ textDecoration: 'line-through', color: '#888', fontSize: 13 }}>${Number(info.original).toFixed(2)}</div> : null}
                          {info.remaining ? <div style={{ marginTop: 6, fontSize: 12, color: '#b71c1c' }}>{info.remaining}</div> : null}
                        </div>
                      </div>
                      <div style={{ marginTop: 12, display: 'flex', gap: 10, justifyContent: 'center' }}>
                        <Link to={`/products/${p.id}`} style={{ border: '1px solid #111', padding: '8px 12px', borderRadius: 6, color: '#111', textDecoration: 'none' }}>View</Link>
                        <button onClick={async () => { try { const priceToUse = info.display; await addItem({ id: p.id, name: p.name, price: priceToUse, image: p.image, sku: p.sku }, 1); alert('Added to cart'); } catch (err) { console.error(err); alert('Failed to add to cart'); } }} style={{ background: '#fff', border: '1px solid #e6e6e6', padding: '8px 10px', borderRadius: 6, fontSize: 14, cursor: 'pointer' }}>🛒 Add</button>
                        <button onClick={async () => { try { const priceToUse = info.display; await addItem({ id: p.id, name: p.name, price: priceToUse, image: p.image, sku: p.sku }, 1); window.location.href = '/cart'; } catch (err) { console.error(err); alert('Failed to add to cart'); } }} style={{ background: '#0b79d0', color: '#fff', borderRadius: 6, padding: '8px 12px', fontSize: 14, border: 'none', cursor: 'pointer', boxShadow: '0 4px 10px rgba(11,121,208,0.18)' }}>💳 Buy</button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      {/* Pagination controls for products */}
      {/* Pagination removed: showing all popular products */}
 
      {/* Categories will be rendered below the marketing banner as a full-width section */}
 
  <h2 style={{ marginTop: 52, marginBottom: 24, textAlign: 'center' }}>Latest blog posts</h2>
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
  <div style={{ marginTop: 42, borderRadius: 10, overflow: 'hidden' }}>
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

        {/* Full-width categories section under the banner */}
        <section style={{ width: '100%', marginTop: 42, padding: '0 12px', boxSizing: 'border-box' }}>
          <h2 style={{ textAlign: 'center', marginBottom: 24 }}>Shop by categories</h2>
          <div style={{ width: '100%', maxWidth: '1600px', margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
              {categories.slice(0, 6).map(cat => (
                <div key={cat.id} style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden', background: '#fff', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ height: 220, overflow: 'hidden' }}>
                    {cat.image ? (
                      <img src={cat.image.startsWith('http') ? cat.image : `http://localhost:4000${cat.image}`} alt={cat.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: 220, background: '#fafafa' }} />
                    )}
                  </div>
                  <div style={{ padding: 14, flex: '1 1 auto' }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{cat.name}</div>
                    <div style={{ color: '#666', fontSize: 13, marginTop: 6 }}>{cat.description}</div>
                    <div style={{ marginTop: 10, color: '#444', fontSize: 14 }}>
                      {products.filter(p => (p.category || '').toLowerCase() === (cat.name || '').toLowerCase()).slice(0, 3).map(p => (
                        <div key={p.id} style={{ marginTop: 6 }}>{p.name}</div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Brands section (thumbnails) - full width */}
        <section style={{ width: '100%', marginTop: 24, padding: '0', boxSizing: 'border-box' }}>
          <h2 style={{ textAlign: 'center', marginBottom: 12 }}>Brands</h2>
          <div style={{ width: '100%', margin: '0 auto' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'center', alignItems: 'flex-start', padding: '12px 24px' }}>
              {brands.slice(0, 16).map(b => {
                const productImage = b.image ? (b.image.startsWith('http') ? b.image : `http://localhost:4000${b.image}`) : null;
                const slug = (b.name || '').toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                const logoPath = `/uploads/brands/${slug}.png`;
                const picsum = `https://picsum.photos/seed/${encodeURIComponent(b.name)}/300/180`;
                // We'll try brand logo path first (admin can upload to /uploads/brands/<slug>.png), then product image, then picsum
                const initialSrc = logoPath;
                return (
                  <Link key={b.name} to={`/products?brand=${encodeURIComponent(b.name)}`} style={{ textDecoration: 'none' }}>
                    <div style={{ width: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
                      <div style={{ width: 180, height: 110, borderRadius: 8, overflow: 'hidden', border: '1px solid #eee', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img
                          src={initialSrc}
                          alt={b.name}
                          title={b.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            // try product image then picsum
                            try {
                              const el = e.currentTarget;
                              if (productImage && el.src !== productImage) {
                                el.src = productImage;
                                return;
                              }
                              if (el.src !== picsum) el.src = picsum;
                            } catch (_) { /* ignore */ }
                          }}
                        />
                      </div>
                      <div style={{ marginTop: 8, textAlign: 'center', fontSize: 14, fontWeight: 600, color: '#333' }}>{b.name}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* Work with us CTA section */}
        <section style={{ width: '100%', marginTop: 28, padding: '20px 12px', boxSizing: 'border-box' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', background: '#0b79d0', color: '#fff', borderRadius: 10, display: 'flex', gap: 20, alignItems: 'center', padding: 20, boxSizing: 'border-box' }}>
            <div style={{ flex: '1 1 60%' }}>
              <div style={{ fontSize: 20, fontWeight: 800 }}>Work with us</div>
              <div style={{ marginTop: 8, opacity: 0.95 }}>Looking to sell your products, collaborate, or join our team? We're always open to partnerships and great talent. Reach out and let's build something amazing together.</div>
            </div>
            <div style={{ flex: '0 0 260px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <a href="/careers" style={{ background: '#fff', color: '#0b79d0', padding: '10px 14px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, display: 'inline-block' }}>Careers</a>
              <a href="mailto:hello@shopapp.com" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '10px 14px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, display: 'inline-block', border: '1px solid rgba(255,255,255,0.12)' }}>Partner / Contact</a>
            </div>
          </div>
        </section>

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


