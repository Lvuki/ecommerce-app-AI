import React from 'react';
import ProductsPage from './ProductsPage';
import { isAdmin } from '../services/authService';
import { useNavigate } from 'react-router-dom';

export default function AdminProducts() {
  const navigate = useNavigate();
  React.useEffect(() => {
    if (!isAdmin()) navigate('/login');
  }, [navigate]);

  // Reuse the public ProductsPage for now inside admin layout.
  // Pass a flag so the public page hides purchase actions in admin context.
  // Later you can replace this with a dedicated admin product editor.
  return (
    <div>
      <ProductsPage hidePurchaseActions={true} />
    </div>
  );
}
