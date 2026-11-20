import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import ProductCard from '../components/ProductCard.jsx';
import { Empty, ErrorBox } from '../components/ui.jsx';

const CATEGORIES = ['Kitchen', 'Desk', 'Home', 'Outdoors'];
const SORTS = [
  ['featured', 'Featured'],
  ['newest', 'Newest'],
  ['price-asc', 'Price: low to high'],
  ['price-desc', 'Price: high to low'],
  ['name', 'Name'],
];

export default function Catalog() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const sort = params.get('sort') ?? 'featured';
  const page = Number(params.get('page')) || 1;

  const [state, setState] = useState({ loading: true, error: '', data: null });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true, error: '' }));
    api
      .products({ q, category, sort, page, limit: 12 })
      .then((data) => live && setState({ loading: false, error: '', data }))
      .catch((err) => live && setState({ loading: false, error: err.message, data: null }));
    return () => {
      live = false;
    };
  }, [q, category, sort, page, retry]);

  const update = (changes) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) (v ? next.set(k, v) : next.delete(k));
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  const { loading, error, data } = state;
  const showHero = !q && !category && page === 1;

  return (
    <>
      {showHero && (
        <section className="hero">
          <div>
            <p className="eyebrow">Small goods, chosen with care</p>
            <h1>Useful things for the kitchen, desk and home.</h1>
            <p className="hero-sub">Free delivery on orders over $50. Pay when it arrives.</p>
          </div>
        </section>
      )}

      <div className="catalog-bar">
        <div className="chips" role="group" aria-label="Category">
          <button className={!category ? 'chip on' : 'chip'} onClick={() => update({ category: '' })} aria-pressed={!category}>All</button>
          {CATEGORIES.map((c) => (
            <button key={c} className={category === c ? 'chip on' : 'chip'} onClick={() => update({ category: c })} aria-pressed={category === c}>
              {c}
            </button>
          ))}
        </div>
        <label className="sort">
          <span>Sort</span>
          <select value={sort} onChange={(e) => update({ sort: e.target.value === 'featured' ? '' : e.target.value })}>
            {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
      </div>

      {q && (
        <p className="result-line">
          {data ? `${data.total} result${data.total === 1 ? '' : 's'}` : 'Searching'} for <strong>"{q}"</strong>
          <button className="link" onClick={() => update({ q: '' })}>Clear search</button>
        </p>
      )}

      {error ? (
        <ErrorBox message={error} onRetry={() => setRetry((r) => r + 1)} />
      ) : !data ? (
        <div className="grid">
          {Array.from({ length: 8 }, (_, i) => <div key={i} className="product-card skeleton" />)}
        </div>
      ) : data.items.length === 0 ? (
        <Empty title="No products found" action={<button className="btn btn-ghost" onClick={() => setParams({})}>Show everything</button>}>
          Try another search or category.
        </Empty>
      ) : (
        <>
          <div className={`grid ${loading ? 'dim' : ''}`}>
            {data.items.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
          {data.pages > 1 && (
            <nav className="pager" aria-label="Pages">
              <button className="btn btn-ghost btn-sm" disabled={data.page <= 1} onClick={() => update({ page: String(data.page - 1) })}>Previous</button>
              <span>Page {data.page} of {data.pages}</span>
              <button className="btn btn-ghost btn-sm" disabled={data.page >= data.pages} onClick={() => update({ page: String(data.page + 1) })}>Next</button>
            </nav>
          )}
        </>
      )}
    </>
  );
}
