import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { price } from '../format.js';
import { Field, Spinner, useToast } from '../components/ui.jsx';
import { Totals, useQuote } from './CartPage.jsx';

function check(v) {
  const e = {};
  if (v.name.trim().length < 2) e.name = 'Enter the recipient name.';
  if (!/^[0-9+()\s-]{7,20}$/.test(v.phone.trim())) e.phone = 'Enter a phone number for the courier.';
  if (v.address.trim().length < 5) e.address = 'Enter a street address.';
  if (v.city.trim().length < 2) e.city = 'Enter a city.';
  if (!/^[A-Za-z0-9 -]{3,10}$/.test(v.postcode.trim())) e.postcode = 'Enter a valid postal code.';
  return e;
}

export default function Checkout() {
  const { user } = useAuth();
  const cart = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const quote = useQuote(cart.items);
  const [values, setValues] = useState({ name: user.name, phone: '', address: '', city: '', postcode: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [placed, setPlaced] = useState(false);

  if (!cart.items.length && !placed) return <Navigate to="/cart" replace />;

  const set = (k) => (e) => {
    setValues((v) => ({ ...v, [k]: e.target.value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: '' }));
  };

  async function submit(e) {
    e.preventDefault();
    setFormError('');
    const local = check(values);
    setErrors(local);
    if (Object.keys(local).length) return;

    setBusy(true);
    try {
      const { order } = await api.placeOrder({
        items: cart.items.map(({ productId, qty }) => ({ productId, qty })),
        shipping: values,
      });
      setPlaced(true);
      cart.clear();
      toast('Order placed. Thank you!', 'success');
      navigate(`/orders/${order.id}?placed=1`, { replace: true });
    } catch (err) {
      if (err.fields && !err.fields.cart) setErrors(err.fields);
      setFormError(err.status === 409 ? `${err.message} Go back to your cart to adjust it.` : err.message);
      setBusy(false);
    }
  }

  const problems = quote.data?.problems ?? [];

  return (
    <>
      <h1 className="page-title">Checkout</h1>
      <div className="cart-layout">
        <form className="card checkout-form" onSubmit={submit} noValidate>
          <h2>Delivery details</h2>
          <div className="form-grid">
            <Field label="Full name" error={errors.name}><input value={values.name} onChange={set('name')} autoComplete="name" maxLength={80} /></Field>
            <Field label="Phone" error={errors.phone}><input type="tel" value={values.phone} onChange={set('phone')} autoComplete="tel" maxLength={20} /></Field>
            <Field label="Street address" error={errors.address} className="span-2"><input value={values.address} onChange={set('address')} autoComplete="street-address" maxLength={160} /></Field>
            <Field label="City" error={errors.city}><input value={values.city} onChange={set('city')} autoComplete="address-level2" maxLength={60} /></Field>
            <Field label="Postal code" error={errors.postcode}><input value={values.postcode} onChange={set('postcode')} autoComplete="postal-code" maxLength={10} /></Field>
          </div>

          <h2>Payment</h2>
          <label className="pay-option">
            <input type="radio" checked readOnly name="pay" />
            <span>
              <strong>Pay on delivery</strong>
              <span className="muted small">Cash or card to the courier. Online payment isn't connected in this demo.</span>
            </span>
          </label>

          {formError && <p className="form-error" role="alert">{formError} {formError.includes('cart') && <Link to="/cart">Open cart</Link>}</p>}

          <button className="btn btn-primary btn-lg btn-block" disabled={busy || !quote.data || problems.length > 0}>
            {busy && <Spinner />} {busy ? 'Placing order...' : quote.data ? `Place order · ${price(quote.data.total)}` : 'Place order'}
          </button>
        </form>

        <aside className="summary card">
          <h2>Order summary</h2>
          {quote.data ? (
            <>
              <ul className="mini-lines">
                {quote.data.lines.map((l) => (
                  <li key={l.id}>
                    <span>{l.qty} × {l.name}</span>
                    <span>{price(l.line_cents)}</span>
                  </li>
                ))}
              </ul>
              <Totals data={quote.data} loading={quote.loading} />
              {problems.length > 0 && (
                <p className="f-err">{problems[0].message} <Link to="/cart">Fix in cart</Link></p>
              )}
            </>
          ) : quote.error ? (
            <p className="f-err">{quote.error}</p>
          ) : (
            <Spinner />
          )}
        </aside>
      </div>
    </>
  );
}
