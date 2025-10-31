import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { getToken, logout, isAdmin } from "../services/authService";
import { getCount } from "../services/cartService";

export default function Header() {
  const navigate = useNavigate();
  const [hasToken, setHasToken] = useState(!!getToken());
  const [cartCount, setCartCount] = useState(getCount());
  const location = useLocation();

  useEffect(() => {
    const onStorage = () => setHasToken(!!getToken());
    const onAnyStorage = () => {
      onStorage();
      setCartCount(getCount());
    };
    window.addEventListener("storage", onAnyStorage);
    return () => window.removeEventListener("storage", onAnyStorage);
  }, []);

  // Re-evaluate auth status on route changes (e.g., after login navigation)
  useEffect(() => {
    setHasToken(!!getToken());
  }, [location]);

  const handleLogout = () => {
    logout();
    setHasToken(false);
    navigate("/login");
  };

  return (
    <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #eee" }}>
      <nav style={{ display: "flex", gap: 12 }}>
        <Link to="/">Home</Link>
        <Link to="/dashboard">Dashboard</Link>
  <Link to="/products">Products</Link>
  <Link to="/category">Category</Link>
  <Link to={isAdmin() ? "/admin/blogs" : "/blogs"}>Blogs</Link>
        <Link to="/cart">Cart{cartCount ? ` (${cartCount})` : ''}</Link>
        <Link to="/admin/users">Users</Link>
      </nav>
      <div>
        {hasToken ? (
          <button onClick={handleLogout}>Logout</button>
        ) : (
          <button onClick={() => navigate("/login")}>Login</button>
        )}
      </div>
    </header>
  );
}


