import React, { useEffect, useState, useRef } from "react";
import { getProducts, searchProducts, addProduct, updateProduct, deleteProduct } from "../services/productService";
import { getCategories, addCategory, updateCategory, deleteCategory } from "../services/categoryService";
import { addItem } from "../services/cartService";
import { priceInfo } from '../utils/priceUtils';
import { getToken } from "../services/authService";
import { useNavigate, Link } from "react-router-dom";

function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    salePrice: "",
    offerPrice: '',
    offerFrom: '',
    offerTo: '',
    category: "",
    sku: "",
    brand: "",
    stock: "",
    specs: "",
    images: [],
  });
  const [categories, setCategories] = useState([]);
  const [filterCategory, setFilterCategory] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const searchDebounce = useRef(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [showCategoriesPanel, setShowCategoriesPanel] = useState(false);
  const [catForm, setCatForm] = useState({ id: null, name: '', description: '', imageFile: null, image: '', parentId: '' });
  const [addForm, setAddForm] = useState({ name: '', description: '', imageFile: null, image: '', parentId: '' });
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  // 🔒 Authentication check and load products
  useEffect(() => {
    if (!getToken()) {
      navigate("/login");
    } else {
      // load products via search endpoint to support filters
      (async () => {
        try {
          const prods = await searchProducts({});
          setProducts(prods || []);
        } catch (e) {
          console.error('Failed to load products', e);
          setProducts([]);
        }
      })();
      getCategories().then((c) => setCategories(c || []));
    }
  }, [navigate]);

  const loadProducts = async (opts = {}) => {
    try {
      const params = { ...opts };
      // include category and q if present
      if (filterCategory) params.category = filterCategory;
      if (searchQ) params.q = searchQ;
      const prods = await searchProducts(params);
      setProducts(prods || []);
      setPage(1);
    } catch (e) {
      console.error('Load products failed', e);
      setProducts([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = { ...form };
  if (payload.salePrice === "") delete payload.salePrice;
  if (payload.offerPrice === "" || payload.offerPrice === undefined) delete payload.offerPrice;
  if (payload.offerFrom === "" || payload.offerFrom === undefined) delete payload.offerFrom;
  if (payload.offerTo === "" || payload.offerTo === undefined) delete payload.offerTo;
    if (payload.specs && typeof payload.specs !== "string") {
      payload.specs = JSON.stringify(payload.specs);
    }
    if (typeof payload.specs === "string" && payload.specs.trim()) {
      // send as raw string, server will attempt JSON.parse
    }

    // include any selected images (File[]) as 'images' for multipart upload
    if (form.images && form.images.length) payload.images = form.images;

    if (editId) {
      const updated = await updateProduct(editId, payload);
      setProducts(products.map((p) => (p.id === editId ? updated : p)));
      setEditId(null);
      setShowForm(false);
    } else {
      const newProduct = await addProduct(payload);
      setProducts([...products, newProduct]);
      setShowForm(false);
    }

    setForm({ name: "", description: "", price: "", category: "", sku: "", brand: "", stock: "", specs: "", images: [] });
  };

  const handleEdit = (product) => {
    setEditId(product.id);
    setForm({
      name: product.name || "",
      description: product.description || "",
      price: product.price ?? "",
      salePrice: product.salePrice ?? "",
      offerPrice: product.offerPrice ?? '',
      offerFrom: product.offerFrom ?? '',
      offerTo: product.offerTo ?? '',
      category: product.category || "",
      sku: product.sku || "",
      brand: product.brand || "",
      stock: product.stock ?? "",
      specs: product.specs ? JSON.stringify(product.specs, null, 2) : "",
      images: [],
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    await deleteProduct(id);
    setProducts(products.filter((p) => p.id !== id));
  };

  const handleStartAdd = () => {
    setEditId(null);
    setForm({
      name: "",
      description: "",
      price: "",
      salePrice: "",
      offerPrice: '',
      offerFrom: '',
      offerTo: '',
      category: "",
      sku: "",
      brand: "",
      stock: "",
      specs: "",
      image: null,
    });
    setShowForm(true);
  };

  // helper to render specs which may be a JSON string or an object
  const renderSpecs = (specs) => {
    let obj = specs;
    if (typeof specs === "string") {
      try {
        obj = JSON.parse(specs);
      } catch (_) {
        // leave as string
      }
    }
    if (!obj) return null;
    if (typeof obj === "string") return <div style={{ fontStyle: 'italic' }}>{obj}</div>;
    return (
      <ul style={{ margin: 0, paddingLeft: 14 }}>
        {Object.entries(obj).map(([k, v]) => (
          <li key={k}><strong>{k}:</strong> {String(v)}</li>
        ))}
      </ul>
    );
  };

  return (
    <div className="page-container" style={{ padding: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h2>Product Management</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleStartAdd}>Add Product</button>
          <button onClick={() => { setShowCategoriesPanel(s => !s); setAddForm({ name: '', description: '', imageFile: null, image: '', parentId: '' }); }}>{showCategoriesPanel ? 'Close Categories' : 'Manage Categories'}</button>
        </div>
      </div>

      {/* Form shown in modal — trigger with Add Product / Edit buttons */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
          <div style={{ width: '90%', maxWidth: 800, background: '#fff', borderRadius: 8, padding: 18, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>{editId ? 'Edit Product' : 'Add Product'}</h3>
              <button onClick={() => { setShowForm(false); setEditId(null); setForm({ name: "", description: "", price: "", category: "", sku: "", brand: "", stock: "", specs: "", image: null }); }}>Close</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 0, alignItems: 'start' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontWeight: 600, marginBottom: 6 }}>Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontWeight: 600, marginBottom: 6 }}>Price</label>
                <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontWeight: 600, marginBottom: 6 }}>Sale price (optional)</label>
                  <input type="number" step="0.01" value={form.salePrice || ''} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} />
                <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>If set, this price will be used for purchases.</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontWeight: 600, marginBottom: 6 }}>Offer price (optional)</label>
                <input type="number" step="0.01" value={form.offerPrice || ''} onChange={(e) => setForm({ ...form, offerPrice: e.target.value })} />
                <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>Offer price will be applied during the selected date range below.</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontWeight: 600, marginBottom: 6 }}>Offer from / to</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="date" value={form.offerFrom || ''} onChange={(e) => setForm({ ...form, offerFrom: e.target.value })} />
                  <input type="date" value={form.offerTo || ''} onChange={(e) => setForm({ ...form, offerTo: e.target.value })} />
                </div>
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontWeight: 600, marginBottom: 6 }}>Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontWeight: 600, marginBottom: 6 }}>Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  <option value="">— none —</option>
                  {/** Render options recursively with indentation */}
                  {categories.map((cat) => {
                    const renderOptions = (node, prefix = '') => {
                      const opts = [];
                      opts.push(<option key={node.id} value={node.name}>{prefix + node.name}</option>);
                      if (Array.isArray(node.subcategories)) {
                        node.subcategories.forEach((child) => {
                          opts.push(...renderOptions(child, prefix + '-- '));
                        });
                      }
                      return opts;
                    };
                    return renderOptions(cat);
                  })}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontWeight: 600, marginBottom: 6 }}>Brand</label>
                <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontWeight: 600, marginBottom: 6 }}>SKU</label>
                <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontWeight: 600, marginBottom: 6 }}>Stock</label>
                <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontWeight: 600, marginBottom: 6 }}>Specifications (JSON)</label>
                <textarea placeholder='{"color":"red","size":"M"}' value={form.specs} onChange={(e) => setForm({ ...form, specs: e.target.value })} rows={4} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontWeight: 600, marginBottom: 6 }}>Images</label>
                <input type="file" accept="image/*" multiple onChange={(e) => setForm({ ...form, images: e.target.files ? Array.from(e.target.files) : [] })} />
                {/* preview thumbnails */}
                {form.images && form.images.length ? (
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {form.images.map((f, idx) => (
                      <div key={idx} style={{ width: 80, height: 60, overflow: 'hidden', borderRadius: 6 }}>
                        <img src={URL.createObjectURL(f)} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
                <button type="submit">{editId ? "Update Product" : "Add Product"}</button>
                <button type="button" onClick={() => { setShowForm(false); setEditId(null); setForm({ name: "", description: "", price: "", category: "", sku: "", brand: "", stock: "", specs: "", image: null }); }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <h3 style={{ marginTop: "10px", marginBottom: 12 }}>Product List</h3>
      {/* Filters: category + search */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <label style={{ fontSize: 14, fontWeight: 600 }}>Filter:</label>
        <select value={filterCategory} onChange={async (e) => { const val = e.target.value; setFilterCategory(val); await loadProducts({ category: val, q: searchQ }); }} style={{ minWidth: 220 }}>
          <option value="">— all categories —</option>
          {categories.map(cat => <option key={cat.id || cat.name} value={cat.name || cat.id}>{cat.name || cat}</option>)}
        </select>
        <input placeholder="Search products by name" value={searchQ} onChange={(e) => {
          const val = e.target.value;
          setSearchQ(val);
          // debounced live search
          if (searchDebounce.current) clearTimeout(searchDebounce.current);
          searchDebounce.current = setTimeout(() => {
            loadProducts({ category: filterCategory, q: val });
          }, 350);
        }} style={{ flex: 1, padding: 8 }} />
        <button onClick={async () => { setFilterCategory(''); setSearchQ(''); await loadProducts({}); }}>Clear</button>
      </div>
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
              // client-side pagination
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
                          <img src={(p.images && p.images.length ? (p.images[0].startsWith('http') ? p.images[0] : `http://localhost:4000${p.images[0]}`) : (p.image.startsWith('http') ? p.image : `http://localhost:4000${p.image}`))} alt={p.name} style={{ height: 80, objectFit: 'cover', borderRadius: 4 }} />
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
                <td style={{ padding: 12, verticalAlign: 'top', whiteSpace: 'normal', wordBreak: 'break-word' }}>{p.category || '—'}</td>
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
                      <button onClick={() => handleEdit(p)}>✏️ Edit</button>
                      <button onClick={() => handleDelete(p.id)} style={{ color: 'red' }}>🗑️ Delete</button>
                    </div>
                </td>
              </tr>
            ));
            })()}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
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

      {/* Categories management modal (opens when Manage Categories is clicked) */}
      {showCategoriesPanel ? (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', zIndex: 80 }}>
          <div style={{ width: '92%', maxWidth: 1000, maxHeight: '90vh', overflow: 'auto', background: '#fff', padding: 18, borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Manage Categories</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setShowCategoriesPanel(false); setCatForm({ id: null, name: '', description: '', imageFile: null, image: '', parentId: '' }); setAddForm({ name: '', description: '', imageFile: null, image: '', parentId: '' }); }}>Close</button>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              {/** Add category form on top (quick add) */}
              <div style={{ border: '1px dashed #ddd', padding: 12, borderRadius: 8 }}>
                <h4>Add Category</h4>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData();
                  fd.append('name', addForm.name);
                  fd.append('description', addForm.description);
                  if (addForm.imageFile) fd.append('image', addForm.imageFile);
                  if (addForm.parentId) fd.append('parentId', addForm.parentId);
                  await addCategory(fd);
                  setCategories(await getCategories());
                  setAddForm({ name: '', description: '', imageFile: null, image: '', parentId: '' });
                }} style={{ display: 'grid', gap: 8 }}>
                  <input placeholder="Name" value={addForm.name} required onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} />
                  <textarea placeholder="Description" value={addForm.description} onChange={(e) => setAddForm({ ...addForm, description: e.target.value })} rows={3} />
                  <label style={{ fontSize: 13, color: '#444' }}>Parent category (optional)</label>
                  <select value={addForm.parentId || ''} onChange={(e) => setAddForm({ ...addForm, parentId: e.target.value || '' })}>
                    <option value="">— none —</option>
                    {categories.map(cat => {
                      const renderOpts = (node, prefix = '') => {
                        const opts = [];
                        opts.push(<option key={node.id} value={node.id}>{prefix + node.name}</option>);
                        if (Array.isArray(node.subcategories) && node.subcategories.length) {
                          node.subcategories.forEach(child => {
                            opts.push(...renderOpts(child, prefix + '-- '));
                          });
                        }
                        return opts;
                      };
                      return renderOpts(cat);
                    })}
                  </select>
                  <input type="file" accept="image/*" onChange={(e) => setAddForm({ ...addForm, imageFile: e.target.files?.[0] || null })} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="submit">Save</button>
                    <button type="button" onClick={() => setAddForm({ name: '', description: '', imageFile: null, image: '', parentId: '' })}>Reset</button>
                  </div>
                </form>
              </div>

              {/** recursive renderer for categories so all depths show */}
              {(() => {
                const renderNode = (node, depth = 0) => {
                  // If catForm.id matches this node, render the edit form inline here
                  if (catForm.id === node.id) {
                    return (
                      <div key={node.id} style={{ border: '1px solid #eee', padding: 12, borderRadius: 8, marginLeft: depth ? (24 * depth) : 0, background: '#fffef8' }}>
                        <h4 style={{ marginTop: 0 }}>{catForm.id ? 'Edit Category' : 'Add Category'}</h4>
                        <form onSubmit={async (e) => {
                          e.preventDefault();
                          const fd = new FormData();
                          fd.append('name', catForm.name);
                          fd.append('description', catForm.description);
                          if (catForm.imageFile) fd.append('image', catForm.imageFile);
                          if (catForm.parentId) fd.append('parentId', catForm.parentId);
                          if (catForm.id) {
                            await updateCategory(catForm.id, fd);
                          } else {
                            await addCategory(fd);
                          }
                          setCategories(await getCategories());
                          setCatForm({ id: null, name: '', description: '', imageFile: null, image: '', parentId: '' });
                        }} style={{ display: 'grid', gap: 8 }}>
                          <input placeholder="Name" value={catForm.name} required onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} />
                          <textarea placeholder="Description" value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} rows={3} />
                          <label style={{ fontSize: 13, color: '#444' }}>Parent category (optional)</label>
                          <select value={catForm.parentId || ''} onChange={(e) => setCatForm({ ...catForm, parentId: e.target.value || '' })}>
                            <option value="">— none —</option>
                            {categories.map(cat => {
                              const renderOpts = (nodeOpt, prefix = '') => {
                                const opts = [];
                                opts.push(<option key={nodeOpt.id} value={nodeOpt.id}>{prefix + nodeOpt.name}</option>);
                                if (Array.isArray(nodeOpt.subcategories) && nodeOpt.subcategories.length) {
                                  nodeOpt.subcategories.forEach(child => {
                                    opts.push(...renderOpts(child, prefix + '-- '));
                                  });
                                }
                                return opts;
                              };
                              return renderOpts(cat);
                            })}
                          </select>
                          <input type="file" accept="image/*" onChange={(e) => setCatForm({ ...catForm, imageFile: e.target.files?.[0] || null })} />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button type="submit">Save</button>
                            <button type="button" onClick={() => setCatForm({ id: null, name: '', description: '', imageFile: null, image: '', parentId: '' })}>Cancel</button>
                          </div>
                        </form>
                      </div>
                    );
                  }

                  // Default rendering for a node (not being edited)
                  return (
                    <div key={node.id} style={{ border: '1px solid #eee', padding: 12, borderRadius: 8, marginLeft: depth ? (24 * depth) : 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 84, height: 64, background: '#fafafa', borderRadius: 6, overflow: 'hidden' }}>
                          {node.image ? <img src={node.image.startsWith('http') ? node.image : `http://localhost:4000${node.image}`} alt={node.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ padding: 8, color: '#888' }}>No image</div>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700 }}>{node.name}</div>
                          <div style={{ color: '#666' }}>{node.description}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => setCatForm({ id: node.id, name: node.name || '', description: node.description || '', imageFile: null, image: node.image || '', parentId: node.parentId || '' })}>Edit</button>
                          <button onClick={async () => { if (!window.confirm('Delete this category?')) return; await deleteCategory(node.id); setCategories(await getCategories()); }} style={{ color: 'red' }}>Delete</button>
                        </div>
                      </div>
                      {Array.isArray(node.subcategories) && node.subcategories.length > 0 ? (
                        <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
                          {node.subcategories.map(child => renderNode(child, depth + 1))}
                        </div>
                      ) : null}
                    </div>
                  );
                };

                return categories.map(c => renderNode(c, 0));
              })()}

              {/* moved add form to top; inline edit remains available per-node */}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default ProductsPage;
