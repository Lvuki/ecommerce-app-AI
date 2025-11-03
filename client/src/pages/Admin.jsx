import React, { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate, Outlet } from 'react-router-dom';
import AdminSummary from '../components/AdminSummary';
import { isAdmin, getToken } from '../services/authService';
import API_BASE_URL from '../config';

export default function Admin() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/login');
    }
  }, [navigate]);

  return (
    <div className="page-container" style={{ display: 'flex', gap: 20, padding: 20 }}>
      <aside style={{ width: 220, minWidth: 200, border: '1px solid #eee', borderRadius: 8, padding: 12, background: '#fff', height: 'calc(100vh - 120px)', boxSizing: 'border-box', position: 'sticky', top: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 12 }}>Admin</div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/** NavLink gives active class/state so we can style the current item */}
          <NavLink to="/admin" style={({ isActive }) => isActive ? { fontWeight: 700, color: '#0b74de' } : undefined}>Dashboard</NavLink>
          <NavLink to="/admin/users" style={({ isActive }) => isActive ? { fontWeight: 700, color: '#0b74de' } : undefined}>Users</NavLink>
          <NavLink to="/admin/blogs" style={({ isActive }) => isActive ? { fontWeight: 700, color: '#0b74de' } : undefined}>Blogs</NavLink>
          <NavLink to="/admin/products" style={({ isActive }) => isActive ? { fontWeight: 700, color: '#0b74de' } : undefined}>Products</NavLink>
          <NavLink to="/admin/orders" style={({ isActive }) => isActive ? { fontWeight: 700, color: '#0b74de' } : undefined}>Orders</NavLink>
          <NavLink to="/admin/reports" style={({ isActive }) => isActive ? { fontWeight: 700, color: '#0b74de' } : undefined}>Reports</NavLink>
          <NavLink to="/admin/pages" style={({ isActive }) => isActive ? { fontWeight: 700, color: '#0b74de' } : undefined}>Pages</NavLink>
        </nav>
        <div style={{ marginTop: 18, fontSize: 13, color: '#666' }}>
          <div style={{ marginBottom: 6 }}><strong>Tips</strong></div>
          <div>- Use the links to manage content.</div>
          <div>- Pages are protected; login as admin required.</div>
        </div>
      </aside>

      <main style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0 }}>Admin Console</h1>
        </div>

        <div style={{ marginTop: 18 }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

// default content for the /admin index route
export function AdminHome() {
  return (
    <div>
      <div style={{ marginTop: 18, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <Link to="/admin/users" style={{ textDecoration: 'none' }}>
          <div style={{ padding: 12, border: '1px solid #eee', borderRadius: 8, background: '#fff' }}>
            <div style={{ fontWeight: 700 }}>User Management</div>
            <div style={{ color: '#666', marginTop: 6 }}>Create, edit and remove users.</div>
          </div>
        </Link>

        <Link to="/admin/blogs" style={{ textDecoration: 'none' }}>
          <div style={{ padding: 12, border: '1px solid #eee', borderRadius: 8, background: '#fff' }}>
            <div style={{ fontWeight: 700 }}>Blog Posts</div>
            <div style={{ color: '#666', marginTop: 6 }}>Add and manage blog posts and categories.</div>
          </div>
        </Link>

        {/* Categories are managed via /admin/products; removed duplicate quick-link */}

        <Link to="/admin/products" style={{ textDecoration: 'none' }}>
          <div style={{ padding: 12, border: '1px solid #eee', borderRadius: 8, background: '#fff' }}>
            <div style={{ fontWeight: 700 }}>Products</div>
            <div style={{ color: '#666', marginTop: 6 }}>Create and update products (admin required).</div>
          </div>
        </Link>
  </div>

  <div style={{ marginTop: 22 }}>
        <h3 style={{ marginTop: 0 }}>Notes</h3>
        <ul>
          <li>Each management page enforces admin permissions.</li>
          <li>If a page redirects to login, ensure your token belongs to an admin user.</li>
        </ul>
      </div>

      {/* Compact dashboard summary: small stats + sparkline */}
      <div style={{ marginTop: 22 }}>
        <AdminSummary days={7} />
      </div>
    </div>
  );
}
