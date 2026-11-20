import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { date, orderNo, price } from '../format.js';
import { Empty, ErrorBox, Loading, StatusBadge } from '../components/ui.jsx';

export default function Orders() {
  const [state, setState] = useState({ loading: true, error: '', orders: [] });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let live = true;
    api
      .orders()
      .then(({ orders }) => live && setState({ loading: false, error: '', orders }))
      .catch((err) => live && setState({ loading: false, error: err.message, orders: [] }));
    return () => {
      live = false;
    };
  }, [retry]);

  if (state.loading) return <Loading />;
  if (state.error) return <ErrorBox message={state.error} onRetry={() => setRetry((r) => r + 1)} />;
  if (!state.orders.length) {
    return <Empty title="No orders yet" action={<Link className="btn btn-primary" to="/">Browse the shop</Link>}>When you place an order it will show up here.</Empty>;
  }

  return (
    <>
      <h1 className="page-title">My orders</h1>
      <ul className="order-list">
        {state.orders.map((o) => (
          <li key={o.id}>
            <Link to={`/orders/${o.id}`} className="order-row card">
              <div>
                <strong>Order {orderNo(o.id)}</strong>
                <span className="muted small">{date(o.created_at)} · {o.item_count} item{o.item_count === 1 ? '' : 's'}</span>
              </div>
              <StatusBadge status={o.status} />
              <strong className="order-total">{price(o.total_cents)}</strong>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
