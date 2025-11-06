import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getProductById } from '../services/productService';
import { getPageBySlug } from '../services/pageService';
import { getPostById } from '../services/blogService';

function niceLabel(segment) {
  if (!segment) return '';
  return segment.replace(/[-_]/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

export default function Breadcrumbs({ separator = '›', hideOnRoot = true }) {
  const loc = useLocation();
  const [crumbs, setCrumbs] = useState([]);

  useEffect(() => {
    let mounted = true;
    const build = async () => {
      const parts = loc.pathname.split('/').filter(Boolean);
      const base = [{ to: '/', label: 'Home' }];
      const out = [];
      let acc = '';

      for (let i = 0; i < parts.length; i++) {
        const seg = parts[i];
        acc += `/${seg}`;
        let label = niceLabel(seg);

        // Try to resolve dynamic segments like products/:id, pages/:slug, blogs/:id
        const prev = parts[i - 1];
        try {
          if (prev === 'products') {
            // seg likely an id
            const p = await getProductById(seg);
            if (p && p.name) label = p.name;
          } else if (prev === 'pages' || parts[0] === 'pages') {
            // slug
            const slug = seg;
            const pg = await getPageBySlug(slug);
            if (pg && pg.title) label = pg.title;
          } else if (prev === 'blogs' || parts[0] === 'blogs') {
            const blog = await getPostById(seg);
            if (blog && blog.title) label = blog.title;
          }
        } catch (err) {
          // ignore resolution failures — fall back to nicelabel
        }

        out.push({ to: acc, label });
      }

      const all = base.concat(out);
      if (mounted) setCrumbs(all);
    };

    build();
    return () => { mounted = false; };
  }, [loc.pathname]);

  // If only home and hideOnRoot requested, don't render
  if (hideOnRoot && crumbs.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" style={{ padding: '8px 16px', maxWidth: 1200, margin: '0 auto', fontSize: 13, color: '#333' }}>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {crumbs.map((c, i) => (
          <li key={c.to} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {i < crumbs.length - 1 ? (
              <Link to={c.to} style={{ color: '#0b74de', textDecoration: 'none' }}>{c.label}</Link>
            ) : (
              <span aria-current="page" style={{ color: '#444', fontWeight: 600 }}>{c.label}</span>
            )}
            {i < crumbs.length - 1 ? <span style={{ color: '#999' }}>{separator}</span> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}
