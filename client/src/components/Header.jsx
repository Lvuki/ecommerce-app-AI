import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { getToken, logout, isAdmin } from "../services/authService";
import { getCount, getCart } from "../services/cartService";
import API_BASE_URL from "../config";
import logo from '../assets/globe-logo.png';

export default function Header() {
  const navigate = useNavigate();
  const [showHamburger, setShowHamburger] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [lang, setLang] = useState(() => localStorage.getItem('site_lang') || 'English');
  const [currency, setCurrency] = useState(() => localStorage.getItem('site_currency') || 'All');
  const [hasToken, setHasToken] = useState(!!getToken());
  const [isAdministrator, setIsAdministrator] = useState(isAdmin());
  const [cartCount, setCartCount] = useState(getCount());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const [headerCategories, setHeaderCategories] = useState([]);
  const [headerPages, setHeaderPages] = useState([]);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [b2bEnabled, setB2bEnabled] = useState(() => localStorage.getItem('b2b_enabled') === '1');
  const menuRef = useRef(null);
  const hamburgerRef = useRef(null);
  const langRef = useRef(null);
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
      if (hamburgerRef.current && !hamburgerRef.current.contains(e.target)) {
        setShowHamburger(false);
      }
      if (langRef.current && !langRef.current.contains(e.target)) {
        setShowLangMenu(false);
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    localStorage.setItem('b2b_enabled', b2bEnabled ? '1' : '0');
  }, [b2bEnabled]);

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
                  <button type="button" onClick={() => { if (onSelect) onSelect(cat.name); }} style={{ color: '#111', textDecoration: 'none', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 'inherit', fontWeight: 'inherit' }}>{cat.name}</button>
                </div>
                {Array.isArray(cat.subcategories) && cat.subcategories.length ? (
                  <ul style={{ listStyle: 'none', paddingLeft: 8, margin: 0 }}>
                    {cat.subcategories.map(sub => (
                      <li key={sub.id || sub.name} style={{ marginBottom: 6 }}>
                        <button type="button" onClick={() => { if (onSelect) onSelect(sub.name); }} style={{ textDecoration: 'none', color: '#444', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>{sub.name}</button>
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
              <button type="button" onClick={() => { if (onSelect) onSelect(n.name); }} style={{ textDecoration: 'none', color: '#111', fontWeight: 600, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>{n.name}</button>
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
    <header style={{ display: "flex", flexDirection: 'column', gap: 8, padding: "12px 16px", borderBottom: "1px solid #eee" }}>
      {/* inline styles for placeholder and search input border to match image */}
      <style>{`
        .header-search-input::placeholder { color: #0B74DE; opacity: 0.95; }
        .header-search-input { border: 1px solid #e6eef6; }
      `}</style>
      {/* top row: centered container with navigation and language selector */}
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
        <div style={{ width: '100%', maxWidth: 1170, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ width: 60 }} />
          <nav style={{ display: 'flex', gap: 48, position: 'relative', justifyContent: 'center', flex: 1 }}>
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
                <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: '100%', marginTop: 8, background: '#fff', border: '1px solid #eee', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', padding: 16, zIndex: 80, minWidth: 640 }}>
                  <CategoryMega nodes={headerCategories} onSelect={(name) => { setShowCategoryMenu(false); navigate(`/category?category=${encodeURIComponent(name)}`); }} />
                </div>
              ) : null}
            </div>

            <Link to={isAdmin() ? "/admin/blogs" : "/blogs"}>Blogs</Link>
            <Link to="/admin/users">Users</Link>
          </nav>

          {/* top-right: language & currency selector */}
          <div style={{ width: 220, display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end' }} ref={langRef}>
            <div style={{ position: 'relative' }}>
              <button type="button" onClick={() => setShowLangMenu(s => !s)} style={{ background: 'none', border: '1px solid #eee', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}>Lang / Curr ▾</button>
              {showLangMenu ? (
                <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 8, background: '#fff', border: '1px solid #eee', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', padding: 12, zIndex: 95, minWidth: 220 }}>
                  <div style={{ display: 'grid', gap: 8 }}>
                    <label style={{ fontSize: 13 }}>Language</label>
                    <select value={lang} onChange={(e) => { setLang(e.target.value); localStorage.setItem('site_lang', e.target.value); }}>
                      <option value="English">English</option>
                      <option value="Albanian">Albanian</option>
                    </select>
                    <label style={{ fontSize: 13 }}>Currency</label>
                    <select value={currency} onChange={(e) => { setCurrency(e.target.value); localStorage.setItem('site_currency', e.target.value); }}>
                      <option value="All">All</option>
                      <option value="EUR">Euro</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* bottom row: centered container with hamburger (left), search (center), controls (right) */}
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
        <div style={{ width: '100%', maxWidth: 1170, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }} aria-label="Home">
                <img src={logo} alt="GLOBE" style={{ height: 36, display: 'block' }} />
              </Link>
              <div ref={hamburgerRef} style={{ position: 'relative' }}>
                <button type="button" onClick={() => setShowHamburger(s => !s)} style={{ background: 'none', border: '1px solid #e6eef6', padding: '0 12px', cursor: 'pointer', fontSize: 15, borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 8, height: 40 }}>☰ <span style={{ fontSize: 14 }}>Menu</span></button>
                {showHamburger ? (
                  <div style={{ position: 'absolute', left: 0, top: '100%', marginTop: 8, background: '#fff', border: '1px solid #eee', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', padding: 12, zIndex: 90, minWidth: 260 }}>
                    <CategoryTree nodes={headerCategories} onSelect={(name) => { setShowHamburger(false); navigate(`/category?category=${encodeURIComponent(name)}`); }} />
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, alignItems: 'center', width: '100%', maxWidth: 720 }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
              <input
                className="header-search-input"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ padding: '0 12px', fontSize: 16, borderRadius: 6, flex: 1, height: 40, display: 'inline-block' }}
              />
              {/* B2B toggle/button placed next to search input */}
              <div style={{ marginLeft: 8, display: 'flex', alignItems: 'center' }}>
                <button type="button" onClick={() => setB2bEnabled(s => !s)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 20, border: '1px solid #cfeefc', background: '#fff', cursor: 'pointer' }} aria-pressed={b2bEnabled} title="B2B">
                  <div style={{ width: 36, height: 20, borderRadius: 20, background: b2bEnabled ? '#ffb84d' : '#eef6ff', position: 'relative' }}>
                    <div style={{ width: 14, height: 14, borderRadius: 12, background: b2bEnabled ? '#fff' : '#0b74de', position: 'absolute', top: 3, left: (b2bEnabled ? 19 : 3), transition: 'left 140ms linear' }} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>B2B</div>
                </button>
              </div>
              {/* action icons moved next to B2B */}
              <div style={{ marginLeft: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                <Link to="/cart" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 20, border: '1px solid #e6eef6', textDecoration: 'none' }} aria-label="Cart">
                  <span style={{ fontSize: 18 }}>🛒</span>
                  {cartCount ? (
                    <span style={{ position: 'absolute', top: -6, right: -6, background: '#d32', color: '#fff', borderRadius: 10, padding: '2px 6px', fontSize: 12 }}>{cartCount}</span>
                  ) : null}
                </Link>
                {hasToken ? (
                  <>
                    <Link to="/profile" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 20, border: '1px solid #e6eef6', textDecoration: 'none' }} aria-label="Profile">👤</Link>
                    <button onClick={handleLogout} title="Logout" aria-label="Logout" style={{ width: 40, height: 40, borderRadius: 20, border: '1px solid #e6eef6', background: 'transparent', cursor: 'pointer' }}>🔓</button>
                  </>
                ) : (
                  <button onClick={() => navigate("/login")} title="Login" aria-label="Login" style={{ width: 40, height: 40, borderRadius: 20, border: '1px solid #e6eef6', background: 'transparent', cursor: 'pointer' }}>👤</button>
                )}
              </div>
            </div>
          </form>

          <div style={{ width: 220, display: 'flex', justifyContent: 'flex-end', gap: 12, alignItems: 'center' }}>
            {isAdministrator ? (
              <Link to="/admin" style={{ padding: '8px 12px', borderRadius: 6, background: '#0b74de', color: '#fff', textDecoration: 'none', fontSize: 14 }}>Admin Console</Link>
            ) : null}
          </div>
        </div>
      </div>

      {/* announcement bar like the uploaded design */}
      <div style={{ marginTop: 12, background: '#f4f6f8', padding: '14px 18px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 22, border: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', fontSize: 20 }}>!</div>
        <div style={{ color: '#333', letterSpacing: 0.4, fontSize: 13, textTransform: 'uppercase', fontWeight: 600 }}>LOREM IPSUM DOLOR SIT AMET, CONSECTETUER ADIPISCING ELIT, SED DIAM NONUMMY NIBH EUISMOD EUISMOD IBH EUISMOD EUISMOD</div>
      </div>
    </header>
  );
}


