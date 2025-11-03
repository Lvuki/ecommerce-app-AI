import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getPageBySlug } from '../services/pageService';
import { getProducts } from '../services/productService';
import ModuleRenderer from '../components/ModuleRenderer';

export default function StaticPage() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const sliderTimerRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const p = await getPageBySlug(slug);
        if (!mounted) return;
        if (!p) {
          setPage(null);
          setLoading(false);
          return;
        }
        setPage(p);
        if (p.type === 'products' && p.content && Array.isArray(p.content.items)) {
          const results = [];
          for (const id of p.content.items) {
            try {
              const res = await fetch(`/api/products/${id}`);
              if (res.ok) results.push(await res.json());
            } catch (_) { }
          }
          setProducts(results);
        }
        // if slider, reset slideIndex
        if (p.type === 'slider') {
          setSlideIndex(0);
        }
      } catch (err) { console.error(err); setError(err.message || 'Failed to load page'); }
      finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [slug]);

  // auto-advance slider when content is slider
  useEffect(() => {
    if (!page || page.type !== 'slider') return;
    const slides = Array.isArray(page.content) ? page.content : (typeof page.content === 'string' ? (() => { try { return JSON.parse(page.content); } catch (_) { return []; } })() : []);
    if (!slides || !slides.length) return;
    sliderTimerRef.current = setInterval(() => {
      setSlideIndex(i => (i + 1) % slides.length);
    }, 4000);
    return () => { clearInterval(sliderTimerRef.current); sliderTimerRef.current = null; };
  }, [page]);

  if (loading) return <div className="page-container">Loading...</div>;
  if (!page) return <div className="page-container"><h2>Page not found</h2><div style={{ color: '#666', marginTop: 8 }}>This page does not exist or is not visible.</div></div>;
  if (error) return <div className="page-container"><h2>Error</h2><div style={{ color: 'red' }}>{String(error)}</div></div>;

  const renderSlider = (slides) => {
    if (!slides || !slides.length) return <div style={{ color: '#666' }}>No slides configured.</div>;
    const idx = Math.max(0, Math.min(slideIndex, slides.length - 1));
    const s = slides[idx] || {};
    return (
      <div style={{ position: 'relative', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 8 }}>
          <img src={s.image} alt={s.title || ''} style={{ width: '100%', height: 420, objectFit: 'cover', display: 'block' }} />
          {s.title ? <div style={{ position: 'absolute', left: 24, bottom: 24, color: '#fff', background: 'rgba(0,0,0,0.45)', padding: '8px 12px', borderRadius: 6, fontWeight: 700 }}>{s.title}</div> : null}
        </div>
        <button onClick={() => setSlideIndex(i => (i - 1 + slides.length) % slides.length)} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.35)', color: '#fff', border: 'none', padding: 8, borderRadius: 6, cursor: 'pointer' }}>‹</button>
        <button onClick={() => setSlideIndex(i => (i + 1) % slides.length)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.35)', color: '#fff', border: 'none', padding: 8, borderRadius: 6, cursor: 'pointer' }}>›</button>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 8 }}>
          {slides.map((_, i) => (
            <button key={i} onClick={() => setSlideIndex(i)} style={{ width: 10, height: 10, borderRadius: 999, background: i === idx ? '#111' : '#ddd', border: 'none', padding: 0 }} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="page-container">
      <h1>{page.title}</h1>
      <div style={{ marginTop: 12 }}>
        {/* If content is an array of modules, render modules in order */}
        {Array.isArray(page.content) ? (
          page.content.map((mod, i) => (
            <div key={i} style={{ marginBottom: 18 }}>
              <ModuleRenderer mod={mod} />
            </div>
          ))
        ) : page.type === 'slider' ? (
          (() => {
            const slides = Array.isArray(page.content) ? page.content : (typeof page.content === 'string' ? (() => { try { return JSON.parse(page.content); } catch (_) { return []; } })() : []);
            return renderSlider(slides);
          })()
        ) : page.type === 'blogs' ? (
          <div>Blog list content: {JSON.stringify(page.content)}</div>
        ) : page.type === 'products' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 12 }}>
            {products.map(pr => (
              <div key={pr.id} style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
                {pr.image ? <img src={pr.image.startsWith('http') ? pr.image : `http://localhost:4000${pr.image}`} alt={pr.name} style={{ width: '100%', height: 160, objectFit: 'cover' }} /> : <div style={{ height: 160, background: '#fafafa' }} />}
                <div style={{ padding: 10 }}>
                  <div style={{ fontWeight: 700 }}>{pr.name}</div>
                  <div style={{ color: '#666' }}>${Number(pr.price).toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div><pre style={{ whiteSpace: 'pre-wrap' }}>{typeof page.content === 'object' ? JSON.stringify(page.content, null, 2) : page.content}</pre></div>
        )}
      </div>
    </div>
  );
}
