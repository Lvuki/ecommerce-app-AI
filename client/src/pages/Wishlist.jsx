import React, { useEffect, useState } from 'react';
import wishlistService from '../services/wishlistService';
import cartService from '../services/cartService';
import { Link, useNavigate } from 'react-router-dom';

export default function Wishlist() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  useEffect(() => {
    let mounted = true;
    wishlistService.getWishlist().then(list => { if (mounted) setItems(list); }).catch(() => {}).finally(() => { if (mounted) setLoading(false); });
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
    <div className="page-container" style={{ padding: '12px' }}>
      <h2>My Wishlist</h2>
      {!items || !items.length ? (
        <div style={{ padding: 20 }}>Your wishlist is empty. <Link to="/products">Browse products</Link></div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {items.map(it => (
            <div key={it.id} style={{ display: 'flex', gap: 12, alignItems: 'center', border: '1px solid #eee', padding: 12, borderRadius: 8 }}>
              <img src={it.image && it.image.startsWith('http') ? it.image : `http://localhost:4000${it.image}`} alt={it.name} style={{ width: 96, height: 72, objectFit: 'cover', borderRadius: 6 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{it.name}</div>
                <div style={{ color: '#666' }}>${Number(it.price || 0).toFixed(2)}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => moveToCart(it)}>🛒 Move to cart</button>
                <button onClick={() => wishlistService.removeItem(it.id).then(list => setItems(list)).catch(() => alert('Failed'))}>✕ Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
