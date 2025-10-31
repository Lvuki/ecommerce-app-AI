import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getToken } from "../services/authService";

export default function Dashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!getToken()) {
      navigate("/login");
    }
  }, [navigate]);

  return (
    <div style={{ maxWidth: "800px", margin: "40px auto", padding: "20px" }}>
      <h1 style={{ marginBottom: 20 }}>Dashboard</h1>
      <nav style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <Link to="/products">Products</Link>
        <Link to="/admin/users">Users</Link>
      </nav>
      <p>Select a section from the menu above.</p>
    </div>
  );
}


