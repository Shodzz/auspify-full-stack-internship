import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api.js';
import { date, orderNo, price, STATUS_LABEL } from '../../format.js';
import ProductArt from '../../components/ProductArt.jsx';
import { ErrorBox, Loading, StatusBadge, useToast } from '../../components/ui.jsx';

const NEXT = {
  placed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

function useLoad(fn, deps) {
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    fn()
      .then((data) => setState({ loading: false, error: '', data }))
      .catch((err) => setState((s) => ({ ...s, loading: false, error: err.message })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    reload();
  }, [reload]);
  return [state, reload];
}

function OrdersTab({ onChange }) {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [state, reload] = useLoad(() => api.admin.orders(status), [status]);

  async function move(order, next) {
    if (next === 'cancelled' && !window.confirm(`Cancel order ${orderNo(order.id)}? Stock will be returned.`)) return;
    setBusyId(order.id);
    try {
      await api.admin.setStatus(order.id, next);
      toast(`Order ${orderNo(order.id)} is now ${STATUS_LABEL[next].toLowerCase()}`);
      reload();
      onChange();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="card flush">
      <div className="table-head">
        <h2>Orders</h2>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      {state.error ? (
        <ErrorBox message={state.error} onRetry={reload} />
      ) : !state.data ? (
        <Loading />
      ) : state.data.orders.length === 0 ? (
        <p className="muted pad">No orders{status && ` with status "${STATUS_LABEL[status]}"`} yet.</p>
      ) : (
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody className={state.loading ? 'dim' : ''}>
              {state.data.orders.map((o) => (
                <tr key={o.id}>
                  <td><Link to={`/orders/${o.id}`}>{orderNo(o.id)}</Link><br /><span className="muted small">{date(o.created_at)}</span></td>
                  <td>{o.ship_name}<br /><span className="muted small">{o.email}</span></td>
                  <td>{o.item_count}</td>
                  <td>{price(o.total_cents)}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td className="row-actions">
                    {NEXT[o.status].length === 0 && <span className="muted small">-</span>}
                    {NEXT[o.status].map((n) => (
                      <button key={n} className={`btn btn-sm ${n === 'cancelled' ? 'btn-ghost danger-text' : 'btn-ghost'}`} disabled={busyId === o.id} onClick={() => move(o, n)}>
                        {n === 'cancelled' ? 'Cancel' : `Mark ${STATUS_LABEL[n].toLowerCase()}`}
                      </button>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ProductsTab({ onChange }) {
  const toast = useToast();
  const [state, reload] = useLoad(() => api.admin.products(), []);

  async function toggle(p) {
    try {
      if (p.active) {
        if (!window.confirm(`Hide "${p.name}" from the shop? Past orders keep it.`)) return;
        await api.admin.hideProduct(p.id);
        toast(`${p.name} hidden`);
      } else {
        await api.admin.updateProduct(p.id, { ...p, price: (p.price_cents / 100).toFixed(2), active: true });
        toast(`${p.name} is back in the shop`);
      }
      reload();
      onChange();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  return (
    <section className="card flush">
      <div className="table-head">
        <h2>Products</h2>
        <Link className="btn btn-primary btn-sm" to="/admin/products/new">+ New product</Link>
      </div>
      {state.error ? (
        <ErrorBox message={state.error} onRetry={reload} />
      ) : !state.data ? (
        <Loading />
      ) : (
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {state.data.products.map((p) => (
                <tr key={p.id} className={p.active ? '' : 'inactive'}>
                  <td className="prod-cell"><ProductArt hue={p.hue} category={p.category} className="mini-art" /> {p.name}</td>
                  <td>{p.category}</td>
                  <td>{price(p.price_cents)}</td>
                  <td className={p.stock <= 5 ? 'warn' : ''}>{p.stock}</td>
                  <td>{p.active ? (p.featured ? 'Featured' : 'Live') : 'Hidden'}</td>
                  <td className="row-actions">
                    <Link className="btn btn-ghost btn-sm" to={`/admin/products/${p.id}`}>Edit</Link>
                    <button className="btn btn-ghost btn-sm" onClick={() => toggle(p)}>{p.active ? 'Hide' : 'Restore'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function Admin() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'products' ? 'products' : 'orders';
  const [stats, reloadStats] = useLoad(() => api.admin.stats(), []);
  const s = stats.data;

  return (
    <>
      <h1 className="page-title">Store admin</h1>
      <section className="stat-row">
        <div className="card stat"><span>Revenue</span><strong>{s ? price(s.revenue) : '-'}</strong><small>excluding cancelled</small></div>
        <div className="card stat"><span>Orders</span><strong>{s?.orders ?? '-'}</strong><small>{s ? `${s.open} need attention` : ''}</small></div>
        <div className="card stat"><span>Customers</span><strong>{s?.customers ?? '-'}</strong><small>registered</small></div>
        <div className="card stat"><span>Low stock</span><strong className={s?.lowStock ? 'warn' : ''}>{s?.lowStock ?? '-'}</strong><small>5 or fewer left</small></div>
      </section>

      <div className="chips tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'orders'} className={tab === 'orders' ? 'chip on' : 'chip'} onClick={() => setParams({})}>Orders</button>
        <button role="tab" aria-selected={tab === 'products'} className={tab === 'products' ? 'chip on' : 'chip'} onClick={() => setParams({ tab: 'products' })}>Products</button>
      </div>

      {tab === 'orders' ? <OrdersTab onChange={reloadStats} /> : <ProductsTab onChange={reloadStats} />}
    </>
  );
}
