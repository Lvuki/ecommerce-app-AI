import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAdmin, getToken } from '../services/authService';
import API_BASE_URL from '../config';

export default function AdminOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/login');
      return;
    }
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/orders`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        const data = await res.json();
        if (!mounted) return;
        setOrders(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [navigate]);

  if (loading) return <div style={{ padding: 20 }}>Loading orders...</div>;

  return (
    <div className="page-container">
      <h2>Orders</h2>
      <div style={{ marginTop: 12 }}>
        {orders.length === 0 ? <div>No orders found</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
                <th style={{ padding: 8 }}>Order ID</th>
                <th style={{ padding: 8 }}>User ID</th>
                <th style={{ padding: 8 }}>Status</th>
                <th style={{ padding: 8 }}>Total</th>
                <th style={{ padding: 8 }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} style={{ borderBottom: '1px solid #f3f3f3' }}>
                  <td style={{ padding: 8 }}>{o.id}</td>
                  <td style={{ padding: 8 }}>{o.userId}</td>
                  <td style={{ padding: 8 }}>{o.status}</td>
                  <td style={{ padding: 8 }}>${Number(o.total || 0).toFixed(2)}</td>
                  <td style={{ padding: 8 }}>{new Date(o.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
