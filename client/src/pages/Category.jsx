import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { getCategoriesAndBrands, searchProducts } from "../services/productService";
import { addItem } from "../services/cartService";

export default function CategoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState({ category: "", brand: "", priceMin: "", priceMax: "", stockMin: "", color: "", size: "" });
  const [meta, setMeta] = useState({ categories: [], brands: [] });

  // Load categories/brands
  useEffect(() => {
    getCategoriesAndBrands()
      .then((m) => setMeta(m || { categories: [], brands: [] }))
      .catch(() => setMeta({ categories: [], brands: [] }));
  }, []);

  // Load products based on URL params
  useEffect(() => {
    const params = Object.fromEntries(searchParams.entries());
    setLoading(true);
    setError("");
    const query = { ...params };
    if (query.color) query["spec_color"] = query.color;
    if (query.size) query["spec_size"] = query.size;
    searchProducts(query)
      .then(setProducts)
      .catch(() => setError("Failed to load products"))
      .finally(() => setLoading(false));
    setFilters({
      category: params.category || "",
      brand: params.brand || "",
      priceMin: params.priceMin || "",
      priceMax: params.priceMax || "",
      stockMin: params.stockMin || "",
      color: params.color || "",
      size: params.size || "",
    });
  }, [searchParams]);

  const updateParam = (name, value) => {
    const next = new URLSearchParams(searchParams);
    if (value === "" || value === undefined || value === null) {
      next.delete(name);
    } else {
      next.set(name, value);
    }
    setSearchParams(next);
  };

  const applyFilters = (e) => {
    e.preventDefault();
    // Build all params once and update the URL in a single call to avoid
    // race conditions where multiple updateParam calls each read the same
    // stale `searchParams` value and overwrite each other.
    const form = filters;
    const next = new URLSearchParams(searchParams);
    const setOrDelete = (k, v) => {
      if (v === "" || v === undefined || v === null) next.delete(k);
      else next.set(k, v);
    };
    setOrDelete("category", form.category);
    setOrDelete("brand", form.brand);
    setOrDelete("priceMin", form.priceMin);
    setOrDelete("priceMax", form.priceMax);
    setOrDelete("stockMin", form.stockMin);
    setOrDelete("color", form.color);
    setOrDelete("size", form.size);
    setSearchParams(next);
  };

  return (
    <div className="page-container">
      <h1 style={{ marginBottom: 12 }}>Shop by Category</h1>
      <div className="sidebar-layout">
        <aside style={{ border: "1px solid #eee", borderRadius: 10, padding: 12, background: "#fff" }}>
          <form onSubmit={applyFilters} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Category</div>
              <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
                <option value="">All</option>
                {meta.categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Brand</div>
              <select value={filters.brand} onChange={(e) => setFilters({ ...filters, brand: e.target.value })}>
                <option value="">All</option>
                {meta.brands.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Price</div>
              <div style={{ display: "flex", gap: 6 }}>
                <input type="number" placeholder="Min" value={filters.priceMin} onChange={(e) => setFilters({ ...filters, priceMin: e.target.value })} style={{ width: "50%" }} />
                <input type="number" placeholder="Max" value={filters.priceMax} onChange={(e) => setFilters({ ...filters, priceMax: e.target.value })} style={{ width: "50%" }} />
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Stock</div>
              <input type="number" placeholder="Min stock" value={filters.stockMin} onChange={(e) => setFilters({ ...filters, stockMin: e.target.value })} />
            </div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Specifications</div>
              <input placeholder="Color" value={filters.color} onChange={(e) => setFilters({ ...filters, color: e.target.value })} />
              <input placeholder="Size" value={filters.size} onChange={(e) => setFilters({ ...filters, size: e.target.value })} />
            </div>
            <button type="submit">Apply</button>
          </form>
        </aside>
  <main>
          {loading ? (
            <div>Loading...</div>
          ) : error ? (
            <div style={{ color: 'red' }}>{error}</div>
          ) : (
            <div className="responsive-grid">
              {products.map((p) => (
                <div key={p.id} style={{ border: "1px solid #eee", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
                  {p.image ? (
                    <img src={p.image?.startsWith('http') ? p.image : `http://localhost:4000${p.image}`} alt={p.name} style={{ width: '100%', height: 150, objectFit: 'cover', background: '#fafafa' }} />
                  ) : (
                    <div style={{ width: '100%', height: 150, background: '#fafafa' }} />
                  )}
                  <div style={{ padding: 12 }}>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    <div style={{ color: '#666', fontSize: 14 }}>{p.brand || p.category}</div>
                    <div style={{ marginTop: 8, fontWeight: 700 }}>${p.price}</div>
                    <div style={{ marginTop: 10 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Link to={`/products/${p.id}`} style={{ border: '1px solid #111', padding: '6px 10px', borderRadius: 6, color: '#111', textDecoration: 'none' }}>View</Link>
                          <button onClick={() => { addItem({ id: p.id, name: p.name, price: p.price, image: p.image, sku: p.sku }, 1); alert('Added to cart'); }} style={{ background: '#fff', border: '1px solid #e6e6e6', padding: '6px 8px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>🛒 Add</button>
                          <button onClick={() => { addItem({ id: p.id, name: p.name, price: p.price, image: p.image, sku: p.sku }, 1); navigate('/cart'); }} style={{ background: '#0b79d0', color: '#fff', borderRadius: 6, padding: '6px 10px', fontSize: 13, border: 'none', cursor: 'pointer', boxShadow: '0 2px 6px rgba(11,121,208,0.18)' }}>💳 Buy</button>
                        </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}



