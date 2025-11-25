import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { getCategoriesAndBrands, searchProducts } from "../services/productService";
import { getCategories } from "../services/categoryService";
import { addItem } from "../services/cartService";
import wishlistService from "../services/wishlistService";

export default function CategoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState({ category: "", brand: "", priceMin: "", priceMax: "", stockMin: "", color: "", size: "" });
  const [meta, setMeta] = useState({ categories: [], brands: [] });
  const [categoriesTree, setCategoriesTree] = useState([]);

  // Load categories tree and brands
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [tree, brandsRes] = await Promise.all([getCategories(), getCategoriesAndBrands()]);
        if (!mounted) return;
        setCategoriesTree(Array.isArray(tree) ? tree : []);
        setMeta(brandsRes || { categories: [], brands: [] });
      } catch (e) {
        if (!mounted) return;
        setCategoriesTree([]);
        setMeta({ categories: [], brands: [] });
      }
    })();
    return () => { mounted = false; };
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
      .catch((err) => {
        // Surface the real error message for easier debugging and log to console
        console.error('searchProducts failed', err);
        setError(err && err.message ? err.message : 'Failed to load products');
      })
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
                {/* render hierarchical categories flattened with indentation */}
                {(() => {
                  const out = [];
                  function walk(nodes, depth = 0) {
                    for (const n of nodes || []) {
                      const label = `${'\u00A0'.repeat(depth * 2)}${n.name}`;
                      out.push(<option key={`cat-${n.id}`} value={n.name}>{label}</option>);
                      if (Array.isArray(n.subcategories) && n.subcategories.length) walk(n.subcategories, depth + 1);
                    }
                  }
                  walk(categoriesTree, 0);
                  return out;
                })()}
              </select>
            </div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Brand</div>
              <select value={filters.brand} onChange={(e) => setFilters({ ...filters, brand: e.target.value })}>
                <option value="">All</option>
                {(Array.isArray(meta.brands) ? meta.brands : []).map((b) => (
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
                    <Link to={`/products/${p.id}`}>
                      <img src={p.image?.startsWith('http') ? p.image : `http://localhost:4000${p.image}`} alt={p.name} style={{ width: '100%', height: 150, objectFit: 'cover', background: '#fafafa' }} />
                    </Link>
                  ) : (
                    <div style={{ width: '100%', height: 150, background: '#fafafa' }} />
                  )}
                  <div style={{ padding: 12 }}>
                    <div style={{ fontWeight: 600 }}>
                      <Link to={`/products/${p.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{p.name}</Link>
                    </div>
                    <div style={{ color: '#666', fontSize: 14 }}>{p.brand || p.category}</div>
                    <div style={{ marginTop: 8 }}>
                      {p.salePrice && Number(p.salePrice) > 0 && Number(p.salePrice) !== Number(p.price) ? (
                        <div>
                          <div style={{ fontWeight: 700 }}>${Number(p.salePrice).toFixed(2)}</div>
                          <div style={{ textDecoration: 'line-through', color: '#888', fontSize: 13 }}>${Number(p.price).toFixed(2)}</div>
                        </div>
                      ) : (
                        <div style={{ fontWeight: 700 }}>${Number(p.price).toFixed(2)}</div>
                      )}
                    </div>
                    <div style={{ marginTop: 10 }}>
                         <div style={{ display: 'flex', gap: 8 }}>
                         <button onClick={async () => { try { const priceToUse = (p.offerPrice && Number(p.offerPrice) > 0) ? p.offerPrice : ((p.salePrice && Number(p.salePrice) > 0) ? p.salePrice : p.price); await addItem({ id: p.id, name: p.name, price: priceToUse, image: p.image, sku: p.sku }, 1); alert('Added to cart'); } catch (err) { console.error(err); alert('Failed to add to cart'); } }} style={{ background: '#fff', border: '1px solid #e6e6e6', padding: '6px 8px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>🛒 Add</button>
                         <button onClick={async () => { try { const priceToUse = (p.offerPrice && Number(p.offerPrice) > 0) ? p.offerPrice : ((p.salePrice && Number(p.salePrice) > 0) ? p.salePrice : p.price); await addItem({ id: p.id, name: p.name, price: priceToUse, image: p.image, sku: p.sku }, 1); navigate('/cart'); } catch (err) { console.error(err); alert('Failed to add to cart'); } }} style={{ background: '#0b79d0', color: '#fff', borderRadius: 6, padding: '6px 10px', fontSize: 13, border: 'none', cursor: 'pointer', boxShadow: '0 2px 6px rgba(11,121,208,0.18)' }}>💳 Buy</button>
                         <button onClick={async () => { try { const out = await wishlistService.toggleItem({ id: p.id, name: p.name, image: p.image, price: (p.salePrice && Number(p.salePrice) > 0) ? p.salePrice : p.price }); const present = (out || []).find(i => String(i.id) === String(p.id)); alert(present ? 'Added to wishlist' : 'Removed from wishlist'); } catch (err) { console.error(err); alert('Failed to update wishlist'); } }} style={{ background: '#fff', border: '1px solid #e6e6e6', padding: '6px 8px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>♡ Wishlist</button>
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





