import React, { useState, useEffect, useRef } from 'react';
import './Filters.css';

// Icons
const IconStar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="#ccc" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor" />
  </svg>
);
const IconStarFilled = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="#f59e0b" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor" />
  </svg>
);
const IconClock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);
const IconFire = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="none" />
    <path d="M13.5 3C13.5 3 16.5 6.5 16.5 9.5C16.5 11.5 15 13 13.5 13C13.5 13 15.5 14.5 15.5 16.5C15.5 18.5 13.5 20.5 11.5 20.5C9.5 20.5 7.5 18.5 7.5 16.5C7.5 14.5 9.5 13 9.5 13C8 13 6.5 11.5 6.5 9.5C6.5 6.5 9.5 3 9.5 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconChevronDown = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#008080" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);
const IconChevronUp = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#008080" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15"></polyline>
  </svg>
);

export default function Filters({ initial = {}, onChange = () => { }, categories = [], brands = [] }) {
  const [filters, setFilters] = useState({
    category: initial.category || '',
    category_child1: initial.category_child1 || '',
    category_child2: initial.category_child2 || '',
    offer: initial.offer || false,
    isNew: initial.isNew || false,
    specialPrice: initial.specialPrice || false,
    brand: initial.brand ? (initial.brand.includes(',') ? initial.brand.split(',') : [initial.brand]) : [],
    priceMin: initial.priceMin || '',
    priceMax: initial.priceMax || '',
    warranty: initial.warranty || '',
    ratingMin: initial.ratingMin || '',
  });

  const [brandSearch, setBrandSearch] = useState('');
  const [openSections, setOpenSections] = useState({
    categories: true,
    focus: true,
    brand: true,
    price: true,
    warranty: true,
    spec1: true,
    spec2: true,
    spec3: true,
    spec4: true,
    spec5: true,
    rating: true,
  });

  // Notify parent of changes
  useEffect(() => {
    const payload = { ...filters };

    // Convert brand array to comma-separated string if backend expects string
    if (Array.isArray(payload.brand)) {
      payload.brand = payload.brand.join(',');
    }

    // Deepest category logic
    const deepest = filters.category_child2 || filters.category_child1 || filters.category || '';
    payload.category = deepest;

    // Remove empty-string values so downstream builders don't receive '' as a value
    Object.keys(payload).forEach(k => {
      if (payload[k] === '') delete payload[k];
      // normalize brand: ensure empty string becomes absent, arrays remain
      if (k === 'brand' && payload[k] === '') delete payload[k];
    });

    // emit payload to parent
    onChange(payload);
  }, [filters]);

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleBrand = (b) => {
    setFilters(prev => {
      const current = Array.isArray(prev.brand) ? prev.brand : (prev.brand ? [prev.brand] : []);
      if (current.includes(b)) {
        return { ...prev, brand: current.filter(item => item !== b) };
      } else {
        return { ...prev, brand: [...current, b] };
      }
    });
  };

  // Categories Logic
  const topCategories = categories || [];
  const nodeChildren = (node) => node.subcategories || node.children || [];

  // If the parent page provided an initial category (name or id), attempt to
  // resolve it against the provided `categories` tree and select the matching
  // node (top/child/grandchild). This ensures that navigating from header
  // links with `?category=Name` will result in the Filters UI showing that
  // category as selected.
  useEffect(() => {
    if (!initial) return;
    const candidate = initial.category || initial.categoryName || '';
    if (!candidate) return;

    // normalize comparator
    const norm = (s) => (s === undefined || s === null) ? '' : String(s).toLowerCase().trim();
    const target = norm(candidate);

    if (!target) return;

    // search tree for a node with matching name (case-insensitive)
    const findPath = (nodes, tgt) => {
      for (const n of nodes || []) {
        if (!n) continue;
        if (norm(n.name) === tgt) return [n];
        const children = nodeChildren(n);
        if (children && children.length) {
          for (const c of children) {
            if (!c) continue;
            if (norm(c.name) === tgt) return [n, c];
            const gchildren = nodeChildren(c);
            if (gchildren && gchildren.length) {
              for (const g of gchildren) {
                if (!g) continue;
                if (norm(g.name) === tgt) return [n, c, g];
              }
            }
          }
        }
      }
      return null;
    };

    const path = findPath(categories || [] , target);
    if (path && path.length) {
      const l1 = path[0];
      const l2 = path[1] || '';
      const l3 = path[2] || '';
      setCategoryPath(l1, l2, l3);
    } else {
      // if candidate looks numeric, try to set by id directly
      const asNum = Number(candidate);
      if (!Number.isNaN(asNum) && Number.isFinite(asNum)) {
        setFilters(prev => ({ ...prev, category: String(asNum), category_child1: '', category_child2: '' }));
      }
    }
  }, [initial, categories]);

  // (dev) removed verbose console debug logging to keep console clean

  // Helper to set category path
  const setCategoryPath = (l1, l2 = '', l3 = '') => {
    setFilters(prev => ({
      ...prev,
      category: l1 ? String(l1.id || l1.name) : '',
      category_child1: l2 ? String(l2.id || l2.name) : '',
      category_child2: l3 ? String(l3.id || l3.name) : '',
      // also store human-readable names so client can send them directly
      categoryName: l1 ? String(l1.name) : '',
      category_child1_name: l2 ? String(l2.name) : '',
      category_child2_name: l3 ? String(l3.name) : ''
    }));
  };

  // Price Slider Logic (Simple visual representation)
  const handlePriceChange = (type, val) => {
    updateFilter(type, val);
  };

  return (
    <div className="filters-sidebar">

      {/* Categories Section */}
      <div className="filter-section">
        <div className="filter-header" onClick={() => toggleSection('categories')}>
          <span className="section-title">Kategoritë</span>
          {openSections.categories ? <IconChevronUp /> : <IconChevronDown />}
        </div>
        {openSections.categories && (
          <div className="filter-content categories-list">
            {topCategories.map(cat => {
              const isSelected = filters.category === String(cat.id || cat.name);
              const children = nodeChildren(cat);
              return (
                <div key={cat.id || cat.name} className="cat-item-l1">
                  <div className={`cat-link ${isSelected ? 'active' : ''}`} onClick={() => setCategoryPath(cat)}>
                    <div style={{ flex: 1 }}>{cat.name}</div>
                    {children.length > 0 && (
                      <span
                        style={{ fontSize: 10, color: isSelected ? '#008080' : '#999', padding: '0 4px', cursor: 'pointer' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isSelected) {
                            setFilters(prev => ({ ...prev, category: '', category_child1: '', category_child2: '' }));
                          } else {
                            setCategoryPath(cat);
                          }
                        }}
                      >
                        {isSelected ? '▲' : '▼'}
                      </span>
                    )}
                  </div>
                  {children.length > 0 && isSelected && (
                    <div className="cat-children">
                      {children.map(child => {
                        const isChildSelected = filters.category_child1 === String(child.id || child.name);
                        const grandChildren = nodeChildren(child);
                        return (
                          <div key={child.id || child.name} className="cat-item-l2">
                            <div className={`cat-link ${isChildSelected ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setCategoryPath(cat, child); }}>
                              <div style={{ flex: 1 }}>{child.name} {child.itemsCount ? `(${child.itemsCount})` : ''}</div>
                            </div>
                            {grandChildren.length > 0 && isChildSelected && (
                              <div className="cat-grandchildren">
                                {grandChildren.map(grand => (
                                  <div key={grand.id || grand.name}
                                    className={`cat-link l3 ${filters.category_child2 === String(grand.id || grand.name) ? 'active' : ''}`}
                                    onClick={(e) => { e.stopPropagation(); setCategoryPath(cat, child, grand); }}>
                                    {grand.name} {grand.itemsCount ? `(${grand.itemsCount})` : ''}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="divider"></div>

      {/* In Focus Section */}
      <div className="filter-section">
        <div className="filter-header" onClick={() => toggleSection('focus')}>
          <span className="section-title">Në fokus</span>
          {openSections.focus ? <IconChevronUp /> : <IconChevronDown />}
        </div>
        {openSections.focus && (
          <div className="filter-content focus-list">
            <label className="checkbox-item">
              <IconStar />
              <span className="icon-label">E RE</span>
              <input type="checkbox" checked={filters.isNew} onChange={e => updateFilter('isNew', e.target.checked)} />
            </label>
            <label className="checkbox-item">
              <IconClock />
              <span className="icon-label">OFERTË E LIMITUAR</span>
              <input type="checkbox" checked={filters.offer} onChange={e => updateFilter('offer', e.target.checked)} />
            </label>
            <label className="checkbox-item">
              <IconFire />
              <span className="icon-label">ÇMIM SPECIAL</span>
              <input type="checkbox" checked={filters.specialPrice} onChange={e => updateFilter('specialPrice', e.target.checked)} />
            </label>
          </div>
        )}
      </div>

      <div className="divider"></div>

      {/* Brand Section */}
      <div className="filter-section">
        <div className="filter-header" onClick={() => toggleSection('brand')}>
          <span className="section-title">Marka</span>
          {openSections.brand ? <IconChevronUp /> : <IconChevronDown />}
        </div>
        {openSections.brand && (
          <div className="filter-content">
            <input
              type="text"
              placeholder="Kërko markën"
              className="brand-search"
              value={brandSearch}
              onChange={(e) => setBrandSearch(e.target.value)}
            />
              {/* compact: brands list will render below */}
              <div className="brand-list">
              {brands
                .filter(b => b.toLowerCase().includes(brandSearch.toLowerCase()))
                .map(b => (
                  <label key={b} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={(Array.isArray(filters.brand) ? filters.brand : [filters.brand]).includes(b)}
                      onChange={() => toggleBrand(b)}
                    />
                    <span className="brand-name">{b}</span>
                    {/* <span className="count">(96)</span> */}
                  </label>
                ))}
            </div>
          </div>
        )}
      </div>

      <div className="divider"></div>

      {/* Price Section */}
      <div className="filter-section">
        <div className="filter-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <span className="section-title">Nga</span> <span className="section-title">Deri në</span>
          </div>
        </div>
        <div className="price-inputs">
          <div className="price-input-wrap">
            <input type="number" value={filters.priceMin} onChange={e => handlePriceChange('priceMin', e.target.value)} placeholder="15 000 L" />
          </div>
          <div className="price-input-wrap">
            <input type="number" value={filters.priceMax} onChange={e => handlePriceChange('priceMax', e.target.value)} placeholder="217 000 L" />
          </div>
        </div>
        <div className="price-slider-container">
          <input
            type="range"
            min="0"
            max="300000"
            value={filters.priceMin || 0}
            onChange={e => {
              const val = Math.min(Number(e.target.value), (filters.priceMax || 300000) - 1000);
              handlePriceChange('priceMin', val);
            }}
            className="thumb thumb-left"
            style={{ zIndex: (filters.priceMin || 0) > 200000 ? 5 : 3 }}
          />
          <input
            type="range"
            min="0"
            max="300000"
            value={filters.priceMax || 300000}
            onChange={e => {
              const val = Math.max(Number(e.target.value), (filters.priceMin || 0) + 1000);
              handlePriceChange('priceMax', val);
            }}
            className="thumb thumb-right"
            style={{ zIndex: 4 }}
          />
          <div className="slider">
            <div className="slider-track" />
            <div
              className="slider-range"
              style={{
                left: `${((filters.priceMin || 0) / 300000) * 100}%`,
                right: `${100 - ((filters.priceMax || 300000) / 300000) * 100}%`
              }}
            />
          </div>
        </div>
      </div>

      <div className="divider"></div>

      {/* Warranty Section */}
      <div className="filter-section">
        <div className="filter-header" onClick={() => toggleSection('warranty')}>
          <span className="section-title">Garancia</span>
          {openSections.warranty ? <IconChevronUp /> : <IconChevronDown />}
        </div>
        {openSections.warranty && (
          <div className="filter-content">
            {['12 muaj', '24 muaj', '36 muaj'].map(w => (
              <label key={w} className="checkbox-item">
                <input type="checkbox" checked={filters.warranty === w} onChange={() => updateFilter('warranty', filters.warranty === w ? '' : w)} />
                <span>{w}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="divider"></div>

      {/* Specs Sections (Mocked) */}
      {[1, 2, 3, 4, 5].map(i => (
        <React.Fragment key={i}>
          <div className="filter-section">
            <div className="filter-header" onClick={() => toggleSection(`spec${i}`)}>
              <span className="section-title">Specifika {i}</span>
              {openSections[`spec${i}`] ? <IconChevronUp /> : <IconChevronDown />}
            </div>
            {openSections[`spec${i}`] && (
              <div className="filter-content">
                <div className="spec-placeholder">No options available</div>
              </div>
            )}
          </div>
          <div className="divider"></div>
        </React.Fragment>
      ))}

      {/* Rating Section */}
      <div className="filter-section">
        <div className="filter-header" onClick={() => toggleSection('rating')}>
          <span className="section-title">Vlerësimi i klientit</span>
          {openSections.rating ? <IconChevronUp /> : <IconChevronDown />}
        </div>
        {openSections.rating && (
          <div className="filter-content rating-list">
            {[5, 4, 3, 2, 1].map(stars => (
              <label key={stars} className="checkbox-item">
                <input
                  type="checkbox"
                  checked={String(filters.ratingMin) === String(stars)}
                  onChange={() => updateFilter('ratingMin', String(filters.ratingMin) === String(stars) ? '' : String(stars))}
                />
                <div className="stars">
                  {[...Array(5)].map((_, i) => (
                    i < stars ? <IconStarFilled key={i} /> : <IconStar key={i} />
                  ))}
                </div>
                <span className="count">({Math.floor(Math.random() * 1000)})</span>
              </label>
            ))}
            <label className="checkbox-item">
              <input type="checkbox" checked={filters.ratingMin === ''} onChange={() => updateFilter('ratingMin', '')} />
              <span>Të gjitha vlerësimet</span>
            </label>
          </div>
        )}
      </div>

    </div>
  );
}
