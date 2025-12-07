import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { addItem } from "../services/cartService";
import wishlistService from '../services/wishlistService';
import { getProductById, rateProduct } from "../services/productService";

export default function ProductView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mainIndex, setMainIndex] = useState(0);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);
  const [availableServices, setAvailableServices] = useState([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [showServicesModal, setShowServicesModal] = useState(false);
  const [specsOpen, setSpecsOpen] = useState(true);
  const [qty, setQty] = useState(1);
  const [mainImageFit, setMainImageFit] = useState('cover');
  const [mainImagePortrait, setMainImagePortrait] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const p = await getProductById(id);
        if (!mounted) return;
        if (p?.error) return setError(p.error);
        setProduct(p);
        // Use only services attached to this product (admin-selected), server includes them on product fetch
        const svcList = Array.isArray(p.services) ? p.services : [];
        setAvailableServices(svcList);
        if (svcList.length) setSelectedServiceIds(svcList.map(s => s.id));
      } catch (err) {
        if (mounted) setError('Failed to load product');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await wishlistService.getWishlist();
        if (!mounted) return;
        setInWishlist(Array.isArray(list) && list.some(i => String(i.id) === String(id)));
      } catch (_) { if (mounted) setInWishlist(false); }
    })();
    const onUpdate = (e) => {
      const items = e && e.detail && e.detail.items ? e.detail.items : [];
      setInWishlist(Array.isArray(items) && items.some(i => String(i.id) === String(id)));
    };
    window.addEventListener('wishlistUpdated', onUpdate);
    return () => { mounted = false; window.removeEventListener('wishlistUpdated', onUpdate); };
  }, [id]);

  async function submitRating(idx) {
    if (ratingLoading || !product) return;
    // optimistic UI: show immediate feedback while request is in flight
    const prevAvg = product.ratingAvg || 0;
    const prevCount = product.ratingCount || 0;
    const optimisticAvg = Number(((prevAvg * prevCount) + idx) / (prevCount + 1)).toFixed(2);
    try {
      setRatingLoading(true);
      setProduct(prev => ({ ...prev, ratingAvg: Number(optimisticAvg), ratingCount: prevCount + 1 }));
      console.debug('Submitting rating', { productId: product.id, value: idx });
      const resp = await rateProduct(product.id, idx);
      if (resp && resp.average !== undefined) {
        setProduct(prev => ({ ...prev, ratingAvg: resp.average, ratingCount: resp.count }));
      } else if (resp && resp.error) {
        // revert optimistic update
        setProduct(prev => ({ ...prev, ratingAvg: prevAvg, ratingCount: prevCount }));
        alert(resp.error || 'Failed to submit rating');
      } else {
        // unknown response shape: revert
        setProduct(prev => ({ ...prev, ratingAvg: prevAvg, ratingCount: prevCount }));
      }
    } catch (e) {
      console.error('Rating error', e);
      // revert optimistic update
      setProduct(prev => ({ ...prev, ratingAvg: prevAvg, ratingCount: prevCount }));
      alert('Failed to submit rating');
    } finally {
      setRatingLoading(false);
    }
  }

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (error) return <div style={{ padding: 20, color: 'red' }}>{error}</div>;
  if (!product) return null;

  const images = (product.images && product.images.length) ? product.images : (product.image ? [product.image] : []);
  const resolvedImages = images.map(img => img && img.startsWith('http') ? img : `http://localhost:4000${img}`);
  const imageUrl = resolvedImages[mainIndex] || resolvedImages[0] || null;
  const specs = product.specs || product.specifications || {};

  const handleAddToCart = async () => {
    try {
      const servicesPayload = (selectedServiceIds || []).map(sid => {
        const s = availableServices.find(a => String(a.id) === String(sid));
        return s ? { id: s.id, name: s.name, price: Number(s.price || 0) } : sid;
      });
      const price = Number(product.offerPrice || product.salePrice || product.price || 0);
      const item = { id: product.id, name: product.name, image: imageUrl || '', price, services: servicesPayload };
      await addItem(item, 1);
      try { navigate('/cart'); } catch (_) {}
    } catch (err) {
      console.error(err);
      alert('Failed to add to cart');
    }
  };

  const toggleWishlist = async () => {
    try {
      await wishlistService.toggleItem(product);
      const list = await wishlistService.getWishlist();
      setInWishlist(Array.isArray(list) && list.some(i => String(i.id) === String(product.id)));
    } catch (err) {
      console.error(err);
      alert('Failed to update wishlist');
    }
  };

  return (
    <main style={{ padding: '18px 0' }}>
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 18px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'start' }}>
          <div>
            <section style={{ padding: 6 }}>
              <h2 style={{ marginTop: 12 }}>{product.name}</h2>
              <div style={{ color: '#666', marginBottom: 8 }}>{product.brand || product.category}</div>

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
            </section>

            <div style={{ borderRadius: 12, overflow: 'hidden', background: '#fff', boxShadow: '0 6px 18px rgba(0,0,0,0.06)', marginTop: 12 }}>
              {imageUrl ? (
                mainImagePortrait ? (
                  <div style={{ width: '100%', height: 520, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa' }}>
                    <img
                      src={imageUrl}
                      alt={product.name}
                      style={{ maxHeight: 520, maxWidth: '100%', objectFit: 'contain', display: 'block' }}
                      onLoad={(e) => {
                        try {
                          const w = e.target.naturalWidth || 0;
                          const h = e.target.naturalHeight || 0;
                          if (w && h) {
                            setMainImagePortrait(w < h);
                            setMainImageFit(w < h ? 'contain' : 'cover');
                          }
                        } catch (_) {}
                      }}
                    />
                  </div>
                ) : (
                  <img
                    src={imageUrl}
                    alt={product.name}
                    className="product-main-image"
                    style={{ objectFit: mainImageFit }}
                    onLoad={(e) => {
                      try {
                        const w = e.target.naturalWidth || 0;
                        const h = e.target.naturalHeight || 0;
                        if (w && h) {
                          setMainImagePortrait(w < h);
                          setMainImageFit(w < h ? 'contain' : 'cover');
                        }
                      } catch (_) {}
                    }}
                  />
                )
              ) : (
                <div className="product-main-image" />
              )}
            </div>

            {resolvedImages && resolvedImages.length > 0 && (
              <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                {resolvedImages.map((src, i) => (
                  <button key={i} onClick={() => setMainIndex(i)} style={{ border: mainIndex === i ? '2px solid #0b74de' : '1px solid #eee', padding: 0, background: '#fff', borderRadius: 8 }}>
                    <img src={src} alt={`thumb-${i}`} className="product-thumb-small" />
                  </button>
                ))}
              </div>
            )}

            <div style={{ marginTop: 18 }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div><strong>SKU:</strong> {product.sku}</div>
                <div><strong>Stock:</strong> {product.stock}</div>
              </div>
              <p style={{ marginTop: 12, lineHeight: 1.6 }}>{product.description}</p>

              {specs && typeof specs === 'object' && Object.keys(specs).length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f7f7f7', padding: '10px 12px', borderRadius: 6, cursor: 'pointer' }} onClick={() => setSpecsOpen(s => !s)}>
                    <div style={{ fontWeight: 700 }}>Specifikat e Produktit</div>
                    <div style={{ fontSize: 14, color: '#666' }}>{specsOpen ? '▾' : '▸'}</div>
                  </div>

                  {specsOpen && (
                    <div style={{ marginTop: 8, border: '1px solid #eee', borderRadius: 6, overflow: 'hidden' }}>
                      <div style={{ background: '#fafafa', padding: '8px 12px', borderBottom: '1px solid #eee', fontWeight: 700 }}>Specifikimet</div>
                      <div>
                        {Object.entries(specs).map(([k, v], idx) => (
                          <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderBottom: idx !== Object.keys(specs).length - 1 ? '1px solid #f0f0f0' : 'none', background: '#fff' }}>
                            <div style={{ color: '#333' }}>{k}</div>
                            <div style={{ color: '#333', textAlign: 'right', minWidth: 120 }}>{String(v)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <aside style={{ position: 'relative' }}>
            <div style={{ position: 'sticky', top: 20 }}>
              <div className="buybox">
                {/* Price block */}
                <div>
                  {product.offerPrice ? (
                    <div className="price-old">{Number(product.price).toLocaleString('en-US')} LEKË</div>
                  ) : null}
                  <div className="price-large">
                    {(() => {
                      const value = Number(product.offerPrice || product.salePrice || product.price || 0);
                      const parts = value.toFixed(2).split('.');
                      return (<>
                        <div className="price-int">{parts[0]}</div>
                        <div className="price-dec">{parts[1]}</div>
                      </>);
                    })()}
                  </div>
                  <div className="price-subtext">Kosto shtesë shërbime: {(() => { const sum = (selectedServiceIds || []).reduce((s, id) => { const svc = availableServices.find(x => String(x.id) === String(id)); return s + (svc ? Number(svc.price || 0) : 0); }, 0); return `${String(sum.toLocaleString('en-US')).replace(/,/g, ' ')} L`; })()}</div>
                </div>

                {/* Services list (product-linked) */}
              {availableServices && availableServices.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>Shërbimet</div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {availableServices.map(s => {
                      const checked = (selectedServiceIds || []).includes(s.id);
                      return (
                        <div key={s.id} className="service-row">
                          <div className="service-left">
                            <div style={{ fontWeight: 700 }}>{s.name}</div>
                            {s.description ? <div style={{ fontSize: 12, color: '#666' }}>{s.description}</div> : null}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                            <div className="service-price">{String(Number(s.price || 0).toLocaleString('en-US')).replace(/,/g, ' ')} L</div>
                            <button
                              onClick={() => {
                                const next = new Set(selectedServiceIds || []);
                                if (next.has(s.id)) next.delete(s.id); else next.add(s.id);
                                setSelectedServiceIds(Array.from(next));
                              }}
                              aria-pressed={checked}
                              aria-label={checked ? `Selected ${s.name}` : `Select ${s.name}`}
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: 999,
                                border: checked ? '6px solid #0b74de' : '2px solid #cfe8ff',
                                background: checked ? '#0b74de' : '#fff',
                                padding: 0,
                                cursor: 'pointer'
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* CTA, qty and wishlist */}
              <div style={{ marginTop: 16 }}>
                <button onClick={handleAddToCart} className="buy-cta">BLI TANI</button>
                <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
                  <div className="qty-control">
                    <button onClick={() => setQty(q => Math.max(1, q - 1))}>-</button>
                    <div style={{ padding: '8px 12px', minWidth: 44, textAlign: 'center' }}>{qty}</div>
                    <button onClick={() => setQty(q => q + 1)}>+</button>
                  </div>
                  <button onClick={toggleWishlist} className="icon-btn">{inWishlist ? '❤️' : '♡'}</button>
                  <button onClick={handleAddToCart} title="Add to cart" className="icon-btn">🛒</button>
                </div>
              </div>

              <div style={{ marginTop: 12, color: '#666', fontSize: 13 }}>
                {product.ratingAvg ? `${product.ratingAvg} / 5 (${product.ratingCount || 0} votes)` : 'No rating yet'}
              </div>
            </div>
          </div>
          </aside>
        </div>

        {/* Services modal */}
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
      </div>
    </main>
  );
}


