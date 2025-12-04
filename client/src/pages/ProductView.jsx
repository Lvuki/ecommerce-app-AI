import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { addItem } from "../services/cartService";
import wishlistService from '../services/wishlistService';
import { getProductById, rateProduct } from "../services/productService";
import { getCategoriesAndBrands, searchProducts } from "../services/productService";
import { getCategories } from "../services/categoryService";
import { getToken } from '../services/authService';

export default function ProductView() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [product, setProduct] = useState(null);
  const [mainIndex, setMainIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inWishlist, setInWishlist] = useState(false);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [availableServices, setAvailableServices] = useState([]);
  const [showServicesModal, setShowServicesModal] = useState(false);
  const navigate = useNavigate();

  const [filters, setFilters] = useState({ category: "", brand: "", priceMin: "", priceMax: "", stockMin: "", color: "", size: "" });
  const [meta, setMeta] = useState({ categories: [], brands: [] });
  const [categoriesTree, setCategoriesTree] = useState([]);

  // submit rating helper used by star buttons
  async function submitRating(idx) {
    if (ratingLoading) return;
  // allow anonymous rating; the server applies rate-limiting per IP
    try {
      setRatingLoading(true);
      const resp = await rateProduct(product.id, idx);
      if (resp && resp.average !== undefined) {
        setProduct(prev => ({ ...prev, ratingAvg: resp.average, ratingCount: resp.count }));
      } else if (resp && resp.error) {
        alert(resp.error);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to submit rating');
    } finally {
      setRatingLoading(false);
    }
  }

  useEffect(() => {
    getProductById(id)
      .then((p) => {
        if (p?.error) {
          setError(p.error);
        } else {
          setProduct(p);
          // preload available services for selection
          (async () => {
            try {
              const svcModule = await import('../services/serviceService');
              const arr = await svcModule.listServices();
              setAvailableServices(arr || []);
              // preset selected services from product
              if (Array.isArray(p.services)) setSelectedServiceIds(p.services.map(s => s.id));
            } catch (e) {
              setAvailableServices([]);
            }
          })();
        }
      })
      .catch(() => setError("Failed to load product"))
      .finally(() => setLoading(false));
  }, [id]);

  // Listen for product updates or deletions so this view can refresh automatically
  useEffect(() => {
    const onUpdated = (e) => {
      try {
        const prod = e && e.detail && e.detail.product;
        if (prod && String(prod.id) === String(id)) {
          // update locally to avoid extra fetch; server response is treated as source-of-truth
          setProduct(prod);
        }
      } catch (err) {}
    };

    const onDeleted = (e) => {
      try {
        const did = e && e.detail && e.detail.id;
        if (did && String(did) === String(id)) {
          // product was deleted elsewhere — navigate back to listing
          navigate('/products');
        }
      } catch (err) {}
    };

    window.addEventListener('product-updated', onUpdated);
    window.addEventListener('product-deleted', onDeleted);
    return () => { window.removeEventListener('product-updated', onUpdated); window.removeEventListener('product-deleted', onDeleted); };
  }, [id, navigate]);

  // Load categories tree and brands for the left filters
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [tree, brandsRes] = await Promise.all([getCategories(), getCategoriesAndBrands()]);
        if (!mounted) return;
        setCategoriesTree(Array.isArray(tree) ? tree : []);
        setMeta(brandsRes || { categories: [], brands: [] });
      } catch (e) {
        if (!mounted) return;
        setCategoriesTree([]);
        setMeta({ categories: [], brands: [] });
      }
    })();
    return () => { mounted = false; };
  }, []);

  // sync filters from search params
  useEffect(() => {
    const params = Object.fromEntries(searchParams.entries());
    setFilters({
      category: params.category || "",
      brand: params.brand || "",
      priceMin: params.priceMin || "",
      priceMax: params.priceMax || "",
      stockMin: params.stockMin || "",
      color: params.color || "",
      size: params.size || "",
    });
  }, [searchParams]);

  // track whether this product is in the wishlist
  useEffect(() => {
    let mounted = true;
    async function check() {
      try {
        const list = await wishlistService.getWishlist();
        if (!mounted) return;
        const has = Array.isArray(list) && list.some(i => String(i.id) === String(id));
        setInWishlist(has);
      } catch (_) { if (mounted) setInWishlist(false); }
    }
    check();
    const onUpdate = (e) => {
      const items = e && e.detail && e.detail.items ? e.detail.items : [];
      setInWishlist(Array.isArray(items) && items.some(i => String(i.id) === String(id)));
    };
    window.addEventListener('wishlistUpdated', onUpdate);
    return () => { mounted = false; window.removeEventListener('wishlistUpdated', onUpdate); };
  }, [id]);

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (error) return <div style={{ padding: 20, color: 'red' }}>{error}</div>;
  if (!product) return null;

  // determine images array (server stores `images` array or legacy `image`)
  const images = (product.images && product.images.length) ? product.images : (product.image ? [product.image] : []);
  const resolvedImages = images.map(img => img && img.startsWith('http') ? img : `http://localhost:4000${img}`);
  const imageUrl = resolvedImages[mainIndex] || null;
  let specs = product.specs;
  // Normalize specs if stored as string somehow
  if (typeof specs === 'string') {
    try { specs = JSON.parse(specs); } catch (_) {}
  }

  return (
    <div className="page-container">
      <Link to="/" style={{ textDecoration: 'none' }}>← Back to Home</Link>
      <div className="sidebar-layout" style={{ marginTop: 12 }}>
        <aside style={{ border: "1px solid #eee", borderRadius: 10, padding: 12, background: "#fff" }}>
          <form onSubmit={(e) => { e.preventDefault(); navigate('/products?' + new URLSearchParams(filters).toString()); }} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Category</div>
              <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
                <option value="">All</option>
                {(() => {
                  const out = [];
                  function walk(nodes, depth = 0) {
                    for (const n of nodes || []) {
                      const label = `${'\u00A0'.repeat(depth * 2)}${n.name}`;
                      out.push(<option key={`cat-${n.id}`} value={n.name}>{label}</option>);
                      if (Array.isArray(n.subcategories) && n.subcategories.length) walk(n.subcategories, depth + 1);
                    }
                  }
                  walk(categoriesTree, 0);
                  return out;
                })()}
              </select>
            </div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Brand</div>
              <select value={filters.brand} onChange={(e) => setFilters({ ...filters, brand: e.target.value })}>
                <option value="">All</option>
                {(Array.isArray(meta.brands) ? meta.brands : []).map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Price</div>
              <div style={{ display: "flex", gap: 6 }}>
                <input type="number" placeholder="Min" value={filters.priceMin} onChange={(e) => setFilters({ ...filters, priceMin: e.target.value })} style={{ width: "50%" }} />
                <input type="number" placeholder="Max" value={filters.priceMax} onChange={(e) => setFilters({ ...filters, priceMax: e.target.value })} style={{ width: "50%" }} />
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Stock</div>
              <input type="number" placeholder="Min stock" value={filters.stockMin} onChange={(e) => setFilters({ ...filters, stockMin: e.target.value })} />
            </div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Specifications</div>
              <input placeholder="Color" value={filters.color} onChange={(e) => setFilters({ ...filters, color: e.target.value })} />
              <input placeholder="Size" value={filters.size} onChange={(e) => setFilters({ ...filters, size: e.target.value })} />
            </div>
            <button type="submit">View filtered products</button>
          </form>
        </aside>
        <main>
          <div style={{ border: '1px solid #eee', borderRadius: 10, overflow: 'hidden', background: '#fff', marginBottom: 8 }}>
            {imageUrl ? (
              <img src={imageUrl} alt={product.name} style={{ width: '100%', height: 480, objectFit: 'cover', background: '#fafafa' }} />
            ) : (
              <div style={{ width: '100%', height: 480, background: '#fafafa' }} />
            )}
          </div>

          {resolvedImages && resolvedImages.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {resolvedImages.map((src, i) => (
                <button key={i} onClick={() => setMainIndex(i)} style={{ border: mainIndex === i ? '2px solid #0b74de' : '1px solid #eee', padding: 0, background: '#fff', borderRadius: 6 }}>
                  <img src={src} alt={`thumb-${i}`} style={{ width: 80, height: 60, objectFit: 'cover', display: 'block', borderRadius: 4 }} />
                </button>
              ))}
            </div>
          )}

          <section style={{ padding: 12 }}>
            <h1 style={{ marginTop: 0 }}>{product.name}</h1>
            <div style={{ color: '#666' }}>{product.brand || product.category}</div>

            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div role="radiogroup" aria-label={`Rate ${product.name}`} style={{ display: 'flex', gap: 6 }}>
                {Array.from({ length: 5 }).map((_, i) => {
                  const idx = i + 1;
                  const avg = Number(product.ratingAvg || 0);
                  const fillPct = Math.max(0, Math.min(100, Math.round((Math.max(0, avg - i) * 100))));
                  const gradId = `starGrad-${product.id || 'p'}-${i}`;
                  return (
                    <button
                      key={idx}
                      role="radio"
                      aria-checked={avg >= idx}
                      aria-label={`Rate ${idx} out of 5`}
                      onKeyDown={async (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); await submitRating(idx); } }}
                      onClick={async () => await submitRating(idx)}
                      disabled={ratingLoading}
                      style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer' }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden focusable="false">
                        <defs>
                          <linearGradient id={gradId} x1="0%" x2="100%">
                            <stop offset={`${fillPct}%`} stopColor="#ffb400" />
                            <stop offset={`${fillPct}%`} stopColor="#ddd" />
                          </linearGradient>
                        </defs>
                        <path fill={`url(#${gradId})`} d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.788 1.402 8.168L12 18.896l-7.336 3.87 1.402-8.168L.132 9.21l8.2-1.192z" />
                      </svg>
                    </button>
                  );
                })}
              </div>

              <div style={{ color: '#666', fontSize: 14 }} aria-live="polite">
                {product.ratingAvg ? `${product.ratingAvg} / 5` : 'No rating yet'}{product.ratingCount ? ` (${product.ratingCount} votes)` : ''}
              </div>
            </div>

            <div style={{ marginTop: 8 }}>
              {product.offerPrice && Number(product.offerPrice) > 0 ? (
                <div>
                  <div style={{ fontWeight: 800, fontSize: 22, color: '#c90000' }}>${Number(product.offerPrice).toFixed(2)}</div>
                  <div style={{ textDecoration: 'line-through', color: '#888', fontSize: 14 }}>${Number(product.price).toFixed(2)}</div>
                </div>
              ) : product.salePrice && Number(product.salePrice) > 0 && Number(product.salePrice) !== Number(product.price) ? (
                <div>
                  <div style={{ fontWeight: 800, fontSize: 22, color: '#d32' }}>${Number(product.salePrice).toFixed(2)}</div>
                  <div style={{ textDecoration: 'line-through', color: '#888', fontSize: 14 }}>${Number(product.price).toFixed(2)}</div>
                </div>
              ) : (
                <div style={{ fontWeight: 700, fontSize: 22 }}>${Number(product.price).toFixed(2)}</div>
              )}
              {product.offerTo ? (
                <div style={{ color: '#c00', marginTop: 8 }}>{(function(){ try { const to = new Date(product.offerTo); const now = new Date(); let diff = to - now; if (isNaN(diff) || diff <= 0) return 'Offer ended'; const days = Math.floor(diff / (1000*60*60*24)); diff -= days * (1000*60*60*24); const hours = Math.floor(diff / (1000*60*60)); if (days > 0) return `Ends in ${days}d ${hours}h`; const mins = Math.floor(diff / (1000*60)); if (hours > 0) return `Ends in ${hours}h ${mins}m`; return `Ends in ${mins}m`; } catch (_) { return null; } })()}</div>
              ) : null}
            </div>

            <div style={{ marginTop: 12 }}>SKU: <strong>{product.sku}</strong></div>
            <div style={{ marginTop: 12 }}>In stock: <strong>{product.stock}</strong></div>
            <p style={{ marginTop: 16, lineHeight: 1.6 }}>{product.description}</p>

            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button onClick={async () => {
                try {
                  const priceToUse = (product.offerPrice && Number(product.offerPrice) > 0) ? product.offerPrice : ((product.salePrice && Number(product.salePrice) > 0) ? product.salePrice : product.price);
                  // send full service objects so local (unauthenticated) cart can compute totals
                  await addItem({ id: product.id, name: product.name, price: priceToUse, image: product.image, sku: product.sku, services: availableServices.filter(s => (selectedServiceIds || []).includes(s.id)) }, 1);
                  alert('Added to cart');
                } catch (err) { console.error(err); alert('Failed to add to cart'); }
              }}>
                🛒 Add to Cart
              </button>
              <button onClick={async () => {
                try {
                  const priceToUse = (product.offerPrice && Number(product.offerPrice) > 0) ? product.offerPrice : ((product.salePrice && Number(product.salePrice) > 0) ? product.salePrice : product.price);
                  await addItem({ id: product.id, name: product.name, price: priceToUse, image: product.image, sku: product.sku, services: availableServices.filter(s => (selectedServiceIds || []).includes(s.id)) }, 1);
                  window.location.href = '/cart';
                } catch (err) { console.error(err); alert('Failed to add to cart'); }
              }} style={{ background: '#0b79d0', color: '#fff' }}>
                💳 Buy Now
              </button>
              <button onClick={() => setShowServicesModal(true)}>Select Services ({(selectedServiceIds || []).length})</button>
              <button onClick={async () => { try { await wishlistService.toggleItem({ id: product.id, name: product.name, image: product.image, price: product.price }); /* toggle will fire wishlistUpdated event */ } catch (err) { console.error(err); alert('Failed to update wishlist'); } }} style={{ border: '1px solid #e6eef6', padding: '8px 12px', background: inWishlist ? '#ffecec' : 'transparent' }} aria-pressed={inWishlist}>
                {inWishlist ? '❤️ In Wishlist' : '♡ Wishlist'}
              </button>
            </div>

            {specs && typeof specs === 'object' ? (
              <div style={{ marginTop: 16 }}>
                <h3>Specifications</h3>
                <ul style={{ paddingLeft: 18 }}>
                  {Object.entries(specs).map(([k, v]) => (
                    <li key={k}>
                      <strong>{k}:</strong> {String(v)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

              {/* Services selection modal */}
              {showServicesModal && (
                <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', zIndex: 80 }}>
                  <div style={{ width: 600, maxHeight: '80vh', overflow: 'auto', background: '#fff', padding: 18, borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <h4 style={{ margin: 0 }}>Select Services</h4>
                      <button onClick={() => setShowServicesModal(false)}>×</button>
                    </div>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {availableServices.map(s => {
                        const checked = (selectedServiceIds || []).includes(s.id);
                        return (
                          <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #eee', padding: 8, borderRadius: 6 }}>
                            <input type="checkbox" checked={checked} onChange={(e) => {
                              const next = new Set(selectedServiceIds || []);
                              if (e.target.checked) next.add(s.id); else next.delete(s.id);
                              setSelectedServiceIds(Array.from(next));
                            }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700 }}>{s.name}</div>
                              <div style={{ color: '#666', fontSize: 13 }}>{s.description}</div>
                            </div>
                            <div style={{ fontWeight: 700 }}>${Number(s.price || 0).toFixed(2)}</div>
                          </label>
                        );
                      })}
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button onClick={() => setShowServicesModal(false)}>Done</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
          </section>
        </main>
      </div>
    </div>
  );
}


