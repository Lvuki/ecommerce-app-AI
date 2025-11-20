import React, { useState, useEffect } from 'react';
import './Filters.css';

// Reusable Filters component
// Props:
// - initial: object with initial filter values
// - onChange: function(filters) called when filter set changes
// - categories: optional array of category trees [{ id, name, children: [...] }]
// - brands: optional array of brand strings
export default function Filters({ initial = {}, onChange = () => {}, categories = [], brands = [] }) {
  const [filters, setFilters] = useState({
    category: initial.category || '',
    category_child1: initial.category_child1 || '',
    category_child2: initial.category_child2 || '',
    offer: initial.offer || false,
    isNew: initial.isNew || false,
    brand: initial.brand || '',
    priceMin: initial.priceMin || '',
    priceMax: initial.priceMax || '',
    warranty: initial.warranty || '',
    specKey: initial.specKey || '',
    specValue: initial.specValue || '',
    ratingMin: initial.ratingMin || '',
  });

  useEffect(() => onChange(filters), [filters]);

  function update(k, v) {
    setFilters(f => ({ ...f, [k]: v }));
  }

  // Simple category dropdowns — if categories provided it will try to populate children
  const topCategories = categories || [];

  function childrenFor(level, parentVal) {
    if (!parentVal) return [];
    const found = topCategories.find(c => String(c.id) === String(parentVal) || c.name === parentVal);
    if (!found) return [];
    if (level === 1) return found.children || [];
    // level 2: look into child selected in filters.category_child1
    const child = (found.children || []).find(ch => String(ch.id) === String(filters.category_child1) || ch.name === filters.category_child1);
    return child ? (child.children || []) : [];
  }

  return (
    <div className="filters-panel">
      <div className="filters-row">
        <label>Category</label>
        <select value={filters.category} onChange={e => update('category', e.target.value)}>
          <option value="">All</option>
          {topCategories.map(c => <option key={c.id || c.name} value={c.id || c.name}>{c.name}</option>)}
        </select>
      </div>

      <div className="filters-row">
        <label>Subcategory 1</label>
        <select value={filters.category_child1} onChange={e => update('category_child1', e.target.value)}>
          <option value="">All</option>
          {childrenFor(1, filters.category).map(c => <option key={c.id || c.name} value={c.id || c.name}>{c.name}</option>)}
        </select>
      </div>

      <div className="filters-row">
        <label>Subcategory 2</label>
        <select value={filters.category_child2} onChange={e => update('category_child2', e.target.value)}>
          <option value="">All</option>
          {childrenFor(2, filters.category).map(c => <option key={c.id || c.name} value={c.id || c.name}>{c.name}</option>)}
        </select>
      </div>

      <div className="filters-row checkbox-row">
        <label><input type="checkbox" checked={filters.offer} onChange={e => update('offer', e.target.checked)} /> Offer</label>
        <label><input type="checkbox" checked={filters.isNew} onChange={e => update('isNew', e.target.checked)} /> New</label>
      </div>

      <div className="filters-row">
        <label>Brand</label>
        <select value={filters.brand} onChange={e => update('brand', e.target.value)}>
          <option value="">Any</option>
          {brands.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      <div className="filters-row price-row">
        <label>Price</label>
        <input type="number" placeholder="Min" value={filters.priceMin} onChange={e => update('priceMin', e.target.value)} />
        <span className="sep">—</span>
        <input type="number" placeholder="Max" value={filters.priceMax} onChange={e => update('priceMax', e.target.value)} />
      </div>

      <div className="filters-row">
        <label>Warranty</label>
        <select value={filters.warranty} onChange={e => update('warranty', e.target.value)}>
          <option value="">Any</option>
          <option value="0">No warranty</option>
          <option value="6">6 months</option>
          <option value="12">12 months</option>
          <option value="24">24 months</option>
        </select>
      </div>

      <div className="filters-row spec-row">
        <label>Spec</label>
        <input placeholder="Key (e.g. color)" value={filters.specKey} onChange={e => update('specKey', e.target.value)} />
        <input placeholder="Value (e.g. red)" value={filters.specValue} onChange={e => update('specValue', e.target.value)} />
      </div>

      <div className="filters-row">
        <label>Rating</label>
        <select value={filters.ratingMin} onChange={e => update('ratingMin', e.target.value)}>
          <option value="">Any</option>
          <option value="1">1+</option>
          <option value="2">2+</option>
          <option value="3">3+</option>
          <option value="4">4+</option>
        </select>
      </div>

      <div className="filters-actions">
        <button onClick={() => { setFilters({}); onChange({}); }}>Reset</button>
      </div>
    </div>
  );
}
