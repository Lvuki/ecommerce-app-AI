import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { getToken, logout, isAdmin } from "../services/authService";
import { getCount, getCart } from "../services/cartService";
import wishlistService from '../services/wishlistService';
import API_BASE_URL from "../config";
import logo from '../assets/globe-logo.png';

export default function Header() {
  const navigate = useNavigate();
  const [showHamburger, setShowHamburger] = useState(false);
  const [panelActive, setPanelActive] = useState(false);
  const [selectedHamburgerCategory, setSelectedHamburgerCategory] = useState(null);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [lang, setLang] = useState(() => localStorage.getItem('site_lang') || 'English');
  const [currency, setCurrency] = useState(() => localStorage.getItem('site_currency') || 'All');
  const [hasToken, setHasToken] = useState(!!getToken());
  const [isAdministrator, setIsAdministrator] = useState(isAdmin());
  const [cartCount, setCartCount] = useState(getCount());
  const [wishlistCount, setWishlistCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const [headerCategories, setHeaderCategories] = useState([]);
  const [headerPages, setHeaderPages] = useState([]);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [b2bEnabled, setB2bEnabled] = useState(() => localStorage.getItem('b2b_enabled') === '1');
  const menuRef = useRef(null);
  const hamburgerRef = useRef(null);
  const profileRef = useRef(null);
  const langRef = useRef(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
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

  // load wishlist count and listen for updates
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const list = await wishlistService.getWishlist();
        if (!mounted) return;
        setWishlistCount(Array.isArray(list) ? list.length : 0);
      } catch (err) {
        if (mounted) setWishlistCount(0);
      }
    }
    load();
    const onUpdate = (e) => {
      const items = e && e.detail && e.detail.items ? e.detail.items : [];
      setWishlistCount(Array.isArray(items) ? items.length : 0);
    };
    window.addEventListener('wishlistUpdated', onUpdate);
    return () => { mounted = false; window.removeEventListener('wishlistUpdated', onUpdate); };
  }, []);

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
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
      if (langRef.current && !langRef.current.contains(e.target)) {
        setShowLangMenu(false);
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // trigger panel activation on open so CSS transition runs (slide-in)
  useEffect(() => {
    if (showHamburger) {
      // ensure initial render is inactive, then activate on next frame
      setPanelActive(false);
      requestAnimationFrame(() => requestAnimationFrame(() => setPanelActive(true)));
    } else {
      setPanelActive(false);
    }
  }, [showHamburger]);

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
    navigate(`/products${qs ? `?${qs}` : ''}`);
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
    /* slightly stronger border for better visibility in the search area */
    .header-search-input { border: 1.5px solid #d6e6f3; }
    /* header icon styling (SVGs use currentColor) */
  .header-icon { color: #0B74DE; opacity: 0.95; display: inline-block; transition: transform 140ms ease, opacity 140ms ease, color 160ms ease; }
  /* on hover: make the container a solid B2B orange and invert the icon to white for high contrast */
  .header-action:hover { background: #ffb84d; }
  .header-action:hover .header-icon { color: #fff; opacity: 1; transform: scale(1.06); }
  /* top nav: keep color stable and show underline without affecting layout */
  .top-nav-link { color: #111; text-decoration: none; position: relative; padding-bottom: 6px; display: inline-block; }
  .top-nav-link::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: transparent; transition: background 140ms linear; }
  .top-nav-link:hover::after, .top-nav-link.active::after { background: #0B74DE; }
  .top-nav-link.active { color: #0B74DE; }

  /* hamburger overlay and slide-in panel */
  .hamburger-backdrop { position: fixed; top: 64px; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0); z-index: 200; display: flex; align-items: flex-start; justify-content: flex-start; padding-top: 12px; pointer-events: none; transition: background 240ms ease; }
  .hamburger-backdrop.open { background: rgba(0,0,0,0.24); pointer-events: auto; }
  .hamburger-panel { width: 100%; max-width: 1440px; box-shadow: 0 12px 40px rgba(0,0,0,0.12); border-radius: 6px; display: flex; overflow: hidden; background: #fff; transform: translateX(-100%); transition: transform 320ms cubic-bezier(.2,.8,.2,1); }
  .hamburger-panel.open { transform: translateX(0); }
  `}</style>
      {/* top row: centered nav with full-width right controls */}
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%', position: 'relative' }}>
        <div style={{ width: '100%', maxWidth: 1440, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <nav style={{ display: 'flex', gap: 135, position: 'relative' }}>
            {
              (() => {
                const links = [
                  { to: '/offers', label: 'Offers' },
                  { to: '/sherbim', label: 'Sherbim' },
                  { to: '/financim', label: 'Financim' },
                  { to: '/shkarko-aplikacionin', label: 'Shkarko aplikacionin' },
                  { to: '/dyqani-afer-meje', label: 'Dyqani afer meje' }
                ];
                return links.map(l => (
                  <Link key={l.to} to={l.to} className={'top-nav-link' + (location && (location.pathname === l.to || location.pathname.startsWith(l.to + '/')) ? ' active' : '')}>{l.label}</Link>
                ));
              })()
            }
          </nav>
        </div>

        {/* full-width right controls pinned to the far right of the header */}
        <div ref={langRef} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 12 }}>
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

          {isAdministrator ? (
            <Link to="/admin" style={{ padding: '8px 12px', borderRadius: 6, background: '#0b74de', color: '#fff', textDecoration: 'none', fontSize: 14 }}>Admin Console</Link>
          ) : null}
        </div>
      </div>

      {/* bottom row: centered container with hamburger (left), search (center), controls (right) */}
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
        <div style={{ width: '100%', maxWidth: 1440, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }} aria-label="Home">
                <img src={logo} alt="GLOBE" style={{ height: 56, display: 'block' }} />
              </Link>
              <div ref={hamburgerRef} style={{ position: 'relative' }}>
                <button type="button" onClick={() => {
                  setShowHamburger(s => {
                    const next = !s;
                    if (next) setSelectedHamburgerCategory(headerCategories && headerCategories.length ? headerCategories[0] : null);
                    return next;
                  });
                }} style={{ background: 'none', border: '1.5px solid #d6e6f3', padding: '0 12px', cursor: 'pointer', fontSize: 15, borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 8, height: 40 }}>☰ <span style={{ fontSize: 14 }}>Menu</span></button>
                {showHamburger ? (
                  <div aria-hidden={!showHamburger} className={'hamburger-backdrop' + (panelActive ? ' open' : '')}>
                    <div className={'hamburger-panel' + (panelActive ? ' open' : '')}>
                      {/* left column: categories list */}
                      <aside style={{ width: 320, borderRight: '1px solid #eee', padding: 18, background: '#fbfdff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <strong style={{ fontSize: 16 }}>Të gjitha Kategoritë</strong>
                          <button onClick={() => setShowHamburger(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>✕</button>
                        </div>
                        <nav style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {headerCategories && headerCategories.length ? headerCategories.map(cat => (
                            <button key={cat.id || cat.name} onClick={() => setSelectedHamburgerCategory(cat)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 12px', borderRadius: 6, background: selectedHamburgerCategory && (selectedHamburgerCategory.id === cat.id) ? '#eef8ff' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 28, height: 28, borderRadius: 6, background: '#fff', border: '1px solid #e6eef6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{cat.icon || '▢'}</div>
                                <div style={{ fontWeight: 700, color: '#111' }}>{cat.name}</div>
                              </div>
                              <div style={{ color: '#888' }}>›</div>
                            </button>
                          )) : (
                            <div style={{ color: '#666' }}>No categories</div>
                          )}
                        </nav>
                      </aside>

                      {/* right column: mega content for selected category */}
                      <main style={{ flex: 1, padding: 20 }}>
                        {selectedHamburgerCategory ? (
                          <div>
                            <h3 style={{ marginTop: 0, marginBottom: 8 }}>{selectedHamburgerCategory.name}</h3>
                            {Array.isArray(selectedHamburgerCategory.subcategories) && selectedHamburgerCategory.subcategories.length ? (
                              // Use grid so child categories wrap into multiple rows as needed (visual only)
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 24 }}>
                                {selectedHamburgerCategory.subcategories.map((sc) => (
                                  <div key={sc.id || sc.name} style={{ minWidth: 160 }}>
                                    {/* make level-1 child clickable as well */}
                                    <div style={{ fontWeight: 800, marginBottom: 6 }}>
                                      <button type="button" onClick={() => { setShowHamburger(false); navigate(`/products?category=${encodeURIComponent(sc.name)}`); }} style={{ color: '#111', textDecoration: 'none', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 'inherit', fontWeight: 800 }}>{sc.name}</button>
                                    </div>
                                    {Array.isArray(sc.subcategories) && sc.subcategories.length ? (
                                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                        {sc.subcategories.map(ss => (
                                          <li key={ss.id || ss.name} style={{ marginBottom: 6 }}>
                                            <button type="button" onClick={() => { setShowHamburger(false); navigate(`/products?category=${encodeURIComponent(ss.name)}`); }} style={{ background: 'none', border: 'none', padding: 0, color: '#444', cursor: 'pointer' }}>{ss.name}</button>
                                          </li>
                                        ))}
                                      </ul>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={{ color: '#666' }}>No subcategories</div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <h3 style={{ marginTop: 0 }}>All categories</h3>
                            <CategoryMega nodes={headerCategories} onSelect={(name) => { setShowHamburger(false); navigate(`/products?category=${encodeURIComponent(name)}`); }} />
                          </div>
                        )}
                      </main>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1 }}>
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
                <button type="button" onClick={() => setB2bEnabled(s => !s)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 20, border: '1.5px solid #bfe6fb', background: '#fff', cursor: 'pointer' }} aria-pressed={b2bEnabled} title="B2B">
                  <div style={{ width: 36, height: 20, borderRadius: 20, background: b2bEnabled ? '#ffb84d' : '#eef6ff', position: 'relative' }}>
                    <div style={{ width: 14, height: 14, borderRadius: 12, background: b2bEnabled ? '#fff' : '#0b74de', position: 'absolute', top: 3, left: (b2bEnabled ? 19 : 3), transition: 'left 140ms linear' }} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>B2B</div>
                </button>
              </div>
              {/* action icons moved next to B2B */}
              <div style={{ marginLeft: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                <Link to="/wishlist" className="header-action" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 20, border: '1.5px solid #d6e6f3', textDecoration: 'none' }} aria-label="Wishlist">
                  <svg className="header-icon" width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path fill="currentColor" d="M12.1 21.3c-.4-.3-8.1-5.6-9.9-8.1C.5 11.2 2.4 7 6 7c1.9 0 3.2.9 4.1 2.2.9-1.3 2.2-2.2 4.1-2.2 3.6 0 5.5 4.2 3.8 6.2-1.8 2.5-9.5 7.9-9.9 8.1z" />
                  </svg>
                  {wishlistCount ? (
                    <span style={{ position: 'absolute', top: -6, right: -6, background: '#0b74de', color: '#fff', borderRadius: 10, padding: '2px 6px', fontSize: 12 }}>{wishlistCount}</span>
                  ) : null}
                </Link>
                <Link to="/cart" className="header-action" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 20, border: '1.5px solid #d6e6f3', textDecoration: 'none' }} aria-label="Cart">
                  <svg className="header-icon" width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path fill="currentColor" d="M7 4h-2l-1 2h2l3.6 7.6-1.35 2.4A1.99 1.99 0 0 0 10.25 18h7.45v-2H10.9l.6-1h7.05c.78 0 1.42-.55 1.58-1.3l1.25-6.7H6.21L5.27 4H7zM9 20a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm8 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" />
                  </svg>
                  {cartCount ? (
                    <span style={{ position: 'absolute', top: -6, right: -6, background: '#d32', color: '#fff', borderRadius: 10, padding: '2px 6px', fontSize: 12 }}>{cartCount}</span>
                  ) : null}
                </Link>
                <div ref={profileRef} style={{ position: 'relative' }}>
                  <button className="header-action" type="button" onClick={() => { if (!hasToken) navigate('/login'); else setShowProfileMenu(s => !s); }} title="Profile" aria-label="Profile" aria-haspopup="true" aria-expanded={showProfileMenu} style={{ width: 40, height: 40, borderRadius: 20, border: '1.5px solid #d6e6f3', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg className="header-icon" width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path fill="currentColor" d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-4.4 0-8 2.2-8 4.9V22h16v-3.1c0-2.7-3.6-4.9-8-4.9z" />
                    </svg>
                  </button>
                  {showProfileMenu && hasToken ? (
                    <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 8, background: '#fff', border: '1px solid #eee', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', padding: 8, zIndex: 95, minWidth: 160 }}>
                      <Link to="/profile" onClick={() => setShowProfileMenu(false)} style={{ display: 'block', padding: '8px 12px', textDecoration: 'none', color: '#111' }}>Profile</Link>
                      <button type="button" onClick={() => { setShowProfileMenu(false); handleLogout(); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer' }}>Logout</button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </form>

          {/* right-side controls are pinned in the top row; removed duplicate Admin Console here */}
        </div>
      </div>

      {/* announcement bar like the uploaded design - show only on homepage */}
      {location && location.pathname === '/' ? (
        <div style={{ width: '100%', background: '#f6f6f6', padding: '20px 0' }}>
          <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 18px' }}>
            <div style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-start' }}>
              <div style={{ width: 52, height: 52, borderRadius: 26, border: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', fontSize: 22 }}>!</div>
              <div style={{ color: '#333', letterSpacing: 0.6, fontSize: 14, textTransform: 'uppercase', fontWeight: 600, textAlign: 'left' }}>LOREM IPSUM DOLOR SIT AMET, CONSECTETUER ADIPISCING ELIT, SED DIAM NONUMMY NIBH EUISMOD EUISMOD IBH EUISMOD EUISMOD</div>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
