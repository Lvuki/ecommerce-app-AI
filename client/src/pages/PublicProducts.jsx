import React, { useEffect, useState, useRef } from 'react';
import { searchProducts, getCategoriesAndBrands, searchWithFilters } from '../services/productService';
import { getCategories } from '../services/categoryService';
import Filters from '../components/Filters/Filters';
import { addItem } from '../services/cartService';
import { priceInfo } from '../utils/priceUtils';
import { Link } from 'react-router-dom';

export default function PublicProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQ, setSearchQ] = useState('');
  const searchDebounce = useRef(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [filters, setFilters] = useState({});
  const [meta, setMeta] = useState({ categories: [], brands: [] });
  const [categoriesTree, setCategoriesTree] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [prods, tree, brandsRes] = await Promise.all([searchProducts({}), getCategories(), getCategoriesAndBrands()]);
        setProducts(prods || []);
        setCategories(tree || []);
        setCategoriesTree(tree || []);
        setMeta(brandsRes || { categories: [], brands: [] });
      } catch (e) {
        console.error('Failed to load products', e);
        setProducts([]);
        setCategories([]);
        setCategoriesTree([]);
        setMeta({ categories: [], brands: [] });
      }
    })();

    // listen for product updates from admin UI so the public listing refreshes automatically
    const onProductUpdated = (e) => {
      try {
        // simplest strategy: reload products to ensure consistent ordering / filtering
        loadProducts();
      } catch (err) {
        // ignore
      }
    };

    const onProductDeleted = (e) => {
      try {
        const did = e && e.detail && e.detail.id;
        if (did) {
          setProducts(prev => (Array.isArray(prev) ? prev.filter(p => String(p.id) !== String(did)) : prev));
        } else {
          loadProducts();
        }
      } catch (err) {}
    };

    window.addEventListener('product-updated', onProductUpdated);
    window.addEventListener('product-deleted', onProductDeleted);
    return () => {
      window.removeEventListener('product-updated', onProductUpdated);
      window.removeEventListener('product-deleted', onProductDeleted);
    };
  }, []);

  const loadProducts = async (opts = {}) => {
    try {
      const params = { ...opts };
      if (filters.category) params.category = filters.category;
      if (filters.brand) params.brand = filters.brand;
      if (filters.priceMin) params.priceMin = filters.priceMin;
      if (filters.priceMax) params.priceMax = filters.priceMax;
      if (filters.stockMin) params.stockMin = filters.stockMin;
      if (filters.color) params.spec_color = filters.color;
      if (filters.size) params.spec_size = filters.size;
      if (searchQ) params.q = searchQ;
      const prods = await searchProducts(params);
      setProducts(prods || []);
      setPage(1);
    } catch (e) {
      console.error('Load products failed', e);
      setProducts([]);
    }
  };

  const applyFilters = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    loadProducts();
  };

  const renderSpecs = (specs) => {
    let obj = specs;
    if (typeof specs === 'string') {
      try { obj = JSON.parse(specs); } catch (_) {}
    }
    if (!obj) return null;
    if (typeof obj === 'string') return <div style={{ fontStyle: 'italic' }}>{obj}</div>;
    return (
      <ul style={{ margin: 0, paddingLeft: 14 }}>
        {Object.entries(obj).map(([k, v]) => (
          <li key={k}><strong>{k}:</strong> {String(v)}</li>
        ))}
      </ul>
    );
  };

  const getProductCategoryPath = (product) => {
    if (!product) return '—';
    if (Array.isArray(product.categories) && product.categories.length) {
      const names = product.categories.map(c => (typeof c === 'string' ? c : (c && c.name) || String(c)));
      return names.join(' › ');
    }
    const norm = (s) => (s === undefined || s === null) ? '' : String(s).toLowerCase().trim();
    const target = norm(product.category || '');
    if (!target) return product.category || '—';
    const findPathByName = (nodes, tgt, path = []) => {
      for (const n of nodes || []) {
        if (!n) continue;
        const next = path.concat(n.name);
        if (norm(n.name) === tgt) return next;
        if (Array.isArray(n.subcategories) && n.subcategories.length) {
          const found = findPathByName(n.subcategories, tgt, next);
          if (found) return found;
        }
      }
      return null;
    };
    const path = findPathByName(categories || [], target);
    if (path && path.length) return path.join(' › ');
    return product.category || '—';
  };

  return (
    <div className="page-container">
      <h2 style={{ marginBottom: 8 }}>Products</h2>
      <div className="sidebar-layout">
        <aside style={{ padding: 8 }}>
          <Filters
            initial={{}}
            categories={categoriesTree}
            brands={Array.isArray(meta.brands) ? meta.brands : []}
            onChange={(f) => {
              setFilters(f);
              // debounce filter requests lightly
              if (searchDebounce.current) clearTimeout(searchDebounce.current);
              searchDebounce.current = setTimeout(async () => {
                try {
                  const res = await searchWithFilters(f);
                  setProducts(res || []);
                  setPage(1);
                } catch (err) {
                  console.error('Filter search failed', err);
                }
              }, 250);
            }}
          />
        </aside>
        <main>
          <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8 }} className="table-responsive">
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto', minWidth: 700 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
              <th style={{ padding: 12 }}>Image</th>
              <th style={{ padding: 12 }}>Name</th>
              <th style={{ padding: 12 }}>Category</th>
              <th style={{ padding: 12 }}>Brand</th>
              <th style={{ padding: 12 }}>SKU</th>
              <th style={{ padding: 12 }}>Price</th>
              <th style={{ padding: 12 }}>Stock</th>
              <th style={{ padding: 12 }}>Specifications</th>
              <th style={{ padding: 12 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const total = products.length;
              const totalPages = Math.max(1, Math.ceil(total / perPage));
              const current = Math.min(page, totalPages);
              const start = (current - 1) * perPage;
              const end = start + perPage;
              const pageItems = products.slice(start, end);
              return pageItems.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f3f3f3' }}>
                  <td style={{ padding: 12, width: 140, maxWidth: 140, verticalAlign: 'top' }}>
                    { (p.images && p.images.length) || p.image ? (
                      <Link to={`/products/${p.id}`} style={{ display: 'inline-block' }}>
                        <img src={(p.images && p.images.length ? (p.images[0].startsWith('http') ? p.images[0] : `http://localhost:4000${p.images[0]}`) : (p.image && p.image.startsWith('http') ? p.image : `http://localhost:4000${p.image}`))} alt={p.name} style={{ height: 80, objectFit: 'cover', borderRadius: 4 }} />
                      </Link>
                    ) : (
                      <div style={{ color: '#999' }}>No image</div>
                    )}
                  </td>
                  <td style={{ padding: 12, verticalAlign: 'top', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                    <div style={{ fontWeight: 700 }}>
                      <Link to={`/products/${p.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{p.name}</Link>
                    </div>
                    <div style={{ color: '#666', fontSize: 13 }}>{p.description}</div>
                  </td>
                  <td style={{ padding: 12, verticalAlign: 'top', whiteSpace: 'normal', wordBreak: 'break-word' }}>{getProductCategoryPath(p)}</td>
                  <td style={{ padding: 12, verticalAlign: 'top', whiteSpace: 'normal', wordBreak: 'break-word' }}>{p.brand || '—'}</td>
                  <td style={{ padding: 12, verticalAlign: 'top', whiteSpace: 'normal', wordBreak: 'break-word' }}>{p.sku || '—'}</td>
                  <td style={{ padding: 12, verticalAlign: 'top' }}>
                    {(() => {
                      const info = priceInfo(p);
                      return (
                        <div>
                          <div style={{ fontWeight: info.discounted ? 800 : 700, color: info.isOffer ? '#d32' : (info.isSale ? '#d32' : '#111') }}>${Number(info.display).toFixed(2)}</div>
                          {info.discounted ? <div style={{ textDecoration: 'line-through', color: '#888', fontSize: 13 }}>${Number(info.original).toFixed(2)}</div> : null}
                          {info.remaining ? <div style={{ marginTop: 6, color: '#c00', fontSize: 12 }}>{info.remaining}</div> : null}
                          {info.isInvalidSale ? <div style={{ marginTop: 6, display: 'inline-block', background: '#f0ad4e', color: '#fff', padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>Check sale</div> : null}
                        </div>
                      );
                    })()}
                  </td>
                  <td style={{ padding: 12, verticalAlign: 'top' }}>{p.stock ?? '—'}</td>
                  <td style={{ padding: 12, verticalAlign: 'top', whiteSpace: 'normal', wordBreak: 'break-word' }}>{renderSpecs(p.specs)}</td>
                  <td style={{ padding: 12, verticalAlign: 'top' }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button onClick={async () => { try { const info = priceInfo(p); const priceToUse = info.display; await addItem({ id: p.id, name: p.name, price: priceToUse, image: p.image, sku: p.sku }, 1); window.alert('Added to cart'); } catch (err) { console.error(err); alert('Failed to add to cart'); } }}>🛒 Add to Cart</button>
                      <button onClick={async () => { try { const info = priceInfo(p); const priceToUse = info.display; await addItem({ id: p.id, name: p.name, price: priceToUse, image: p.image, sku: p.sku }, 1); window.location.href = '/cart'; } catch (err) { console.error(err); alert('Failed to add to cart'); } }} style={{ background: '#0b79d0', color: '#fff' }}>💳 Buy Now</button>
                    </div>
                  </td>
                </tr>
              ));
            })()}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div>Show</div>
          <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <div>products</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
          <div>Page {page} of {Math.max(1, Math.ceil(products.length / perPage))}</div>
          <button onClick={() => setPage((p) => Math.min(Math.max(1, Math.ceil(products.length / perPage)), p + 1))}>Next</button>
        </div>
      </div>
    </main>
  </div>
    </div>
  );
}
