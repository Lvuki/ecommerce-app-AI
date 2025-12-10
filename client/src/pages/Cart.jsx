import React, { useEffect, useState } from 'react';
import { getCart, updateQty, removeItem, clearCart, updateItemServices } from '../services/cartService';
import API_BASE_URL from '../config';
import { useCurrency } from '../context/CurrencyContext';
import { Link, useNavigate } from 'react-router-dom';

export default function CartPage() {
  const { formatPrice } = useCurrency();
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

  const handleRemoveService = async (item, svc) => {
    // optimistic UI update
    const newServices = (item.services || []).filter(s => String((s && s.id) || s) !== String((svc && svc.id) || svc));
    const optimistic = items.map(it => {
      if (it === item || (String(it.id) === String(item.id) && JSON.stringify(it.services || []) === JSON.stringify(item.services || []))) {
        return {
          ...it, services: newServices, price: (() => {
            const servicesSum = Array.isArray(newServices) ? newServices.reduce((ss, sv) => ss + Number((sv && sv.price) || 0), 0) : 0;
            const productPrice = (it.productPrice !== undefined && it.productPrice !== null) ? Number(it.productPrice) : (Number(it.price || 0) - (Array.isArray(it.services) ? it.services.reduce((s, sv) => s + Number((sv && sv.price) || 0), 0) : 0));
            return Number(productPrice) + Number(servicesSum || 0);
          })()
        };
      }
      return it;
    });
    setItems(optimistic);

    try {
      const next = await updateItemServices(item, newServices);
      setItems(next);
    } catch (err) {
      console.error('Failed to update services', err);
      alert(err && err.message ? err.message : 'Failed to update services');
      // revert optimistic update by reloading cart
      try { const d = await getCart(); setItems(d); } catch (_) { }
    }
  };


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

  const total = items.reduce((s, it) => {
    const servicesSum = Array.isArray(it.services) ? it.services.reduce((ss, sv) => ss + Number((sv && sv.price) || 0), 0) : 0;
    const productPrice = (it.productPrice !== undefined && it.productPrice !== null) ? Number(it.productPrice) : (Number(it.price || 0) - servicesSum);
    return s + (productPrice + servicesSum) * (it.qty || 0);
  }, 0);

  if (!items || items.length === 0) return (
    <div className="page-container" style={{ maxWidth: 1200, margin: '0 auto', padding: '20px' }}>
      <h2>Your Cart</h2>
      <div style={{ padding: 20 }}>Your cart is empty. <Link to="/products">Browse products</Link></div>
    </div>
  );

  return (
    <div className="page-container" style={{ maxWidth: 1200, margin: '0 auto', padding: '20px' }}>
      <h2>Your Cart</h2>
      <div className="table-responsive">
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 20px', minWidth: 800 }}>
          <thead>
            <tr style={{ background: '#5bc0de', color: '#fff', textAlign: 'center', height: 50 }}>
              <th style={{ padding: '10px', borderRadius: '6px 0 0 6px', textAlign: 'left', paddingLeft: 40, width: '50%' }}>Product & Description</th>
              <th style={{ padding: '10px', width: '15%' }}>Price</th>
              <th style={{ padding: '10px', width: '10%' }}>Qty</th>
              <th style={{ padding: '10px', width: '15%' }}>Subtotal</th>
              <th style={{ padding: '10px', borderRadius: '0 6px 6px 0', width: '10%' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map(it => (
              <tr key={it.id} style={{ background: '#fff' }}>
                <td style={{ padding: '20px', borderBottom: '1px solid #eee' }}>
                  <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                    <img
                      src={it.image && it.image.startsWith('http') ? it.image : `${API_BASE_URL.replace(/\/api$/, '')}${it.image}`}
                      alt={it.name}
                      style={{ width: 80, height: 80, objectFit: 'contain' }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{it.name}</div>
                      <div style={{ color: '#666', fontSize: 13 }}>{it.sku}</div>
                      {it.services && it.services.length ? (
                        <div style={{ marginTop: 8, fontSize: 13 }}>
                          <strong>Services:</strong>
                          <ul style={{ margin: '6px 0 0 14px' }}>
                            {it.services.map(s => (
                              <li key={s.id || s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ flex: 1 }}>{s.name || s} - {formatPrice(s.price || 0)}</span>
                                <button type="button" onClick={() => handleRemoveService(it, s)} aria-label={`Remove service ${s.name || s}`} title="Remove service" style={{ color: '#c00', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14, lineHeight: '1', padding: 2 }}>✕</button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td style={{ padding: '20px', textAlign: 'center', fontWeight: 700, borderBottom: '1px solid #eee' }}>
                  {(() => {
                    const servicesSum = Array.isArray(it.services) ? it.services.reduce((ss, sv) => ss + Number((sv && sv.price) || 0), 0) : 0;
                    const productPrice = (it.productPrice !== undefined && it.productPrice !== null) ? Number(it.productPrice) : (Number(it.price || 0) - servicesSum);
                    return formatPrice(productPrice);
                  })()}
                </td>
                <td style={{ padding: '20px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                  <input type="number" value={it.qty} min={0} onChange={(e) => handleQty(it.id, e.target.value)} style={{ width: 80 }} />
                </td>
                <td style={{ padding: '20px', textAlign: 'center', fontWeight: 700, borderBottom: '1px solid #eee' }}>
                  {(() => {
                    const servicesSum = Array.isArray(it.services) ? it.services.reduce((ss, sv) => ss + Number((sv && sv.price) || 0), 0) : 0;
                    const productPrice = (it.productPrice !== undefined && it.productPrice !== null) ? Number(it.productPrice) : (Number(it.price || 0) - servicesSum);
                    return formatPrice((productPrice + servicesSum) * (it.qty || 0));
                  })()}
                </td>
                <td style={{ padding: '20px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                    <button onClick={() => handleRemove(it.id)} style={{ background: 'transparent', color: '#c00', border: '1px solid #c00', padding: '8px 16px', borderRadius: 20, cursor: 'pointer', fontWeight: 600 }}>✕ Remove</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700 }}>Total: {formatPrice(total)}</div>
        <div>
          <button onClick={async () => { try { await clearCart(); setItems([]); } catch (err) { console.error(err); alert('Failed to clear cart'); } }} style={{ background: 'transparent', color: '#c00', border: '1px solid #c00', padding: '8px 16px', borderRadius: 20, cursor: 'pointer', fontWeight: 600 }}>Clear</button>
          <button onClick={handleCheckout} style={{ marginLeft: 8, background: '#0b79d0', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 20, cursor: 'pointer', fontWeight: 600 }}>Checkout</button>
        </div>
      </div>
    </div>
  );
}
