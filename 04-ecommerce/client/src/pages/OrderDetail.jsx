import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { date, orderNo, price } from '../format.js';
import ProductArt from '../components/ProductArt.jsx';
import { Crumbs, Empty, ErrorBox, Loading, StatusBadge, useToast } from '../components/ui.jsx';

const STEPS = ['placed', 'processing', 'shipped', 'delivered'];

export default function OrderDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const toast = useToast();
  const [state, setState] = useState({ loading: true, error: null, order: null });
  const [retry, setRetry] = useState(0);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let live = true;
    api
      .order(id)
      .then(({ order }) => live && setState({ loading: false, error: null, order }))
      .catch((err) => live && setState({ loading: false, error: err, order: null }));
    return () => {
      live = false;
    };
  }, [id, retry]);

  if (state.loading) return <Loading />;
  if (state.error?.status === 404) return <Empty title="Order not found" action={<Link className="btn btn-primary" to="/orders">My orders</Link>} />;
  if (state.error) return <ErrorBox message={state.error.message} onRetry={() => setRetry((r) => r + 1)} />;

  const o = state.order;
  const stepIndex = STEPS.indexOf(o.status);
  const mine = o.user_id === user.id;

  async function cancel() {
    if (!window.confirm('Cancel this order? Items go back into stock.')) return;
    setCancelling(true);
    try {
      const { order } = await api.cancelOrder(o.id);
      setState((s) => ({ ...s, order }));
      toast('Order cancelled');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setCancelling(false);
    }
  }

  return (
    <>
      <Crumbs items={mine ? [['My orders', '/orders'], [`Order ${orderNo(o.id)}`]] : [['Admin', '/admin'], [`Order ${orderNo(o.id)}`]]} />

      {params.get('placed') && (
        <div className="notice success" role="status">
          <strong>Thanks, your order is in.</strong> We'll let the courier know. You can cancel it here until we start packing.
        </div>
      )}

      <div className="order-head">
        <div>
          <h1 className="page-title">Order {orderNo(o.id)}</h1>
          <p className="muted">Placed {date(o.created_at)}</p>
        </div>
        <StatusBadge status={o.status} />
      </div>

      {o.status !== 'cancelled' && (
        <ol className="steps" aria-label="Order progress">
          {STEPS.map((s, i) => (
            <li key={s} className={i <= stepIndex ? 'done' : ''} aria-current={i === stepIndex ? 'step' : undefined}>
              <span>{s[0].toUpperCase() + s.slice(1)}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="cart-layout">
        <section className="card">
          <h2>Items</h2>
          <ul className="order-items">
            {o.items.map((it) => (
              <li key={it.product_id}>
                <ProductArt hue={it.hue} category={it.category} className="mini-art" />
                <Link to={`/product/${it.slug}`}>{it.name}</Link>
                <span className="muted">{it.qty} × {price(it.price_cents)}</span>
                <strong>{price(it.qty * it.price_cents)}</strong>
              </li>
            ))}
          </ul>
          <dl className="totals">
            <div><dt>Subtotal</dt><dd>{price(o.subtotal_cents)}</dd></div>
            <div><dt>Delivery</dt><dd>{o.shipping_cents ? price(o.shipping_cents) : 'Free'}</dd></div>
            <div className="grand"><dt>Total</dt><dd>{price(o.total_cents)}</dd></div>
          </dl>
        </section>

        <aside className="card summary">
          <h2>Delivery</h2>
          <address>
            {o.ship_name}<br />
            {o.ship_address}<br />
            {o.ship_city} {o.ship_postcode}<br />
            {o.ship_phone}
          </address>
          <p className="muted small">Payment: on delivery</p>
          {mine && o.status === 'placed' && (
            <button className="btn btn-ghost btn-block danger-text" onClick={cancel} disabled={cancelling}>
              {cancelling ? 'Cancelling...' : 'Cancel order'}
            </button>
          )}
        </aside>
      </div>
    </>
  );
}
