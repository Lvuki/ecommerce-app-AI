import React, { useEffect, useState, useRef } from 'react';
import { getProductById, searchProducts } from '../services/productService';

export default function ModuleRenderer({ mod }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        if (mod.type === 'products') {
          const cfg = mod.config || {};
          if (cfg.mode === 'manual') {
            const limit = cfg.limit || 20;
            const ids = (cfg.items || []).slice(0, limit);
            const found = [];
            for (const id of ids) {
              try { const p = await getProductById(id); if (p && p.id) found.push(p); } catch (_) {}
            }
            if (!mounted) return;
            setItems(found);
          } else if (cfg.mode === 'category') {
            try {
              const limit = cfg.limit || 24;
              // support multiple categories (cfg.categories) or legacy single category (cfg.category)
              if (Array.isArray(cfg.categories) && cfg.categories.length) {
                const seen = new Map();
                for (const c of cfg.categories) {
                  try {
                    const res = await searchProducts({ category: c, limit });
                    if (!mounted) return;
                    if (Array.isArray(res)) {
                      for (const p of res) {
                        if (!seen.has(p.id)) seen.set(p.id, p);
                      }
                    }
                    if (seen.size >= limit) break;
                  } catch (err) { console.error(err); }
                }
                if (!mounted) return;
                setItems(Array.from(seen.values()).slice(0, limit));
              } else if (cfg.category) {
                const res = await searchProducts({ category: cfg.category, limit });
                if (!mounted) return;
                setItems(Array.isArray(res) ? res : []);
              } else {
                setItems([]);
              }
            } catch (err) { console.error(err); }
          } else if (cfg.mode === 'offer') {
            try {
              const limit = cfg.limit || 24;
              // server supports offer=true to filter active offers
              const res = await searchProducts({ offer: 'true', limit });
              if (!mounted) return;
              setItems(Array.isArray(res) ? res : []);
            } catch (err) { console.error(err); }
          }
        }
      } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [mod]);

  useEffect(() => {
    if (mod.type !== 'slider') return;
    const slides = Array.isArray(mod.config) ? mod.config : (mod.config || []);
    if (!slides.length) return;
    timerRef.current = setInterval(() => setSlideIndex(i => (i + 1) % slides.length), 4000);
    return () => { clearInterval(timerRef.current); timerRef.current = null; };
  }, [mod]);

  if (mod.type === 'text') {
    return <div className="module-text" dangerouslySetInnerHTML={{ __html: mod.config?.text || '' }} />;
  }

  if (mod.type === 'image') {
    const url = mod.config?.url || '';
    return (
      <div style={{ textAlign: 'center' }}>
        <img src={url} alt={mod.config?.alt || ''} style={{ maxWidth: '100%', borderRadius: 8 }} />
      </div>
    );
  }

  if (mod.type === 'slider') {
    const slides = Array.isArray(mod.config) ? mod.config : [];
    if (!slides.length) return <div style={{ color: '#666' }}>No slides</div>;
    const idx = Math.max(0, Math.min(slideIndex, slides.length - 1));
    const s = slides[idx] || {};
    return (
      <div style={{ position: 'relative', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ overflow: 'hidden', borderRadius: 8 }}>
          <img src={s.image} alt={s.title || ''} style={{ width: '100%', height: 420, objectFit: 'cover', display: 'block' }} />
          {s.title ? <div style={{ position: 'absolute', left: 24, bottom: 24, color: '#fff', background: 'rgba(0,0,0,0.45)', padding: '8px 12px', borderRadius: 6, fontWeight: 700 }}>{s.title}</div> : null}
        </div>
        <button onClick={() => setSlideIndex(i => (i - 1 + slides.length) % slides.length)} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.35)', color: '#fff', border: 'none', padding: 8, borderRadius: 6, cursor: 'pointer' }}>‹</button>
        <button onClick={() => setSlideIndex(i => (i + 1) % slides.length)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.35)', color: '#fff', border: 'none', padding: 8, borderRadius: 6, cursor: 'pointer' }}>›</button>
      </div>
    );
  }

  if (mod.type === 'products') {
    if (loading) return <div>Loading products…</div>;
    if (!items || !items.length) return <div style={{ color: '#666' }}>No products found.</div>;
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 12 }}>
        {items.map(p => (
          <div key={p.id} style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
            {p.image ? <img src={p.image.startsWith('http') ? p.image : `http://localhost:4000${p.image}`} alt={p.name} style={{ width: '100%', height: 160, objectFit: 'cover' }} /> : <div style={{ height: 160, background: '#fafafa' }} />}
            <div style={{ padding: 10 }}>
              <div style={{ fontWeight: 700 }}>{p.name}</div>
              <div style={{ color: '#666' }}>${Number(p.price).toFixed(2)}</div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return null;
}
