import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getCategories } from '../services/categoryService';
import { getProductById } from '../services/productService';
import { getPageBySlug } from '../services/pageService';
import { getPostById } from '../services/blogService';

function niceLabel(segment) {
  if (!segment) return '';
  return segment.replace(/[-_]/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

function normalizeStr(s) {
  if (s === undefined || s === null) return '';
  try {
    // trim, unicode-normalize and remove diacritics, then lowercase
    return String(s).trim().normalize('NFKD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  } catch (err) {
    // fallback for older runtimes: basic remove combining marks range
    return String(s).trim().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
}

export default function Breadcrumbs({ separator = '›', hideOnRoot = true }) {
  const loc = useLocation();
  const [crumbs, setCrumbs] = useState([]);
  // Debug UI removed: breadcrumb debug toggle and debug panel are disabled

  useEffect(() => {
    let mounted = true;
    const build = async () => {
      const parts = loc.pathname.split('/').filter(Boolean);
      const params = new URLSearchParams(loc.search || '');
      const categoryParam = params.get('category');
      const base = [{ to: '/', label: 'KREU' }];

      const isProductView = parts[0] === 'products' && parts[1];
      // If a `category` query param exists (and we're not on a product detail),
      // treat the page as a category view so breadcrumbs reflect the selected category.
      const isCategoryView = Boolean(categoryParam) && !isProductView;

      // Helper to build a standardized category path from either an array or a string.
      const resolveProductCategoryPath = async (p) => {
        if (!p) return null;
        // If explicit categories array present, prefer that (and map to strings)
        if (Array.isArray(p.categories) && p.categories.length) return p.categories.map(c => typeof c === 'string' ? c : (c && c.name) || String(c));
        // If we have a simple category string, try to match it against the
        // server category tree to produce a proper top->child path.
        if (p.category) {
          // Try an exact category name lookup via the category tree first
          try {
            const tree = await getCategories();
            const decoded = String(p.category || '').trim();
            // If the stored category looks like a path (contains separators),
            // prefer splitting on common separators and then try to match the
            // last segment against the category tree.
              const partsFromStr = String(decoded).split(/\s*[›>\/\\-]\s*/).map(s => s.trim()).filter(Boolean);
              const targetCandidates = partsFromStr.length ? partsFromStr.slice().reverse() : [decoded];
              // try matching from last segment backwards (child -> parent)
              for (const cand of targetCandidates) {
                const targetNorm = normalizeStr(cand || decoded);
                function findPath(nodes, target, path = []) {
                  for (const n of nodes || []) {
                    const nextPath = path.concat(n.name);
                    if (normalizeStr(n.name) === target) return nextPath;
                    if (Array.isArray(n.subcategories) && n.subcategories.length) {
                      const found = findPath(n.subcategories, target, nextPath);
                      if (found) return found;
                    }
                  }
                  return null;
                }
                const pathArr = findPath(Array.isArray(tree) ? tree : [], targetNorm);
                if (pathArr && pathArr.length) return pathArr;
              }
              // If no exact match, try fuzzy contains match across the tree (last resort)
              const flatSearch = (nodes) => {
                for (const n of nodes || []) {
                  const nn = normalizeStr(n.name || '');
                  for (const cand of partsFromStr) {
                    if (!cand) continue;
                    if (nn.includes(normalizeStr(cand))) return n.name;
                  }
                  if (Array.isArray(n.subcategories) && n.subcategories.length) {
                    const f = flatSearch(n.subcategories);
                    if (f) return f;
                  }
                }
                return null;
              };
              const foundName = flatSearch(Array.isArray(tree) ? tree : []);
              if (foundName) {
                // build path by finding the foundName
                function findPathByName(nodes, target, path = []) {
                  for (const n of nodes || []) {
                    const nextPath = path.concat(n.name);
                    if (n.name === target) return nextPath;
                    if (Array.isArray(n.subcategories) && n.subcategories.length) {
                      const found = findPathByName(n.subcategories, target, nextPath);
                      if (found) return found;
                    }
                  }
                  return null;
                }
                const pathArr2 = findPathByName(Array.isArray(tree) ? tree : [], foundName);
                if (pathArr2 && pathArr2.length) return pathArr2;
              }
            function findPath(nodes, target, path = []) {
              for (const n of nodes || []) {
                const nextPath = path.concat(n.name);
                if (normalizeStr(n.name) === target) return nextPath;
                if (Array.isArray(n.subcategories) && n.subcategories.length) {
                  const found = findPath(n.subcategories, target, nextPath);
                  if (found) return found;
                }
              }
              return null;
            }
            const pathArr = findPath(Array.isArray(tree) ? tree : [], normalizeStr(decoded));
            if (pathArr && pathArr.length) return pathArr;
            // Fallback: return the splitted parts (this preserves the original stored path)
            if (partsFromStr.length) return partsFromStr;
          } catch (e) {
            // ignore and fall through
          }
        }
        return null;
      };

      // Build crumbs for product view
      if (isProductView) {
        try {
          const p = await getProductById(parts[1]);
          // debug: log product payload to help diagnose unresolved categories
          if (p) console.debug('Breadcrumbs: product payload', { id: parts[1], product: p });
          const out = [];
          const seen = new Set();
          const add = (to, label) => {
            const key = normalizeStr(label || '');
            if (seen.has(key)) return;
            seen.add(key);
            out.push({ to, label });
          };

          // Add a simple 'Products' link (may be removed if we insert categories)
          add('/products', 'Products');

          let productCatPath = await resolveProductCategoryPath(p);
          if (productCatPath) console.debug('Breadcrumbs: resolved productCatPath', productCatPath);
          // debug info collection removed
          // If we didn't resolve via tree or categories array, try a naive split
          if (!productCatPath && p && p.category) {
            const naive = String(p.category).split(/\s*[›>\/\\-]\s*/).map(s => s.trim()).filter(Boolean);
            if (naive.length) productCatPath = naive;
          }

          if (Array.isArray(productCatPath) && productCatPath.length) {
            // Replace the 'Products' crumb with the category hierarchy
            const mapped = productCatPath.map(catLabel => ({ to: { pathname: '/products', search: `?category=${encodeURIComponent(catLabel)}` }, label: catLabel }));
            // clear out and add mapped
            const idx = out.findIndex(x => normalizeStr(x.label) === normalizeStr('products'));
            if (idx !== -1) out.splice(idx, 1);
            for (const m of mapped) add(m.to, m.label);
          }

          // Finally the product name (or id fallback)
          if (p && p.name) add(`${loc.pathname}`, p.name);
          else add(`${loc.pathname}`, niceLabel(parts[1]));

          if (mounted) setCrumbs(base.concat(out));
          return;
        } catch (err) {
          console.error('Breadcrumbs: failed to resolve product', err);
        }
      }

      // Category view: build full category path
      if (isCategoryView) {
        try {
          const tree = await getCategories();
          const decodedTarget = decodeURIComponent(categoryParam || '');
          // split common separators in case a path was passed (parent > child)
          const partsFromParam = String(decodedTarget).split(/\s*[›>\/\\-]\s*/).map(s => s.trim()).filter(Boolean);
          const targetCandidates = partsFromParam.length ? partsFromParam.slice().reverse() : [decodedTarget];

          // Flexible find: try exact, then includes (fuzzy), returning full path when found
          function findPath(nodes, targetNorm, path = []) {
            for (const n of nodes || []) {
              const nextPath = path.concat(n.name);
              const nameNorm = normalizeStr(n.name || '');
              if (nameNorm === targetNorm) return nextPath;
              if (nameNorm.includes(targetNorm) || targetNorm.includes(nameNorm)) return nextPath;
              if (Array.isArray(n.subcategories) && n.subcategories.length) {
                const found = findPath(n.subcategories, targetNorm, nextPath);
                if (found) return found;
              }
            }
            return null;
          }

          let pathArr = null;
          for (const cand of targetCandidates) {
            const candNorm = normalizeStr(cand || decodedTarget);
            pathArr = findPath(Array.isArray(tree) ? tree : [], candNorm);
            if (pathArr && pathArr.length) break;
          }
          const out = [];
          const seen = new Set();
          const add = (to, label) => { if (!seen.has(normalizeStr(label || ''))) { seen.add(normalizeStr(label || '')); out.push({ to, label }); } };
            if (pathArr && pathArr.length) {
            for (const catLabel of pathArr) add({ pathname: '/products', search: `?category=${encodeURIComponent(catLabel)}` }, catLabel);
          } else {
            // fallback: show the raw category param but link into products listing
            add({ pathname: '/products', search: `?category=${encodeURIComponent(decodedTarget)}` }, decodedTarget);
          }
          if (mounted) setCrumbs(base.concat(out));
          return;
        } catch (err) {
          console.error('Breadcrumbs: failed to resolve category path', err);
        }
      }

      // Default behaviour: simple path segments with attempts to resolve pages/blogs
      try {
        const out = [];
        const seen = new Set();
        const add = (to, label) => { if (!seen.has(normalizeStr(label || ''))) { seen.add(normalizeStr(label || '')); out.push({ to, label }); } };
        let acc = '';
        for (let i = 0; i < parts.length; i++) {
          const seg = parts[i];
          acc += `/${seg}`;
          const prev = parts[i - 1];
          let label = niceLabel(seg);
          try {
            if (prev === 'pages' || parts[0] === 'pages') {
              const pg = await getPageBySlug(seg);
              if (pg && pg.title) label = pg.title;
            } else if (prev === 'blogs' || parts[0] === 'blogs') {
              const blog = await getPostById(seg);
              if (blog && blog.title) label = blog.title;
            }
          } catch (e) { /* ignore */ }
          add(acc, label);
        }
        if (mounted) setCrumbs(base.concat(out));
        return;
      } catch (err) {
        console.error('Breadcrumbs: default build failed', err);
      }
    };

    build();
    return () => { mounted = false; };
  }, [loc.pathname, loc.search]);

  // If only home and hideOnRoot requested, don't render
  if (hideOnRoot && crumbs.length <= 1) return null;

  return (
    <>
      <nav aria-label="Breadcrumb" style={{ padding: '8px 16px', maxWidth: 1200, margin: '0 auto', fontSize: 14, color: '#333' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {crumbs.map((c, i) => (
          <li key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {(() => {
              const isHome = i === 0;
              const Icon = (
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }}>
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                </svg>
              );
              if (i < crumbs.length - 1) {
                return (
                  <Link to={c.to} style={{ color: '#0b74de', textDecoration: 'none', fontSize: 14, fontWeight: 500, display: 'inline-flex', alignItems: 'center' }}>
                    {isHome ? Icon : null}
                    <span>{c.label}</span>
                  </Link>
                );
              }
              return (
                <span aria-current="page" style={{ color: '#666', fontWeight: 600, fontSize: 14, display: 'inline-flex', alignItems: 'center' }}>
                  {isHome ? Icon : null}
                  <span>{c.label}</span>
                </span>
              );
            })()}
            {i < crumbs.length - 1 ? <span style={{ color: '#bbb', fontSize: 14 }}>{separator}</span> : null}
          </li>
        ))}
          </ol>
          <div style={{ marginLeft: 12 }} />
        </div>
      </nav>
      {/* debug panel removed */}
    </>
  );
}
