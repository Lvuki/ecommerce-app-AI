import React, { useEffect, useState, useMemo } from 'react';
import { isAdmin, getToken } from '../services/authService';
import API_BASE_URL from '../config';
import { useNavigate } from 'react-router-dom';

function formatDate(d) {
  const dt = new Date(d);
  return `${dt.getMonth()+1}/${dt.getDate()}`;
}

function BarChart({ data = [], width = 700, height = 220 }) {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  const padding = 20;
  // compute a chartWidth that grows with number of bars but allows responsive display
  const chartWidth = Math.max(300, data.length * 48 + padding * 2);
  const innerW = chartWidth - padding * 2;
  const innerH = height - padding * 2;
  const barWidth = innerW / data.length * 0.7;
  const gap = innerW / data.length * 0.3;

  return (
    <svg viewBox={`0 0 ${chartWidth} ${height}`} width="100%" height={height} preserveAspectRatio="xMinYMin meet" style={{ background: 'linear-gradient(180deg,#fff,#f8fbff)', borderRadius: 8 }}>
      <defs>
        <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      {data.map((d, i) => {
        const x = padding + i * (barWidth + gap) + gap/2;
        const h = (d.value / max) * innerH;
        const y = padding + (innerH - h);
        return (
          <g key={d.label}>
            <rect x={x} y={y} width={barWidth} height={h} rx={4} fill="url(#g1)">
              <title>{`${d.label}: $${d.value.toFixed(2)}`}</title>
            </rect>
            <text x={x + barWidth/2} y={padding + innerH + 14} fontSize={11} fill="#444" textAnchor="middle">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function AdminReports() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  // date range state (ISO yyyy-mm-dd)
  const today = new Date();
  const isoToday = today.toISOString().slice(0,10);
  const defaultStart = (() => { const d = new Date(); d.setDate(d.getDate() - 13); return d.toISOString().slice(0,10); })();
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(isoToday);
  const [preset, setPreset] = useState('14');

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/login');
      return;
    }
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        const token = getToken();
        const qs = new URLSearchParams();
        if (startDate) qs.set('start', startDate);
        if (endDate) qs.set('end', endDate);
        const url = `${API_BASE_URL}/orders?${qs.toString()}`;
        const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
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
    const id = setInterval(load, 5000); // polling
    return () => { mounted = false; clearInterval(id); };
  }, [navigate, startDate, endDate]);

  const filteredOrders = useMemo(() => {
    if (!startDate || !endDate) return orders;
    const s = new Date(startDate + 'T00:00:00Z');
    const e = new Date(endDate + 'T23:59:59Z');
    return orders.filter(o => {
      const t = new Date(o.createdAt);
      return t >= s && t <= e;
    });
  }, [orders, startDate, endDate]);

  const stats = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const revenue = filteredOrders.reduce((s, o) => s + Number(o.total || 0), 0);
    return { totalOrders, revenue };
  }, [filteredOrders]);

  // compute daily revenue for the selected range
  const lastDays = useMemo(() => {
    // construct map from startDate..endDate
    if (!startDate || !endDate) return [];
    const s = new Date(startDate + 'T00:00:00Z');
    const e = new Date(endDate + 'T00:00:00Z');
    const map = new Map();
    let curr = new Date(s);
    while (curr <= e) {
      const key = curr.toISOString().slice(0,10);
      map.set(key, 0);
      curr.setDate(curr.getDate() + 1);
    }
    filteredOrders.forEach(o => {
      const k = (new Date(o.createdAt)).toISOString().slice(0,10);
      if (map.has(k)) map.set(k, map.get(k) + Number(o.total || 0));
    });
    return Array.from(map.entries()).map(([k,v]) => ({ label: formatDate(k), value: v }));
  }, [filteredOrders, startDate, endDate]);

  // compute top 10 products by quantity sold in the filtered orders
  // top products are fetched from server-side aggregation
  const [topProducts, setTopProducts] = useState([]);
  const [loadingTop, setLoadingTop] = useState(true);

  // defensive: ensure topProducts is an array before rendering
  const topArr = Array.isArray(topProducts) ? topProducts : [];

  useEffect(() => {
    if (!Array.isArray(topProducts) && topProducts && Object.keys(topProducts).length) {
      console.warn('AdminReports: topProducts is not an array, received:', topProducts);
    }
  }, [topProducts]);

  useEffect(() => {
    let mounted = true;
    async function loadTop() {
      try {
        setLoadingTop(true);
        const token = getToken();
        const qs = new URLSearchParams();
        if (startDate) qs.set('start', startDate);
        if (endDate) qs.set('end', endDate);
        qs.set('limit', '10');
        const url = `${API_BASE_URL}/orders/top-products?${qs.toString()}`;
        const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        const data = await res.json();
        if (!mounted) return;
        setTopProducts(data || []);
      } catch (err) {
        console.error('Failed to load top products', err);
        if (mounted) setTopProducts([]);
      } finally {
        if (mounted) setLoadingTop(false);
      }
    }
    loadTop();
    return () => { mounted = false; };
  }, [startDate, endDate]);

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Reports & Dashboard</h2>
        <div style={{ color: '#666' }}>Last updated: {new Date().toLocaleTimeString()}</div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'stretch' }}>
        <div style={{ padding: 12, background: '#fff', border: '1px solid #eee', borderRadius: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Date range</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ display: 'flex', flexDirection: 'column' }}>
              Start
              <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPreset('custom'); }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column' }}>
              End
              <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPreset('custom'); }} />
            </label>
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
            <button
              onClick={() => { const d = new Date(); const e = d.toISOString().slice(0,10); d.setDate(d.getDate()-6); const s = d.toISOString().slice(0,10); setStartDate(s); setEndDate(e); setPreset('7'); }}
              style={{ background: preset === '7' ? '#eef2ff' : undefined }}
            >Last 7</button>
            <button
              onClick={() => { const d = new Date(); const e = d.toISOString().slice(0,10); d.setDate(d.getDate()-13); const s = d.toISOString().slice(0,10); setStartDate(s); setEndDate(e); setPreset('14'); }}
              style={{ background: preset === '14' ? '#eef2ff' : undefined }}
            >Last 14</button>
            <button
              onClick={() => { const d = new Date(); const e = d.toISOString().slice(0,10); d.setDate(d.getDate()-29); const s = d.toISOString().slice(0,10); setStartDate(s); setEndDate(e); setPreset('30'); }}
              style={{ background: preset === '30' ? '#eef2ff' : undefined }}
            >Last 30</button>
            <button
              onClick={() => { setStartDate(defaultStart); setEndDate(isoToday); setPreset('14'); }}
              style={{ background: preset === '14' ? '#f3f4f6' : undefined }}
            >Reset</button>
          </div>
        </div>
        <div style={{ padding: 16, border: '1px solid #eee', borderRadius: 10, minWidth: 220, background: '#fff' }}>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{stats.totalOrders}</div>
          <div style={{ color: '#666' }}>Total Orders</div>
        </div>
        <div style={{ padding: 16, border: '1px solid #eee', borderRadius: 10, minWidth: 220, background: '#fff' }}>
          <div style={{ fontSize: 24, fontWeight: 800 }}>${stats.revenue.toFixed(2)}</div>
          <div style={{ color: '#666' }}>Revenue</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ padding: 12, border: '1px solid #eee', borderRadius: 10, background: '#fff' }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Revenue ({startDate} → {endDate})</div>
            {loading ? <div>Loading chart...</div> : <BarChart data={lastDays} width={800} height={260} />}
          </div>
        </div>
      </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, padding: 12, border: '1px solid #eee', borderRadius: 10, background: '#fff' }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Top 10 Products ({startDate} → {endDate})</div>
            {loadingTop ? <div>Loading...</div> : (
              <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {topArr.length === 0 ? <div style={{ color: '#666' }}>No products sold in this range.</div> : topArr.map((p, i) => (
                  <li key={p.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{ width: 48, height: 48, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, overflow: 'hidden' }}>
                      {p.product && p.product.image ? <img src={p.product.image} alt={p.product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ fontSize: 12, color: '#999' }}>No image</div>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>{p.product && p.product.name ? p.product.name : 'Product ' + p.id}</div>
                      <div style={{ color: '#666', fontSize: 13 }}>{p.qty} sold • ${Number(p.revenue || 0).toFixed(2)}</div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

      <div style={{ marginTop: 18 }}>
        <p style={{ color: '#666' }}>This dashboard polls the orders endpoint every 5s to provide near real-time numbers. For production, consider using WebSockets or Server-Sent Events for push updates.</p>
      </div>
    </div>
  );
}
