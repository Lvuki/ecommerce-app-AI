import React, { useEffect, useState } from 'react';
import wishlistService from '../services/wishlistService';
import cartService from '../services/cartService';
import { useCurrency } from '../context/CurrencyContext';
import { Link, useNavigate } from 'react-router-dom';

export default function Wishlist() {
  const { formatPrice } = useCurrency();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  useEffect(() => {
    let mounted = true;
    wishlistService.getWishlist().then(list => { if (mounted) setItems(list); }).catch(() => { }).finally(() => { if (mounted) setLoading(false); });
    const onUpdate = (e) => { setItems(e && e.detail && e.detail.items ? e.detail.items : []); };
    window.addEventListener('wishlistUpdated', onUpdate);
    return () => { mounted = false; window.removeEventListener('wishlistUpdated', onUpdate); };
  }, []);

  const moveToCart = async (item) => {
    try {
      await cartService.addItem({ id: item.id, name: item.name, price: item.price, image: item.image }, 1);
      await wishlistService.removeItem(item.id);
      alert('Moved to cart');
      nav('/cart');
    } catch (err) { console.error(err); alert('Failed to move to cart'); }
  };

  if (loading) return <div style={{ padding: 20 }}>Loading wishlist...</div>;
  return (
    <div className="page-container" style={{ maxWidth: 1200, margin: '0 auto', padding: '20px' }}>
      <h2>My Wishlist</h2>
      {!items || !items.length ? (
        <div style={{ padding: 20 }}>Your wishlist is empty. <Link to="/products">Browse products</Link></div>
      ) : (
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 20px', minWidth: 800 }}>
            <thead>
              <tr style={{ background: '#5bc0de', color: '#fff', textAlign: 'center', height: 50 }}>
                <th style={{ padding: '10px', borderRadius: '6px 0 0 6px', textAlign: 'left', paddingLeft: 40, width: '50%' }}>Emri & Përshkrimi</th>
                <th style={{ padding: '10px', width: '20%' }}>Çmimi</th>
                <th style={{ padding: '10px', borderRadius: '0 6px 6px 0', width: '30%' }}>Veprimi</th>
              </tr>
            </thead>
            <tbody>
              {items.map(it => (
                <tr key={it.id} style={{ background: '#fff' }}>
                  <td style={{ padding: '20px', borderBottom: '1px solid #eee' }}>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                      <img
                        src={it.image && it.image.startsWith('http') ? it.image : `http://localhost:4000${it.image}`}
                        alt={it.name}
                        style={{ width: 80, height: 80, objectFit: 'contain' }}
                      />
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{it.name}</div>
                    </div>
                  </td>
                  <td style={{ padding: '20px', textAlign: 'center', fontWeight: 700, borderBottom: '1px solid #eee' }}>
                    {formatPrice(it.price || 0)}
                  </td>
                  <td style={{ padding: '20px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                      <button
                        onClick={() => moveToCart(it)}
                        style={{
                          background: '#0b79d0',
                          color: '#fff',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: 20,
                          cursor: 'pointer',
                          fontWeight: 600
                        }}
                      >
                        🛒 Move to cart
                      </button>
                      <button
                        onClick={() => wishlistService.removeItem(it.id).then(list => setItems(list)).catch(() => alert('Failed'))}
                        style={{
                          background: 'transparent',
                          color: '#c00',
                          border: '1px solid #c00',
                          padding: '8px 16px',
                          borderRadius: 20,
                          cursor: 'pointer',
                          fontWeight: 600
                        }}
                      >
                        ✕ Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
