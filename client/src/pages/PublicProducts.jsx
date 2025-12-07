import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { searchProducts, getCategoriesAndBrands, getCategoriesAndBrandsScoped, searchWithFilters } from '../services/productService';
import { getCategories } from '../services/categoryService';
import Filters from '../components/Filters/Filters';
import * as filterService from '../services/filterService';
import { addItem } from '../services/cartService';
import { priceInfo } from '../utils/priceUtils';
import { Link } from 'react-router-dom';
import { useCompare } from '../context/CompareContext';

export default function PublicProducts() {
  const { addToCompare, removeFromCompare, isInCompare } = useCompare();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQ, setSearchQ] = useState('');
  const searchDebounce = useRef(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [filters, setFilters] = useState({});
  const [meta, setMeta] = useState({ categories: [], brands: [] });
  const [categoriesTree, setCategoriesTree] = useState([]);
  const location = useLocation();
  const [initialFilters, setInitialFilters] = useState({});

  // New state for Grid/List view and Sorting
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [sortOrder, setSortOrder] = useState('default'); // 'default' | 'price-asc' | 'price-desc'

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

    const onProductUpdated = (e) => {
      try {
        loadProducts();
      } catch (err) {
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
      } catch (err) { }
    };

    window.addEventListener('product-updated', onProductUpdated);
    window.addEventListener('product-deleted', onProductDeleted);
    return () => {
      window.removeEventListener('product-updated', onProductUpdated);
      window.removeEventListener('product-deleted', onProductDeleted);
    };
  }, []);

  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search || '');
      const cat = params.get('category');
      const q = params.get('q');
      const init = {};
      if (cat) {
        init.category = String(cat);
        init.categoryName = String(cat);
      }
      if (q) setSearchQ(q);
      setInitialFilters(init);
      if (Object.keys(init).length) loadProducts(init);
    } catch (err) {
    }
  }, [location.search]);

  const loadProducts = async (opts = {}) => {
    try {
      const mergedFilters = { ...filters, ...opts };
      const params = filterService.buildParams(mergedFilters);
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
      try { obj = JSON.parse(specs); } catch (_) { }
    }
    if (!obj) return null;
    if (typeof obj === 'string') return <div style={{ fontStyle: 'italic', fontSize: 13, color: '#666' }}>{obj}</div>;
    return (
      <ul style={{ margin: 0, paddingLeft: 14, fontSize: 13, color: '#666' }}>
        {Object.entries(obj).slice(0, 3).map(([k, v]) => (
          <li key={k}><strong>{k}:</strong> {String(v)}</li>
        ))}
      </ul>
    );
  };

  const getProductCategoryPath = (product) => {
    // ... existing logic kept for reference if needed, but simplified for card view
    return product.category || '—';
  };

  // Sorting Logic
  const getSortedProducts = () => {
    let sorted = [...products];
    if (sortOrder === 'price-asc') {
      sorted.sort((a, b) => {
        const pA = priceInfo(a).display;
        const pB = priceInfo(b).display;
        return pA - pB;
      });
    } else if (sortOrder === 'price-desc') {
      sorted.sort((a, b) => {
        const pA = priceInfo(a).display;
        const pB = priceInfo(b).display;
        return pB - pA;
      });
    }
    return sorted;
  };

  const sortedProducts = getSortedProducts();
  const total = sortedProducts.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(page, totalPages);
  const start = (current - 1) * perPage;
  const end = start + perPage;
  const pageItems = sortedProducts.slice(start, end);

  return (
    <div className="page-container">
      <h2 style={{ marginBottom: 16 }}>Products</h2>
      <div className="sidebar-layout">
        <aside style={{ padding: 8 }}>
          <Filters
            key={JSON.stringify(initialFilters)}
            initial={initialFilters}
            categories={categoriesTree}
            brands={Array.isArray(meta.brands) ? meta.brands : []}
            // pass computed specs metadata (top keys + their values)
            specsMeta={(() => {
              try {
                const counts = {};
                const values = {};
                for (const p of products || []) {
                  const s = p && p.specs ? p.specs : null;
                  if (!s || typeof s !== 'object') continue;
                  for (const [k, v] of Object.entries(s)) {
                    const key = String(k).trim();
                    if (!key) continue;
                    counts[key] = (counts[key] || 0) + 1;
                    values[key] = values[key] || new Set();
                    if (v !== undefined && v !== null) values[key].add(String(v));
                  }
                }
                // pick top 5 keys by count
                const keys = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 5);
                return keys.map(k => ({ key: k, count: counts[k], values: Array.from(values[k] || []) }));
              } catch (e) { return []; }
            })()}
            onChange={(f) => {
              setFilters(f);
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
              (async () => {
                try {
                  const catName = f && (f.category_child2_name || f.category_child1_name || f.categoryName);
                  const catIdOrName = f && (f.category_child2 || f.category_child1 || f.category);
                  const cat = catName || catIdOrName || null;
                  let scoped = null;
                  if (cat) {
                    scoped = await getCategoriesAndBrandsScoped(cat);
                  } else {
                    const all = await getCategoriesAndBrands();
                    scoped = all;
                  }
                  setMeta(scoped || { categories: [], brands: [] });
                } catch (err) {
                  console.error('PublicProducts - scoped brands fetch error', err);
                }
              })();
            }}
          />
        </aside>
        <main>
          {/* Controls Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, background: '#fff', padding: '12px 20px', borderRadius: 8, border: '1px solid #eee', boxShadow: '0 2px 5px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontWeight: 600, color: '#555', fontSize: 14 }}>Rendit:</span>
              <div style={{ position: 'relative' }}>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  style={{
                    appearance: 'none',
                    padding: '8px 32px 8px 12px',
                    borderRadius: 6,
                    border: '1px solid #ddd',
                    outline: 'none',
                    fontSize: 14,
                    cursor: 'pointer',
                    background: '#fff url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23333%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E") no-repeat right 10px center',
                    backgroundSize: '10px'
                  }}
                >
                  <option value="default">Default</option>
                  <option value="price-asc">Cmimi më i ulët</option>
                  <option value="price-desc">Cmimi më i lartë</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontWeight: 600, color: '#555', fontSize: 14 }}>Shfaqja:</span>
              <button
                onClick={() => setViewMode('grid')}
                title="Grid View"
                style={{
                  background: viewMode === 'grid' ? '#e6f0fa' : 'transparent',
                  color: viewMode === 'grid' ? '#0b79d0' : '#666',
                  border: '1px solid',
                  borderColor: viewMode === 'grid' ? '#0b79d0' : '#ddd',
                  padding: 6,
                  borderRadius: 4,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                title="List View"
                style={{
                  background: viewMode === 'list' ? '#e6f0fa' : 'transparent',
                  color: viewMode === 'list' ? '#0b79d0' : '#666',
                  border: '1px solid',
                  borderColor: viewMode === 'list' ? '#0b79d0' : '#ddd',
                  padding: 6,
                  borderRadius: 4,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
              </button>
            </div>
          </div>

          {/* Products Container */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(260px, 1fr))' : '1fr',
            gap: 20
          }}>
            {pageItems.map((p) => {
              const info = priceInfo(p);
              const imgSrc = (p.images && p.images.length ? (p.images[0].startsWith('http') ? p.images[0] : `http://localhost:4000${p.images[0]}`) : (p.image && p.image.startsWith('http') ? p.image : `http://localhost:4000${p.image}`));

              return (
                <div
                  key={p.id}
                  style={{
                    background: '#fff',
                    border: '1px solid #eee',
                    borderRadius: 8,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: viewMode === 'grid' ? 'column' : 'row',
                    transition: 'box-shadow 0.2s, transform 0.2s',
                    position: 'relative'
                  }}
                  className="product-card-hover"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.08)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Badge */}
                  {info.discounted && (
                    <div style={{ position: 'absolute', top: 10, left: 10, background: '#d32', color: '#fff', padding: '4px 8px', borderRadius: 4, fontSize: 12, fontWeight: 700, zIndex: 2 }}>
                      SALE
                    </div>
                  )}

                  {/* Compare Button (Absolute for Grid, Relative for List maybe?) - Keeping absolute for consistency */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      isInCompare(p.id) ? removeFromCompare(p.id) : addToCompare(p);
                    }}
                    style={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      zIndex: 10,
                      background: isInCompare(p.id) ? '#0b79d0' : 'rgba(255,255,255,0.9)',
                      color: isInCompare(p.id) ? '#fff' : '#333',
                      border: '1px solid #eee',
                      borderRadius: '50%',
                      width: 32,
                      height: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: 16,
                      boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                    }}
                    title={isInCompare(p.id) ? "Remove from Compare" : "Add to Compare"}
                  >
                    {isInCompare(p.id) ? '✓' : '⚖️'}
                  </button>

                  {/* Image Area */}
                  <div style={{
                    width: viewMode === 'grid' ? '100%' : '240px',
                    height: viewMode === 'grid' ? '220px' : 'auto',
                    minHeight: viewMode === 'list' ? '200px' : 'auto',
                    background: '#f9f9f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 10,
                    boxSizing: 'border-box',
                    flexShrink: 0
                  }}>
                    {imgSrc ? (
                      <Link to={`/products/${p.id}`} style={{ display: 'block', width: '100%', height: '100%' }}>
                        <img src={imgSrc} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      </Link>
                    ) : (
                      <div style={{ color: '#ccc' }}>No Image</div>
                    )}
                  </div>

                  {/* Content Area */}
                  <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {p.brand || p.category || 'Generic'}
                    </div>
                    <Link to={`/products/${p.id}`} style={{ textDecoration: 'none', color: '#333', fontWeight: 700, fontSize: 16, marginBottom: 8, lineHeight: 1.4, flex: viewMode === 'grid' ? '1' : '0 0 auto' }}>
                      {p.name}
                    </Link>

                    {viewMode === 'list' && (
                      <div style={{ fontSize: 14, color: '#666', marginBottom: 12, lineHeight: 1.5, maxWidth: '800px' }}>
                        {p.description ? (p.description.length > 150 ? p.description.substring(0, 150) + '...' : p.description) : ''}
                      </div>
                    )}

                    {/* Specs Preview (List View Only) */}
                    {viewMode === 'list' && p.specs && (
                      <div style={{ marginBottom: 12 }}>
                        {renderSpecs(p.specs)}
                      </div>
                    )}

                    <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', borderTop: viewMode === 'list' ? 'none' : '1px solid #f0f0f0', paddingTop: viewMode === 'list' ? 0 : 12 }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {info.discounted && <span style={{ textDecoration: 'line-through', color: '#999', fontSize: 13 }}>${Number(info.original).toFixed(2)}</span>}
                        <span style={{ fontSize: 18, fontWeight: 800, color: info.isOffer || info.isSale ? '#d32' : '#111' }}>
                          ${Number(info.display).toFixed(2)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={async () => { try { const priceToUse = info.display; await addItem({ id: p.id, name: p.name, price: priceToUse, image: p.image, sku: p.sku }, 1); window.alert('Added to cart'); } catch (err) { console.error(err); alert('Failed to add to cart'); } }}
                          style={{
                            background: '#fff',
                            border: '1px solid #0b79d0',
                            color: '#0b79d0',
                            borderRadius: 6,
                            padding: '8px 12px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: 13,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#f0f8ff'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
                        >
                          🛒 Add
                        </button>
                        <button
                          onClick={async () => { try { const priceToUse = info.display; await addItem({ id: p.id, name: p.name, price: priceToUse, image: p.image, sku: p.sku }, 1); window.location.href = '/cart'; } catch (err) { console.error(err); alert('Failed to add to cart'); } }}
                          style={{
                            background: '#0b79d0',
                            border: 'none',
                            color: '#fff',
                            borderRadius: 6,
                            padding: '8px 16px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: 13
                          }}
                        >
                          Buy Now
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, padding: '20px 0', borderTop: '1px solid #eee' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', color: '#666', fontSize: 14 }}>
              <div>Show</div>
              <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }} style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #ddd' }}>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <div>products</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '6px 12px', border: '1px solid #ddd', background: page === 1 ? '#f5f5f5' : '#fff', borderRadius: 4, cursor: page === 1 ? 'default' : 'pointer', color: page === 1 ? '#999' : '#333' }}>Prev</button>
              <div style={{ fontSize: 14, color: '#333' }}>Page {page} of {totalPages}</div>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '6px 12px', border: '1px solid #ddd', background: page === totalPages ? '#f5f5f5' : '#fff', borderRadius: 4, cursor: page === totalPages ? 'default' : 'pointer', color: page === totalPages ? '#999' : '#333' }}>Next</button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
