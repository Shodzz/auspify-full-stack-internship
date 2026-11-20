import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

export default function Header() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [menuOpen, setMenuOpen] = useState(false);

  // keep the box in sync when the URL changes (e.g. back button)
  useEffect(() => {
    setQ(params.get('q') ?? '');
  }, [params]);
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  function search(e) {
    e.preventDefault();
    const next = new URLSearchParams(pathname === '/' ? params : undefined);
    if (q.trim()) next.set('q', q.trim());
    else next.delete('q');
    // the header search covers the whole store, so drop the category filter
    next.delete('category');
    next.delete('page');
    navigate(`/?${next}`);
  }

  return (
    <header className="header">
      <div className="container header-row">
        <Link to="/" className="logo">
          <img src="/favicon.svg" alt="" width="30" height="30" />
          <span>Corner Store</span>
        </Link>

        <form className="search" role="search" onSubmit={search}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <input type="search" placeholder="Search products" aria-label="Search products" value={q} onChange={(e) => setQ(e.target.value)} />
        </form>

        <nav className={`nav ${menuOpen ? 'open' : ''}`} aria-label="Main">
          <NavLink to="/" end>Shop</NavLink>
          {user && <NavLink to="/orders">My orders</NavLink>}
          {user?.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
          {user ? (
            <button className="nav-btn" onClick={async () => { await logout(); navigate('/'); }}>
              Log out <span className="muted">({user.name.split(' ')[0]})</span>
            </button>
          ) : (
            <NavLink to="/login">Log in</NavLink>
          )}
        </nav>

        <Link to="/cart" className="cart-link" aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h2l2 11h10l2-8H7" /><circle cx="10" cy="20" r="1.4" /><circle cx="17" cy="20" r="1.4" /></svg>
          {count > 0 && <span className="cart-count">{count}</span>}
        </Link>

        <button className="menu-btn" aria-label="Menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
      </div>
    </header>
  );
}
