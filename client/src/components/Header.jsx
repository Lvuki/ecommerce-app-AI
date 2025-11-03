import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { getToken, logout, isAdmin } from "../services/authService";
import { getCount, getCart } from "../services/cartService";
import API_BASE_URL from "../config";

export default function Header() {
  const navigate = useNavigate();
  const [hasToken, setHasToken] = useState(!!getToken());
  const [isAdministrator, setIsAdministrator] = useState(isAdmin());
  const [cartCount, setCartCount] = useState(getCount());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const [headerCategories, setHeaderCategories] = useState([]);
  const [headerPages, setHeaderPages] = useState([]);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const menuRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    const onAnyStorage = async () => {
      setHasToken(!!getToken());
      setIsAdministrator(isAdmin());
      if (getToken()) {
        try {
          const items = await getCart();
          const count = items.reduce((s, it) => s + (it.qty || 0), 0);
          setCartCount(count);
        } catch (err) {
          setCartCount(0);
        }
      } else {
        setCartCount(getCount());
      }
    };
    window.addEventListener("storage", onAnyStorage);
    const onCartUpdated = (e) => {
      try {
        const items = (e && e.detail && e.detail.items) || [];
        const count = items.reduce((s, it) => s + (it.qty || 0), 0);
        setCartCount(count);
      } catch (_) { /**/ }
    };
    window.addEventListener('cartUpdated', onCartUpdated);
    // initialize once
    onAnyStorage();
    return () => {
      window.removeEventListener("storage", onAnyStorage);
      window.removeEventListener('cartUpdated', onCartUpdated);
    };
  }, []);

  // refresh when auth state changes in same tab (e.g., after login)
  useEffect(() => {
    let mounted = true;
    async function load() {
      if (hasToken) {
        try {
          const items = await getCart();
          if (!mounted) return;
          const count = items.reduce((s, it) => s + (it.qty || 0), 0);
          setCartCount(count);
        } catch (err) {
          if (!mounted) return;
          setCartCount(0);
        }
      } else {
        setCartCount(getCount());
      }
    }
    load();
    return () => { mounted = false; };
  }, [hasToken]);

  // Re-evaluate auth status on route changes (e.g., after login navigation)
  useEffect(() => {
    setHasToken(!!getToken());
    setIsAdministrator(isAdmin());
  }, [location]);

  // load hierarchical categories for mega menu
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch(`${API_BASE_URL}/categories`);
        const data = await res.json();
        if (!mounted) return;
        setHeaderCategories(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load categories', err);
        if (mounted) setHeaderCategories([]);
      }
    }
    load();
    // load header pages (public visible)
    (async () => {
      try {
        const r2 = await fetch(`${API_BASE_URL}/pages`);
        const pd = await r2.json();
        if (!mounted) return;
        setHeaderPages(Array.isArray(pd) ? pd : []);
      } catch (err) { console.error('Failed to load pages', err); }
    })();
    return () => { mounted = false; };
  }, []);

  // close menu on outside click
  useEffect(() => {
    function onDoc(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowCategoryMenu(false);
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // flatten hierarchical categories into a flat list of {id,name}
  const flattenCategories = (nodes) => {
    const out = [];
    function walk(list) {
      (list || []).forEach(n => {
        if (!n) return;
        out.push({ id: n.id, name: n.name });
        if (Array.isArray(n.subcategories) && n.subcategories.length) walk(n.subcategories);
      });
    }
    walk(nodes);
    return out;
  };
  const flatHeaderCategories = flattenCategories(headerCategories);

  const handleLogout = () => {
    logout();
    setHasToken(false);
    setIsAdministrator(false);
    navigate("/login");
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchCategory) params.set('category', searchCategory);
    if (searchQuery) params.set('q', searchQuery);
    const qs = params.toString();
    navigate(`/category${qs ? `?${qs}` : ''}`);
  };

  // Mega menu renderer: show columns of root categories and nested subcategories
  function CategoryMega({ nodes = [], onSelect }) {
    if (!nodes || !nodes.length) return <div style={{ color: '#666' }}>No categories</div>;
    // split roots into columns (3 columns max)
    const cols = 3;
    const perCol = Math.ceil(nodes.length / cols);
    const columns = [];
    for (let i = 0; i < cols; i++) columns.push(nodes.slice(i * perCol, (i + 1) * perCol));

    return (
      <div style={{ display: 'flex', gap: 24 }}>
        {columns.map((col, ci) => (
          <div key={ci} style={{ minWidth: 180 }}>
            {col.map(cat => (
              <div key={cat.id || cat.name} style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>
                  <a href="#" onClick={(e) => { e.preventDefault(); if (onSelect) onSelect(cat.name); }} style={{ color: '#111', textDecoration: 'none' }}>{cat.name}</a>
                </div>
                {Array.isArray(cat.subcategories) && cat.subcategories.length ? (
                  <ul style={{ listStyle: 'none', paddingLeft: 8, margin: 0 }}>
                    {cat.subcategories.map(sub => (
                      <li key={sub.id || sub.name} style={{ marginBottom: 6 }}>
                        <a href="#" onClick={(e) => { e.preventDefault(); if (onSelect) onSelect(sub.name); }} style={{ textDecoration: 'none', color: '#444' }}>{sub.name}</a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  // Small recursive tree component for dropdown categories
  function CategoryTree({ nodes = [], depth = 0, onSelect }) {
    if (!nodes || !nodes.length) return <div style={{ color: '#666' }}>No categories</div>;
    return (
      <ul style={{ listStyle: 'none', margin: 0, paddingLeft: depth ? 12 : 6 }}>
        {nodes.map(n => (
          <li key={n.id || n.name} style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <a href="#" onClick={(e) => { e.preventDefault(); if (onSelect) onSelect(n.name); }} style={{ textDecoration: 'none', color: '#111', fontWeight: 600 }}>{n.name}</a>
            </div>
            {Array.isArray(n.subcategories) && n.subcategories.length ? (
              <div style={{ marginTop: 6, marginLeft: 8 }}>
                <CategoryTree nodes={n.subcategories} depth={depth + 1} onSelect={onSelect} />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <header style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #eee" }}>
      {/* left: navigation */}
      <div style={{ display: 'flex', alignItems: 'center', minWidth: 220 }}>
        <nav style={{ display: "flex", gap: 12, position: 'relative' }}>
          <Link to="/">Home</Link>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/products">Products</Link>

          <Link to="/offers">Offers</Link>

          {headerPages.map(pg => (
            <Link key={pg.id} to={`/pages/${pg.slug}`}>{pg.title}</Link>
          ))}

          {/* Category mega menu trigger */}
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button type="button" onClick={() => setShowCategoryMenu(s => !s)} onMouseEnter={() => setShowCategoryMenu(true)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>Category ▾</button>
            {showCategoryMenu ? (
              <div style={{ position: 'absolute', left: 0, top: '100%', marginTop: 8, background: '#fff', border: '1px solid #eee', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', padding: 16, zIndex: 80, minWidth: 640 }}>
                <CategoryMega nodes={headerCategories} onSelect={(name) => { setShowCategoryMenu(false); navigate(`/category?category=${encodeURIComponent(name)}`); }} />
              </div>
            ) : null}
          </div>

          <Link to={isAdmin() ? "/admin/blogs" : "/blogs"}>Blogs</Link>
          <Link to="/admin/users">Users</Link>
        </nav>
      </div>

      {/* center: large search form */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, alignItems: 'center', width: '70%', maxWidth: 900 }}>
          <select value={searchCategory} onChange={(e) => setSearchCategory(e.target.value)} style={{ padding: 10, minWidth: 220, borderRadius: 6 }}>
            <option value="">All categories</option>
            {flatHeaderCategories.map(c => <option key={c.id ?? c.name} value={c.name}>{c.name}</option>)}
          </select>
          <input placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ padding: 12, fontSize: 16, borderRadius: 6, flex: 1 }} />
          <button type="submit" style={{ padding: '10px 16px', fontSize: 15, borderRadius: 6 }}>Search</button>
        </form>
      </div>

      {/* right: cart/users/auth */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 220, justifyContent: 'flex-end' }}>
        {isAdministrator ? (
          <Link to="/admin" style={{ padding: '8px 12px', borderRadius: 6, background: '#0b74de', color: '#fff', textDecoration: 'none', fontSize: 14 }}>Admin Console</Link>
        ) : null}
        <Link to="/cart" style={{ position: 'relative', display: 'inline-block', textDecoration: 'none' }} aria-label="Cart">
          <span style={{ fontSize: 20 }}>🛒</span>
          {cartCount ? (
            <span style={{ position: 'absolute', top: -6, right: -8, background: '#d32', color: '#fff', borderRadius: 10, padding: '2px 6px', fontSize: 12 }}>{cartCount}</span>
          ) : null}
        </Link>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {hasToken ? (
            <>
              <Link to="/profile" style={{ textDecoration: 'none' }}>Profile</Link>
              <button onClick={handleLogout} title="Logout" aria-label="Logout" style={{ fontSize: 18, padding: 8 }}>🔓</button>
            </>
          ) : (
            <button onClick={() => navigate("/login")} title="Login" aria-label="Login" style={{ fontSize: 18, padding: 8 }}>👤</button>
          )}
        </div>
      </div>
    </header>
  );
}


