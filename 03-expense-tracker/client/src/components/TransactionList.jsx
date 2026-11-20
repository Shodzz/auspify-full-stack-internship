import { dayLabel, money } from '../format.js';

function groupByDay(items) {
  const groups = [];
  for (const tx of items) {
    const last = groups[groups.length - 1];
    if (last && last.date === tx.date) last.items.push(tx);
    else groups.push({ date: tx.date, items: [tx] });
  }
  return groups;
}

export default function TransactionList({ state, filters, setFilters, categories, currency, exportHref, onAdd, onEdit, onDelete, onRetry }) {
  const set = (key) => (e) =>
    setFilters((f) => {
      const next = { ...f, [key]: e.target.value };
      // a category from the other type makes no sense, drop it
      if (key === 'type' && next.category && next.type && !categories[next.type].includes(next.category)) next.category = '';
      return next;
    });

  const categoryOptions = filters.type ? categories[filters.type] : [...new Set([...categories.expense, ...categories.income])];
  const filtered = filters.type || filters.category || filters.q;
  const { loading, error, items, totals } = state;

  return (
    <section className="panel">
      <div className="panel-head">
        <div className="filters">
          <input type="search" placeholder="Search notes" value={filters.q} onChange={set('q')} aria-label="Search notes" />
          <select value={filters.type} onChange={set('type')} aria-label="Type">
            <option value="">All types</option>
            <option value="expense">Expenses</option>
            <option value="income">Income</option>
          </select>
          <select value={filters.category} onChange={set('category')} aria-label="Category">
            <option value="">All categories</option>
            {categoryOptions.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="panel-actions">
          <a className={`btn btn-ghost ${items.length ? '' : 'disabled'}`} href={exportHref} download aria-disabled={!items.length}>
            Export CSV
          </a>
          <button className="btn btn-primary desktop-only" onClick={onAdd}>
            + Add
          </button>
        </div>
      </div>

      {error ? (
        <div className="empty">
          <h3>Couldn't load transactions</h3>
          <p>{error}</p>
          <button className="btn btn-ghost" onClick={onRetry}>
            Try again
          </button>
        </div>
      ) : loading && !items.length ? (
        <ul className="tx-list" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="tx skeleton">
              <span />
              <span />
            </li>
          ))}
        </ul>
      ) : !items.length ? (
        <div className="empty">
          <h3>{filtered ? 'Nothing matches' : 'No transactions this month'}</h3>
          <p>{filtered ? 'Try clearing a filter.' : 'Add your first income or expense to get started.'}</p>
          {filtered ? (
            <button className="btn btn-ghost" onClick={() => setFilters({ type: '', category: '', q: '' })}>
              Clear filters
            </button>
          ) : (
            <button className="btn btn-primary" onClick={onAdd}>
              Add transaction
            </button>
          )}
        </div>
      ) : (
        <>
          {filtered && (
            <p className="filter-total">
              {items.length} result{items.length === 1 ? '' : 's'} &middot; in {money(totals.income, currency)} &middot; out {money(totals.expense, currency)}
            </p>
          )}
          <div className={loading ? 'dim' : ''}>
            {groupByDay(items).map((g) => (
              <div key={g.date} className="day">
                <h4 className="day-head">{dayLabel(g.date)}</h4>
                <ul className="tx-list">
                  {g.items.map((tx) => (
                    <li key={tx.id} className="tx">
                      <span className={`cat-dot ${tx.type}`} aria-hidden="true">
                        {tx.category[0]}
                      </span>
                      <div className="tx-main">
                        <strong>{tx.category}</strong>
                        {tx.note && <span className="muted">{tx.note}</span>}
                      </div>
                      <span className={`amount ${tx.type === 'income' ? 'pos' : 'neg'}`}>
                        {tx.type === 'income' ? '+' : '-'}
                        {money(tx.amount_cents, currency)}
                      </span>
                      <div className="tx-actions">
                        <button className="icon-btn" onClick={() => onEdit(tx)} aria-label={`Edit ${tx.category} ${tx.date}`}>
                          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z" /></svg>
                        </button>
                        <button className="icon-btn danger" onClick={() => onDelete(tx)} aria-label={`Delete ${tx.category} ${tx.date}`}>
                          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
