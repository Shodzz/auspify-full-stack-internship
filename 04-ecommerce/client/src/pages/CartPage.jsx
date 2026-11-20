import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useCart } from '../context/CartContext.jsx';
import { price } from '../format.js';
import ProductArt from '../components/ProductArt.jsx';
import { Empty, Spinner } from '../components/ui.jsx';

// Asks the server for current prices and stock whenever the cart changes.
export function useQuote(items) {
  const [quote, setQuote] = useState({ loading: true, error: '', data: null });
  const key = items.map((i) => `${i.productId}x${i.qty}`).join(',');

  useEffect(() => {
    if (!items.length) {
      setQuote({ loading: false, error: '', data: null });
      return;
    }
    let live = true;
    setQuote((q) => ({ ...q, loading: true, error: '' }));
    api
      .quote(items.map(({ productId, qty }) => ({ productId, qty })))
      .then((data) => live && setQuote({ loading: false, error: '', data }))
      .catch((err) => live && setQuote((q) => ({ ...q, loading: false, error: err.message })));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return quote;
}

export function Totals({ data, loading }) {
  if (!data) return null;
  return (
    <dl className={`totals ${loading ? 'dim' : ''}`}>
      <div><dt>Subtotal</dt><dd>{price(data.subtotal)}</dd></div>
      <div><dt>Delivery</dt><dd>{data.shipping ? price(data.shipping) : 'Free'}</dd></div>
      <div className="grand"><dt>Total</dt><dd>{price(data.total)}</dd></div>
    </dl>
  );
}

export default function CartPage() {
  const cart = useCart();
  const navigate = useNavigate();
  const quote = useQuote(cart.items);

  if (!cart.items.length) {
    return (
      <Empty title="Your cart is empty" action={<Link className="btn btn-primary" to="/">Start shopping</Link>}>
        Anything you add will show up here.
      </Empty>
    );
  }

  const problems = new Map((quote.data?.problems ?? []).map((p) => [p.productId, p]));
  const lineFor = (id) => quote.data?.lines.find((l) => l.id === id);
  const toFree = quote.data && quote.data.shipping ? 5000 - quote.data.subtotal : 0;

  return (
    <>
      <h1 className="page-title">Your cart</h1>
      <div className="cart-layout">
        <ul className="cart-lines">
          {cart.items.map((item) => {
            const line = lineFor(item.productId);
            const problem = problems.get(item.productId);
            const unitPrice = line?.price_cents ?? item.price_cents;
            const priceChanged = line && line.price_cents !== item.price_cents;
            return (
              <li key={item.productId} className={`cart-line ${problem ? 'has-problem' : ''}`}>
                <Link to={`/product/${item.slug}`} className="cart-thumb" tabIndex={-1} aria-hidden="true">
                  <ProductArt hue={item.hue} category={item.category} />
                </Link>
                <div className="cart-info">
                  <Link to={`/product/${item.slug}`} className="cart-name">{line?.name ?? item.name}</Link>
                  <span className="muted small">
                    {price(unitPrice)} each{priceChanged && <em> (price updated)</em>}
                  </span>
                  {problem && <span className="line-problem">{problem.message}</span>}
                </div>
                <div className="qty qty-sm" aria-label={`Quantity of ${item.name}`}>
                  <button onClick={() => cart.setQty(item.productId, item.qty - 1)} aria-label="Decrease">&minus;</button>
                  <span>{item.qty}</span>
                  <button onClick={() => cart.setQty(item.productId, item.qty + 1)} aria-label="Increase" disabled={item.qty >= 20 || (line && item.qty >= line.stock)}>+</button>
                </div>
                <strong className="line-total">{price(unitPrice * item.qty)}</strong>
                <button className="icon-btn" onClick={() => cart.remove(item.productId)} aria-label={`Remove ${item.name}`}>&times;</button>
                {problem?.available > 0 && (
                  <button className="link fix" onClick={() => cart.setQty(item.productId, problem.available)}>Change to {problem.available}</button>
                )}
              </li>
            );
          })}
        </ul>

        <aside className="summary card">
          <h2>Summary</h2>
          {quote.error ? <p className="f-err">{quote.error}</p> : quote.data ? <Totals data={quote.data} loading={quote.loading} /> : <Spinner />}
          {toFree > 0 && <p className="muted small">Add {price(toFree)} more for free delivery.</p>}
          {problems.size > 0 && <p className="f-err">Fix the items marked above before checking out.</p>}
          <button className="btn btn-primary btn-block btn-lg" disabled={!quote.data || problems.size > 0 || quote.loading} onClick={() => navigate('/checkout')}>
            Checkout
          </button>
          <Link to="/" className="link center">Keep shopping</Link>
        </aside>
      </div>
    </>
  );
}
