import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { searchProducts } from '../services/productService';
import { addItem } from '../services/cartService';

export default function OffersPage() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    setError('');
    searchProducts({ offer: 'true' })
      .then((res) => setProducts(res || []))
      .catch(() => setError('Failed to load offers'))
      .finally(() => setLoading(false));
  }, []);

  function formatEndsIn(iso) {
    if (!iso) return null;
    const to = new Date(iso);
    const now = new Date();
    let diff = to - now;
    if (isNaN(diff)) return null;
    if (diff <= 0) return 'Ended';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    diff -= days * (1000 * 60 * 60 * 24);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (days > 0) return `Ends in ${days}d ${hours}h`;
    const minutes = Math.floor(diff / (1000 * 60));
    if (hours > 0) return `Ends in ${hours}h ${minutes}m`;
    return `Ends in ${minutes}m`;
  }

  return (
    <div className="page-container">
      <h1>Current Offers</h1>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div style={{ color: 'red' }}>{error}</div>
      ) : products.length === 0 ? (
        <div style={{ color: '#666' }}>No active offers right now.</div>
      ) : (
        <div className="responsive-grid">
          {products.map(p => (
            <div key={p.id} style={{ border: '1px solid #eee', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
              {p.image ? (
                <img src={p.image?.startsWith('http') ? p.image : `http://localhost:4000${p.image}`} alt={p.name} style={{ width: '100%', height: 150, objectFit: 'cover', background: '#fafafa' }} />
              ) : (
                <div style={{ width: '100%', height: 150, background: '#fafafa' }} />
              )}
              <div style={{ padding: 12 }}>
                <div style={{ fontWeight: 600 }}>{p.name}</div>
                <div style={{ color: '#666', fontSize: 14 }}>{p.brand || p.category}</div>
                <div style={{ marginTop: 8 }}>
                  {p.offerPrice && Number(p.offerPrice) > 0 ? (
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 18, color: '#d32' }}>${Number(p.offerPrice).toFixed(2)}</div>
                      <div style={{ textDecoration: 'line-through', color: '#888', fontSize: 13 }}>${Number(p.price).toFixed(2)}</div>
                    </div>
                  ) : p.salePrice && Number(p.salePrice) > 0 && Number(p.salePrice) !== Number(p.price) ? (
                    <div>
                      <div style={{ fontWeight: 700 }}>${Number(p.salePrice).toFixed(2)}</div>
                      <div style={{ textDecoration: 'line-through', color: '#888', fontSize: 13 }}>${Number(p.price).toFixed(2)}</div>
                    </div>
                  ) : (
                    <div style={{ fontWeight: 700 }}>${Number(p.price).toFixed(2)}</div>
                  )}
                </div>
                  {p.offerTo ? (
                    <div style={{ marginTop: 6, color: '#c00', fontSize: 13 }}>{formatEndsIn(p.offerTo)}</div>
                  ) : null}
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Link to={`/products/${p.id}`} style={{ border: '1px solid #111', padding: '6px 10px', borderRadius: 6, color: '#111', textDecoration: 'none' }}>View</Link>
                    <button onClick={async () => { try { const priceToUse = (p.offerPrice && Number(p.offerPrice) > 0) ? p.offerPrice : ((p.salePrice && Number(p.salePrice) > 0) ? p.salePrice : p.price); await addItem({ id: p.id, name: p.name, price: priceToUse, image: p.image, sku: p.sku }, 1); alert('Added to cart'); } catch (err) { console.error(err); alert('Failed to add to cart'); } }} style={{ background: '#fff', border: '1px solid #e6e6e6', padding: '6px 8px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>🛒 Add</button>
                    <button onClick={async () => { try { const priceToUse = (p.offerPrice && Number(p.offerPrice) > 0) ? p.offerPrice : ((p.salePrice && Number(p.salePrice) > 0) ? p.salePrice : p.price); await addItem({ id: p.id, name: p.name, price: priceToUse, image: p.image, sku: p.sku }, 1); navigate('/cart'); } catch (err) { console.error(err); alert('Failed to add to cart'); } }} style={{ background: '#0b79d0', color: '#fff', borderRadius: 6, padding: '6px 10px', fontSize: 13, border: 'none', cursor: 'pointer', boxShadow: '0 2px 6px rgba(11,121,208,0.18)' }}>💳 Buy</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
