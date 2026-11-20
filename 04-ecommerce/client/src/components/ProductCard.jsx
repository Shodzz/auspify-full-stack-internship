import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { price } from '../format.js';
import ProductArt from './ProductArt.jsx';
import { StockNote, useToast } from './ui.jsx';

export default function ProductCard({ product }) {
  const cart = useCart();
  const toast = useToast();
  const soldOut = product.stock === 0;

  return (
    <article className="product-card">
      <Link to={`/product/${product.slug}`} className="product-card-img" tabIndex={-1} aria-hidden="true">
        <ProductArt hue={product.hue} category={product.category} />
        {product.featured ? <span className="tag">Featured</span> : null}
      </Link>
      <div className="product-card-body">
        <span className="eyebrow">{product.category}</span>
        <h3>
          <Link to={`/product/${product.slug}`}>{product.name}</Link>
        </h3>
        <div className="product-card-foot">
          <div>
            <strong className="price">{price(product.price_cents)}</strong>
            <StockNote stock={product.stock} />
          </div>
          <button
            className="btn btn-sm btn-primary"
            disabled={soldOut}
            onClick={() => {
              cart.add(product);
              toast(`${product.name} added to cart`);
            }}
            aria-label={`Add ${product.name} to cart`}
          >
            {soldOut ? 'Sold out' : 'Add'}
          </button>
        </div>
      </div>
    </article>
  );
}
