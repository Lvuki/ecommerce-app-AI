import React from "react";

export default function Footer() {
  return (
    <footer style={{ marginTop: 40, padding: "16px 20px", borderTop: "1px solid #eee", color: "#666", fontSize: 14, textAlign: "center" }}>
      © {new Date().getFullYear()} Avi. All rights reserved.
    </footer>
  );
}


