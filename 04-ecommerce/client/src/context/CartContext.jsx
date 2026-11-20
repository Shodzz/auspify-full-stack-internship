import { createContext, useContext, useEffect, useMemo, useState } from 'react';

// The cart lives in localStorage so it survives refreshes and works for guests.
// We keep a small snapshot of each product for display, but the real prices
// always come from the server (see /api/cart/quote and checkout).

const KEY = 'corner-store-cart';
const MAX_QTY = 20;
const CartContext = createContext(null);

function readStored() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(raw) ? raw.filter((i) => Number.isInteger(i?.productId) && Number.isInteger(i?.qty)) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(readStored);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* private mode or storage full: cart just won't persist */
    }
  }, [items]);

  // keep tabs in sync
  useEffect(() => {
    const onStorage = (e) => e.key === KEY && setItems(readStored());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo(() => {
    const snapshot = (p) => ({ name: p.name, slug: p.slug, price_cents: p.price_cents, hue: p.hue, category: p.category });
    return {
      items,
      count: items.reduce((n, i) => n + i.qty, 0),
      add(product, qty = 1) {
        setItems((list) => {
          const found = list.find((i) => i.productId === product.id);
          if (found) {
            return list.map((i) => (i.productId === product.id ? { ...i, qty: Math.min(i.qty + qty, MAX_QTY), ...snapshot(product) } : i));
          }
          return [...list, { productId: product.id, qty: Math.min(qty, MAX_QTY), ...snapshot(product) }];
        });
      },
      setQty(productId, qty) {
        setItems((list) =>
          qty <= 0 ? list.filter((i) => i.productId !== productId) : list.map((i) => (i.productId === productId ? { ...i, qty: Math.min(qty, MAX_QTY) } : i))
        );
      },
      remove(productId) {
        setItems((list) => list.filter((i) => i.productId !== productId));
      },
      clear() {
        setItems([]);
      },
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
