import React, { useEffect, useState } from "react";
import { getProducts, addProduct, updateProduct, deleteProduct } from "../services/productService";
import { addItem } from "../services/cartService";
import { getToken } from "../services/authService";
import { useNavigate } from "react-router-dom";

function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    sku: "",
    brand: "",
    stock: "",
    specs: "",
    image: null,
  });
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  // 🔒 Authentication check and load products
  useEffect(() => {
    if (!getToken()) {
      navigate("/login");
    } else {
      getProducts().then(setProducts);
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = { ...form };
    if (payload.specs && typeof payload.specs !== "string") {
      payload.specs = JSON.stringify(payload.specs);
    }
    if (typeof payload.specs === "string" && payload.specs.trim()) {
      // send as raw string, server will attempt JSON.parse
    }

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

    setForm({ name: "", description: "", price: "", category: "", sku: "", brand: "", stock: "", specs: "", image: null });
  };

  const handleEdit = (product) => {
    setEditId(product.id);
    setForm({
      name: product.name || "",
      description: product.description || "",
      price: product.price ?? "",
      category: product.category || "",
      sku: product.sku || "",
      brand: product.brand || "",
      stock: product.stock ?? "",
      specs: product.specs ? JSON.stringify(product.specs, null, 2) : "",
      image: null,
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
        <button onClick={handleStartAdd}>Add Product</button>
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

              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontWeight: 600, marginBottom: 6 }}>Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontWeight: 600, marginBottom: 6 }}>Category</label>
                <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
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
                <label style={{ fontWeight: 600, marginBottom: 6 }}>Image</label>
                <input type="file" accept="image/*" onChange={(e) => setForm({ ...form, image: e.target.files?.[0] || null })} />
                {/* preview */}
                {form.image ? (
                  <div style={{ marginTop: 8 }}>
                    <img src={URL.createObjectURL(form.image)} alt="preview" style={{ maxHeight: 120 }} />
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
            {products.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #f3f3f3' }}>
                <td style={{ padding: 12, width: 140, maxWidth: 140, verticalAlign: 'top' }}>
                  {p.image ? (
                    <img src={p.image.startsWith('http') ? p.image : `http://localhost:4000${p.image}`} alt={p.name} style={{ height: 80, objectFit: 'cover', borderRadius: 4 }} />
                  ) : (
                    <div style={{ color: '#999' }}>No image</div>
                  )}
                </td>
                <td style={{ padding: 12, verticalAlign: 'top', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                  <div style={{ fontWeight: 700 }}>{p.name}</div>
                  <div style={{ color: '#666', fontSize: 13 }}>{p.description}</div>
                </td>
                <td style={{ padding: 12, verticalAlign: 'top', whiteSpace: 'normal', wordBreak: 'break-word' }}>{p.category || '—'}</td>
                <td style={{ padding: 12, verticalAlign: 'top', whiteSpace: 'normal', wordBreak: 'break-word' }}>{p.brand || '—'}</td>
                <td style={{ padding: 12, verticalAlign: 'top', whiteSpace: 'normal', wordBreak: 'break-word' }}>{p.sku || '—'}</td>
                <td style={{ padding: 12, verticalAlign: 'top' }}>${p.price}</td>
                <td style={{ padding: 12, verticalAlign: 'top' }}>{p.stock ?? '—'}</td>
                <td style={{ padding: 12, verticalAlign: 'top', whiteSpace: 'normal', wordBreak: 'break-word' }}>{renderSpecs(p.specs)}</td>
                <td style={{ padding: 12, verticalAlign: 'top' }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button onClick={() => { addItem({ id: p.id, name: p.name, price: p.price, image: p.image, sku: p.sku }, 1); window.alert('Added to cart'); }}>🛒 Add to Cart</button>
                      <button onClick={() => { addItem({ id: p.id, name: p.name, price: p.price, image: p.image, sku: p.sku }, 1); window.location.href = '/cart'; }} style={{ background: '#0b79d0', color: '#fff' }}>💳 Buy Now</button>
                      <button onClick={() => handleEdit(p)}>✏️ Edit</button>
                      <button onClick={() => handleDelete(p.id)} style={{ color: 'red' }}>🗑️ Delete</button>
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ProductsPage;
