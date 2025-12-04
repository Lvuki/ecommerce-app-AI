import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Register from './pages/Register';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import PublicProducts from "./pages/PublicProducts";
import AdminUsers from "./pages/AdminUsers";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import Admin, { AdminHome } from "./pages/Admin";
import AdminSettings from './pages/AdminSettings';
import AdminOrders from './pages/AdminOrders';
import AdminReports from './pages/AdminReports';
import AdminProducts from './pages/AdminProducts';
import AdminPages from './pages/AdminPages';
import ServicesAdmin from './pages/ServicesAdmin';
import Profile from './pages/Profile';
import UserProfile from './pages/UserProfile';
import ProductView from "./pages/ProductView";
import Category from "./pages/Category";
import CartPage from "./pages/Cart";
import Wishlist from './pages/Wishlist';
import BlogsPage from "./pages/Blogs";
import BlogPost from "./pages/BlogPost";
import BlogsAdmin from "./pages/BlogsAdmin";
import CategoriesAdmin from "./pages/CategoriesAdmin";
import OffersPage from "./pages/Offers";
import Sherbimet from './pages/Sherbimet';
import Financim from './pages/Financim';
import ShkarkoAplikacionin from './pages/ShkarkoAplikacionin';
import Header from "./components/Header";
import Footer from "./components/Footer";
import StaticPage from './pages/StaticPage';
import ComparePage from './pages/ComparePage';
import { CompareProvider } from './context/CompareContext';
import CompareFloatingButton from './components/CompareFloatingButton';

function App() {
  return (
    <CompareProvider>
      <Router>
        <Header />
        <CompareFloatingButton />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<Admin />}>
            <Route index element={<AdminHome />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="services" element={<ServicesAdmin />} />
            <Route path="pages" element={<AdminPages />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="blogs" element={<BlogsAdmin />} />
            <Route path="categories" element={<CategoriesAdmin />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/success" element={<AuthCallback />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/users/:id" element={<UserProfile />} />
          <Route path="/products" element={<PublicProducts />} />
          <Route path="/products/:id" element={<ProductView />} />
          <Route path="/category" element={<Category />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/offers" element={<OffersPage />} />
          <Route path="/sherbimet" element={<Sherbimet />} />
          <Route path="/financim" element={<Financim />} />
          <Route path="/shkarko-aplikacionin" element={<ShkarkoAplikacionin />} />
          <Route path="/pages/:slug" element={<StaticPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/blogs" element={<BlogsPage />} />
          <Route path="/blogs/:id" element={<BlogPost />} />
        </Routes>
        <Footer />
      </Router>
    </CompareProvider>
  );
}



export default App;
