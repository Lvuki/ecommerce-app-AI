import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { addItem } from "../services/cartService";
import { getProductById } from "../services/productService";

export default function ProductView() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [mainIndex, setMainIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getProductById(id)
      .then((p) => {
        if (p?.error) {
          setError(p.error);
        } else {
          setProduct(p);
        }
      })
      .catch(() => setError("Failed to load product"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (error) return <div style={{ padding: 20, color: 'red' }}>{error}</div>;
  if (!product) return null;

  // determine images array (server stores `images` array or legacy `image`)
  const images = (product.images && product.images.length) ? product.images : (product.image ? [product.image] : []);
  const resolvedImages = images.map(img => img && img.startsWith('http') ? img : `http://localhost:4000${img}`);
  const imageUrl = resolvedImages[mainIndex] || null;
  let specs = product.specs;
  // Normalize specs if stored as string somehow
  if (typeof specs === 'string') {
    try { specs = JSON.parse(specs); } catch (_) {}
  }

  return (
    <div className="page-container" style={{ marginTop: 20, padding: '0 12px' }}>
      <Link to="/" style={{ textDecoration: 'none' }}>← Back to Home</Link>
      <div className="two-col" style={{ marginTop: 16 }}>
        <div>
          <div style={{ border: '1px solid #eee', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
            {imageUrl ? (
              <img src={imageUrl} alt={product.name} style={{ width: '100%', height: 480, objectFit: 'cover', background: '#fafafa' }} />
            ) : (
              <div style={{ width: '100%', height: 480, background: '#fafafa' }} />
            )}
          </div>

          {resolvedImages && resolvedImages.length >= 1 ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {resolvedImages.map((src, i) => (
                <button key={i} onClick={() => setMainIndex(i)} style={{ border: mainIndex === i ? '2px solid #0b74de' : '1px solid #eee', padding: 0, background: '#fff', borderRadius: 6 }}>
                  <img src={src} alt={`thumb-${i}`} style={{ width: 80, height: 60, objectFit: 'cover', display: 'block', borderRadius: 4 }} />
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div>
          <h1 style={{ marginTop: 0 }}>{product.name}</h1>
          <div style={{ color: '#666' }}>{product.brand || product.category}</div>
                  <div style={{ marginTop: 8 }}>
            {product.offerPrice && Number(product.offerPrice) > 0 ? (
              <div>
                <div style={{ fontWeight: 800, fontSize: 22, color: '#c90000' }}>${Number(product.offerPrice).toFixed(2)}</div>
                <div style={{ textDecoration: 'line-through', color: '#888', fontSize: 14 }}>${Number(product.price).toFixed(2)}</div>
              </div>
            ) : product.salePrice && Number(product.salePrice) > 0 && Number(product.salePrice) !== Number(product.price) ? (
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 22, color: '#d32' }}>${Number(product.salePrice).toFixed(2)}</div>
                        <div style={{ textDecoration: 'line-through', color: '#888', fontSize: 14 }}>${Number(product.price).toFixed(2)}</div>
                      </div>
            ) : (
              <div style={{ fontWeight: 700, fontSize: 22 }}>${Number(product.price).toFixed(2)}</div>
            )}
            {product.offerTo ? (
              <div style={{ color: '#c00', marginTop: 8 }}>{(function(){ try { const to = new Date(product.offerTo); const now = new Date(); let diff = to - now; if (isNaN(diff) || diff <= 0) return 'Offer ended'; const days = Math.floor(diff / (1000*60*60*24)); diff -= days * (1000*60*60*24); const hours = Math.floor(diff / (1000*60*60)); if (days > 0) return `Ends in ${days}d ${hours}h`; const mins = Math.floor(diff / (1000*60)); if (hours > 0) return `Ends in ${hours}h ${mins}m`; return `Ends in ${mins}m`; } catch (_) { return null; } })()}</div>
            ) : null}
                  </div>
          <div style={{ marginTop: 12 }}>SKU: <strong>{product.sku}</strong></div>
          <div style={{ marginTop: 12 }}>In stock: <strong>{product.stock}</strong></div>
          <p style={{ marginTop: 16, lineHeight: 1.6 }}>{product.description}</p>

          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button onClick={async () => { try { const priceToUse = (product.offerPrice && Number(product.offerPrice) > 0) ? product.offerPrice : ((product.salePrice && Number(product.salePrice) > 0) ? product.salePrice : product.price); await addItem({ id: product.id, name: product.name, price: priceToUse, image: product.image, sku: product.sku }, 1); alert('Added to cart'); } catch (err) { console.error(err); alert('Failed to add to cart'); } }}>
              🛒 Add to Cart
            </button>
            <button onClick={async () => { try { const priceToUse = (product.offerPrice && Number(product.offerPrice) > 0) ? product.offerPrice : ((product.salePrice && Number(product.salePrice) > 0) ? product.salePrice : product.price); await addItem({ id: product.id, name: product.name, price: priceToUse, image: product.image, sku: product.sku }, 1); window.location.href = '/cart'; } catch (err) { console.error(err); alert('Failed to add to cart'); } }} style={{ background: '#0b79d0', color: '#fff' }}>
              💳 Buy Now
            </button>
          </div>

          {specs && typeof specs === 'object' ? (
            <div style={{ marginTop: 16 }}>
              <h3>Specifications</h3>
              <ul style={{ paddingLeft: 18 }}>
                {Object.entries(specs).map(([k, v]) => (
                  <li key={k}>
                    <strong>{k}:</strong> {String(v)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}


