import React, { useEffect, useState } from 'react';
import { getCart, updateQty, removeItem, clearCart } from '../services/cartService';
import API_BASE_URL from '../config';
import { Link, useNavigate } from 'react-router-dom';

export default function CartPage() {
  const [items, setItems] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    async function load() {
      const data = await getCart();
      if (mounted) setItems(data);
    }
    load();

    const onStorage = async () => { const d = await getCart(); setItems(d); };
    window.addEventListener('storage', onStorage);
    return () => { mounted = false; window.removeEventListener('storage', onStorage); };
  }, []);

  const handleQty = async (id, qty) => {
    try {
      const next = await updateQty(id, Number(qty));
      setItems(next);
    } catch (err) {
      console.error(err);
      alert('Failed to update quantity');
    }
  };

  const handleRemove = async (id) => {
    try {
      const next = await removeItem(id);
      setItems(next);
    } catch (err) {
      console.error(err);
      alert('Failed to remove item');
    }
  };

  const total = items.reduce((s, it) => s + (it.price || 0) * (it.qty || 0), 0);

  const handleCheckout = async () => {
    try {
      await clearCart();
      setItems([]);
      alert('Order placed (simulation). Thank you!');
      navigate('/');
    } catch (err) {
      console.error(err);
      alert('Failed to checkout');
    }
  };

  if (!items || items.length === 0) return (
    <div className="page-container">
      <h2>Your Cart</h2>
      <div>Your cart is empty. <Link to="/products">Browse products</Link></div>
    </div>
  );

  return (
    <div className="page-container">
      <h2>Your Cart</h2>
      <div className="table-responsive">
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
            <th style={{ padding: 8 }}>Product</th>
            <th style={{ padding: 8 }}>Price</th>
            <th style={{ padding: 8 }}>Qty</th>
            <th style={{ padding: 8 }}>Subtotal</th>
            <th style={{ padding: 8 }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} style={{ borderBottom: '1px solid #f3f3f3' }}>
              <td style={{ padding: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {it.image ? <img src={it.image.startsWith('http') ? it.image : `${API_BASE_URL.replace(/\/api$/, '')}${it.image}`} alt={it.name} style={{ height: 60, width: 60, objectFit: 'cover', borderRadius: 4 }} /> : null}
                  <div>
                    <div style={{ fontWeight: 700 }}>{it.name}</div>
                    <div style={{ color: '#666', fontSize: 13 }}>{it.sku}</div>
                  </div>
                </div>
              </td>
              <td style={{ padding: 8 }}>${it.price}</td>
              <td style={{ padding: 8 }}>
                <input type="number" value={it.qty} min={0} onChange={(e) => handleQty(it.id, e.target.value)} style={{ width: 80 }} />
              </td>
              <td style={{ padding: 8 }}>${((it.price || 0) * (it.qty || 0)).toFixed(2)}</td>
              <td style={{ padding: 8 }}>
                <button onClick={() => handleRemove(it.id)} style={{ color: 'red' }}>Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700 }}>Total: ${total.toFixed(2)}</div>
        <div>
          <button onClick={async () => { try { await clearCart(); setItems([]); } catch (err) { console.error(err); alert('Failed to clear cart'); } }}>Clear</button>
          <button onClick={handleCheckout} style={{ marginLeft: 8 }}>Checkout</button>
        </div>
      </div>
    </div>
  );
}
