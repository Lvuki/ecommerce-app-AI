import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { addItem } from "../services/cartService";
import wishlistService from '../services/wishlistService';
import { getProductById, rateProduct } from "../services/productService";
import { getToken } from '../services/authService';

export default function ProductView() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [mainIndex, setMainIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inWishlist, setInWishlist] = useState(false);
  const [ratingLoading, setRatingLoading] = useState(false);

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
        }
      })
      .catch(() => setError("Failed to load product"))
      .finally(() => setLoading(false));
  }, [id]);

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
    <div className="page-container" style={{ marginTop: 20, padding: '0 12px' }}>
      <Link to="/" style={{ textDecoration: 'none' }}>← Back to Home</Link>
      <div className="two-col" style={{ marginTop: 16 }}>
        <div>
          <div style={{ border: '1px solid #eee', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
            {imageUrl ? (
              <img src={imageUrl} alt={product.name} style={{ width: '100%', height: 480, objectFit: 'cover', background: '#fafafa' }} />
            ) : (
              <div style={{ width: '100%', height: 480, background: '#fafafa' }} />
            )}
          </div>

          {resolvedImages && resolvedImages.length >= 1 ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {resolvedImages.map((src, i) => (
                <button key={i} onClick={() => setMainIndex(i)} style={{ border: mainIndex === i ? '2px solid #0b74de' : '1px solid #eee', padding: 0, background: '#fff', borderRadius: 6 }}>
                  <img src={src} alt={`thumb-${i}`} style={{ width: 80, height: 60, objectFit: 'cover', display: 'block', borderRadius: 4 }} />
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div>
          <h1 style={{ marginTop: 0 }}>{product.name}</h1>
          <div style={{ color: '#666' }}>{product.brand || product.category}</div>
          {/* Rating: accessible star component with keyboard support and nicer visuals */}
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div role="radiogroup" aria-label={`Rate ${product.name}`} style={{ display: 'flex', gap: 6 }}>
              {Array.from({ length: 5 }).map((_, i) => {
                const idx = i + 1;
                const avg = Number(product.ratingAvg || 0);
                // per-star fill percentage (0..100)
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

          {/* helper: submitRating moved to function scope so buttons can call it */}
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
            <button onClick={async () => { try { const priceToUse = (product.offerPrice && Number(product.offerPrice) > 0) ? product.offerPrice : ((product.salePrice && Number(product.salePrice) > 0) ? product.salePrice : product.price); await addItem({ id: product.id, name: product.name, price: priceToUse, image: product.image, sku: product.sku }, 1); alert('Added to cart'); } catch (err) { console.error(err); alert('Failed to add to cart'); } }}>
              🛒 Add to Cart
            </button>
            <button onClick={async () => { try { const priceToUse = (product.offerPrice && Number(product.offerPrice) > 0) ? product.offerPrice : ((product.salePrice && Number(product.salePrice) > 0) ? product.salePrice : product.price); await addItem({ id: product.id, name: product.name, price: priceToUse, image: product.image, sku: product.sku }, 1); window.location.href = '/cart'; } catch (err) { console.error(err); alert('Failed to add to cart'); } }} style={{ background: '#0b79d0', color: '#fff' }}>
              💳 Buy Now
            </button>
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
        </div>
      </div>
    </div>
  );
}


