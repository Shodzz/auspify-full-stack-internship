import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useCart } from '../context/CartContext.jsx';
import { price } from '../format.js';
import ProductArt from '../components/ProductArt.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { Crumbs, Empty, ErrorBox, Loading, StockNote, useToast } from '../components/ui.jsx';

export default function ProductPage() {
  const { slug } = useParams();
  const cart = useCart();
  const toast = useToast();
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [qty, setQty] = useState(1);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let live = true;
    setState({ loading: true, error: null, data: null });
    setQty(1);
    api
      .product(slug)
      .then((data) => live && setState({ loading: false, error: null, data }))
      .catch((err) => live && setState({ loading: false, error: err, data: null }));
    return () => {
      live = false;
    };
  }, [slug, retry]);

  if (state.loading) return <Loading />;
  if (state.error?.status === 404) {
    return <Empty title="Product not found" action={<Link className="btn btn-primary" to="/">Back to the shop</Link>}>It may have been removed from the store.</Empty>;
  }
  if (state.error) return <ErrorBox message={state.error.message} onRetry={() => setRetry((r) => r + 1)} />;

  const { product: p, related } = state.data;
  const inCart = cart.items.find((i) => i.productId === p.id)?.qty ?? 0;
  const maxQty = Math.max(0, Math.min(p.stock, 20) - inCart);

  return (
    <>
      <Crumbs items={[['Shop', '/'], [p.category, `/?category=${p.category}`], [p.name]]} />
      <section className="product-detail">
        <ProductArt hue={p.hue} category={p.category} className="detail-art" label={`Illustration for ${p.name}`} />
        <div className="detail-info">
          <span className="eyebrow">{p.category}</span>
          <h1>{p.name}</h1>
          <p className="detail-price">{price(p.price_cents)}</p>
          <StockNote stock={p.stock} />
          <p className="detail-desc">{p.description}</p>

          {p.stock > 0 && (
            <div className="buy-row">
              <div className="qty" aria-label="Quantity">
                <button onClick={() => setQty((n) => Math.max(1, n - 1))} aria-label="Decrease quantity" disabled={qty <= 1}>&minus;</button>
                <span aria-live="polite">{qty}</span>
                <button onClick={() => setQty((n) => Math.min(maxQty, n + 1))} aria-label="Increase quantity" disabled={qty >= maxQty}>+</button>
              </div>
              <button
                className="btn btn-primary btn-lg"
                disabled={maxQty === 0}
                onClick={() => {
                  cart.add(p, qty);
                  toast(`Added ${qty} × ${p.name} to your cart`);
                  setQty(1);
                }}
              >
                {maxQty === 0 ? 'All available stock is in your cart' : 'Add to cart'}
              </button>
            </div>
          )}
          {inCart > 0 && (
            <p className="muted small">
              {inCart} in your cart · <Link to="/cart">View cart</Link>
            </p>
          )}
          <ul className="perks">
            <li>Free delivery over $50</li>
            <li>Pay on delivery</li>
            <li>Cancel any time before we start packing</li>
          </ul>
        </div>
      </section>

      {related.length > 0 && (
        <section className="related">
          <h2>More from {p.category}</h2>
          <div className="grid">
            {related.map((r) => <ProductCard key={r.id} product={r} />)}
          </div>
        </section>
      )}
    </>
  );
}
