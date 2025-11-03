import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPageBySlug } from '../services/pageService';
import { getProducts } from '../services/productService';

export default function StaticPage() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      } catch (err) { console.error(err); setError(err.message || 'Failed to load page'); }
      finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [slug]);

  if (loading) return <div className="page-container">Loading...</div>;
  if (!page) return <div className="page-container"><h2>Page not found</h2><div style={{ color: '#666', marginTop: 8 }}>This page does not exist or is not visible.</div></div>;
  if (error) return <div className="page-container"><h2>Error</h2><div style={{ color: 'red' }}>{String(error)}</div></div>;

  return (
    <div className="page-container">
      <h1>{page.title}</h1>
      <div style={{ marginTop: 12 }}>
        {page.type === 'slider' ? (
          <div>Slider content: {JSON.stringify(page.content)}</div>
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
