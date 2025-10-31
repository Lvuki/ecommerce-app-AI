import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { addItem } from "../services/cartService";
import { getProductById } from "../services/productService";

export default function ProductView() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
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

  const imageUrl = product.image?.startsWith('http') ? product.image : (product.image ? `http://localhost:4000${product.image}` : null);
  let specs = product.specs;
  // Normalize specs if stored as string somehow
  if (typeof specs === 'string') {
    try { specs = JSON.parse(specs); } catch (_) {}
  }

  return (
    <div className="page-container" style={{ marginTop: 20, padding: '0 12px' }}>
      <Link to="/" style={{ textDecoration: 'none' }}>← Back to Home</Link>
      <div className="two-col" style={{ marginTop: 16 }}>
        <div style={{ border: '1px solid #eee', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
          {imageUrl ? (
            <img src={imageUrl} alt={product.name} style={{ width: '100%', height: 360, objectFit: 'cover', background: '#fafafa' }} />
          ) : (
            <div style={{ width: '100%', height: 360, background: '#fafafa' }} />
          )}
        </div>
        <div>
          <h1 style={{ marginTop: 0 }}>{product.name}</h1>
          <div style={{ color: '#666' }}>{product.brand || product.category}</div>
          <div style={{ marginTop: 8, fontWeight: 700, fontSize: 22 }}>${product.price}</div>
          <div style={{ marginTop: 12 }}>SKU: <strong>{product.sku}</strong></div>
          <div style={{ marginTop: 12 }}>In stock: <strong>{product.stock}</strong></div>
          <p style={{ marginTop: 16, lineHeight: 1.6 }}>{product.description}</p>

          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button onClick={() => { addItem({ id: product.id, name: product.name, price: product.price, image: product.image, sku: product.sku }, 1); alert('Added to cart'); }}>
              🛒 Add to Cart
            </button>
            <button onClick={() => { addItem({ id: product.id, name: product.name, price: product.price, image: product.image, sku: product.sku }, 1); window.location.href = '/cart'; }} style={{ background: '#0b79d0', color: '#fff' }}>
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


