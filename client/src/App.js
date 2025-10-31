import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Register from './pages/Register';
import Login from './pages/Login';
import ProductsPage from "./pages/ProductsPage";
import AdminUsers from "./pages/AdminUsers";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import ProductView from "./pages/ProductView";
import Category from "./pages/Category";
import CartPage from "./pages/Cart";
import BlogsPage from "./pages/Blogs";
import BlogPost from "./pages/BlogPost";
import BlogsAdmin from "./pages/BlogsAdmin";
import Header from "./components/Header";
import Footer from "./components/Footer";

function App() {
  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/products" element={<ProductsPage />} />
         <Route path="/products/:id" element={<ProductView />} />
         <Route path="/category" element={<Category />} />
  <Route path="/admin/users" element={<AdminUsers />} />
  <Route path="/admin/blogs" element={<BlogsAdmin />} />
  <Route path="/cart" element={<CartPage />} />
        <Route path="/blogs" element={<BlogsPage />} />
        <Route path="/blogs/:id" element={<BlogPost />} />
      </Routes>
      <Footer />
    </Router>
  );
}



export default App;
