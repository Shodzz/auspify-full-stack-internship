import { useEffect } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Header from './components/Header.jsx';
import { Empty, Loading } from './components/ui.jsx';
import Catalog from './pages/Catalog.jsx';
import ProductPage from './pages/ProductPage.jsx';
import CartPage from './pages/CartPage.jsx';
import Checkout from './pages/Checkout.jsx';
import AuthPage from './pages/AuthPage.jsx';
import Orders from './pages/Orders.jsx';
import OrderDetail from './pages/OrderDetail.jsx';
import Admin from './pages/admin/Admin.jsx';
import ProductForm from './pages/admin/ProductForm.jsx';

// Sends logged-out users to /login and brings them back afterwards.
function RequireAuth({ children, admin = false }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <Loading />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (admin && user.role !== 'admin') {
    return <Empty title="Admins only" action={<Link className="btn btn-primary" to="/">Back to the shop</Link>}>Your account doesn't have access to this page.</Empty>;
  }
  return children;
}

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <Header />
      <main className="container page">
        <Routes>
          <Route path="/" element={<Catalog />} />
          <Route path="/product/:slug" element={<ProductPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
          <Route path="/orders" element={<RequireAuth><Orders /></RequireAuth>} />
          <Route path="/orders/:id" element={<RequireAuth><OrderDetail /></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth admin><Admin /></RequireAuth>} />
          <Route path="/admin/products/new" element={<RequireAuth admin><ProductForm /></RequireAuth>} />
          <Route path="/admin/products/:id" element={<RequireAuth admin><ProductForm /></RequireAuth>} />
          <Route
            path="*"
            element={<Empty title="Page not found" action={<Link className="btn btn-primary" to="/">Go to the shop</Link>}>That link doesn't lead anywhere.</Empty>}
          />
        </Routes>
      </main>
      <footer className="site-footer">
        <div className="container footer-row">
          <span>Corner Store &middot; internship demo project</span>
          <span>Payment is pay-on-delivery only. No real orders are shipped.</span>
        </div>
      </footer>
    </>
  );
}
