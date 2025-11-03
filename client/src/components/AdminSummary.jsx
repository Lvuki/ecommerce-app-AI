import React, { useEffect, useState, useMemo, useRef } from 'react';
import API_BASE_URL from '../config';
import { getToken } from '../services/authService';

function SparkLine({ data = [], width = 360, height = 60, color = '#60a5fa' }) {
  const padding = 6;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  // ensure we always have an array so hooks are called in same order
  const safeData = Array.isArray(data) ? data : [];
  const values = safeData.map(d => Number(d.value || 0));
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  // compute points
  const points = values.map((v, i) => {
    const x = padding + (i / Math.max(1, data.length - 1)) * innerW;
    const y = padding + innerH - ((v - min) / range) * innerH;
    return { x, y, v, i };
  });

  // path
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${padding + innerW} ${padding + innerH} L ${padding} ${padding + innerH} Z`;

  const containerRef = useRef(null);
  const [hover, setHover] = useState({ over: false, idx: -1, x: 0, y: 0 });

  useEffect(() => {
    function onLeave() { setHover({ over: false, idx: -1, x: 0, y: 0 }); }
    const el = containerRef.current;
    if (el) el.addEventListener('mouseleave', onLeave);
    return () => { if (el) el.removeEventListener('mouseleave', onLeave); };
  }, []);

  function handleMove(e) {
    const rect = containerRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left - padding;
    // find nearest point
    let nearest = 0; let best = Infinity;
    points.forEach((p, i) => { const d = Math.abs(p.x - (mx + padding)); if (d < best) { best = d; nearest = i; } });
    const p = points[nearest] || { x: padding, y: padding + innerH/2, v: 0 };
    setHover({ over: true, idx: nearest, x: p.x + rect.left, y: p.y + rect.top, v: p.v });
  }

  return (
    <div style={{ position: 'relative', width, height }} ref={containerRef} onMouseMove={handleMove}>
      <svg width={width} height={height}>
        <defs>
          <linearGradient id="gLineArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0.03" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#gLineArea)" stroke="none" />
        <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {points.map(p => (
          <circle key={p.i} cx={p.x} cy={p.y} r={2} fill={color} />
        ))}
        {hover.over && hover.idx >= 0 && (() => {
          const p = points[hover.idx] || { x: padding, y: padding + innerH/2 };
          return (
            <g key={'hover'}>
              <line x1={p.x} x2={p.x} y1={padding} y2={padding + innerH} stroke="#ddd" strokeDasharray="3 3" />
              <circle cx={p.x} cy={p.y} r={4} fill="#fff" stroke={color} strokeWidth={2} />
            </g>
          );
        })()}
      </svg>
      {hover.over && hover.idx >= 0 && (
        <div style={{ position: 'fixed', left: hover.x + 10, top: hover.y - 28, background: '#111', color: '#fff', padding: '6px 8px', borderRadius: 6, fontSize: 12, pointerEvents: 'none', zIndex: 9999 }}>
          <div style={{ fontWeight: 700 }}>${hover.v.toFixed(2)}</div>
          <div style={{ opacity: 0.8, fontSize: 11 }}>{safeData[hover.idx] && safeData[hover.idx].label}</div>
        </div>
      )}
    </div>
  );
}

export default function AdminSummary({ days = 7 }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const token = getToken();

    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/orders`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        const data = await res.json();
        if (!mounted) return;
        setOrders(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('AdminSummary load error', e);
        if (mounted) setOrders([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    const id = setInterval(load, 10000);
    return () => { mounted = false; clearInterval(id); };
  }, [days]);

  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const revenue = orders.reduce((s, o) => s + Number(o.total || 0), 0);
    return { totalOrders, revenue };
  }, [orders]);

  const series = useMemo(() => {
    const map = new Map();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      map.set(d.toISOString().slice(0,10), 0);
    }
    orders.forEach(o => {
      const k = (new Date(o.createdAt)).toISOString().slice(0,10);
      if (map.has(k)) map.set(k, map.get(k) + Number(o.total || 0));
    });
    return Array.from(map.entries()).map(([k,v]) => ({ label: k, value: v }));
  }, [orders, days]);

  const seriesOrders = useMemo(() => {
    const map = new Map();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      map.set(d.toISOString().slice(0,10), 0);
    }
    orders.forEach(o => {
      const k = (new Date(o.createdAt)).toISOString().slice(0,10);
      if (map.has(k)) map.set(k, map.get(k) + 1);
    });
    return Array.from(map.entries()).map(([k,v]) => ({ label: k, value: v }));
  }, [orders, days]);

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12 }}>
      <div style={{ padding: 12, borderRadius: 8, background: '#fff', border: '1px solid #eee', minWidth: 140 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>{loading ? '—' : stats.totalOrders}</div>
        <div style={{ color: '#666' }}>Orders (last {days}d)</div>
      </div>

      <div style={{ padding: 12, borderRadius: 8, background: '#fff', border: '1px solid #eee', minWidth: 160 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>${loading ? '—' : stats.revenue.toFixed(2)}</div>
        <div style={{ color: '#666' }}>Revenue (last {days}d)</div>
      </div>

      <div style={{ flex: 1, display: 'flex', gap: 12 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ padding: 10, borderRadius: 8, background: '#fff', border: '1px solid #eee' }}>
            <div style={{ fontSize: 13, color: '#444', marginBottom: 6 }}>Revenue trend</div>
            <SparkLine data={series} width={360} height={60} color="#06b6d4" />
          </div>
          <div style={{ padding: 10, borderRadius: 8, background: '#fff', border: '1px solid #eee' }}>
            <div style={{ fontSize: 13, color: '#444', marginBottom: 6 }}>Orders trend</div>
            <SparkLine data={seriesOrders} width={360} height={60} color="#f97316" />
          </div>
        </div>
      </div>
    </div>
  );
}
