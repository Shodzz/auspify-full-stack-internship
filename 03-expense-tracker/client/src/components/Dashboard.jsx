import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { money, monthLabel, shiftMonth, thisMonth } from '../format.js';
import { useToast } from './Toast.jsx';
import Modal from './Modal.jsx';
import TransactionForm from './TransactionForm.jsx';
import TransactionList from './TransactionList.jsx';
import Reports from './Reports.jsx';

const initialTab = () => (location.hash === '#reports' ? 'reports' : 'transactions');

export default function Dashboard({ user, config, onUserChange, onLogout }) {
  const toast = useToast();
  const [month, setMonth] = useState(thisMonth);
  const [tab, setTab] = useState(initialTab);
  const [filters, setFilters] = useState({ type: '', category: '', q: '' });
  const [list, setList] = useState({ loading: true, error: '', items: [], totals: { income: 0, expense: 0 } });
  const [summary, setSummary] = useState({ loading: true, error: '', data: null });
  const [editing, setEditing] = useState(null); // null = closed, {} = new, tx = edit
  const [version, setVersion] = useState(0); // bump to refetch after a change
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const cur = user.currency;

  useEffect(() => {
    history.replaceState(null, '', tab === 'reports' ? '#reports' : location.pathname);
  }, [tab]);

  // list (debounced a little because of the search box)
  useEffect(() => {
    let cancelled = false;
    setList((l) => ({ ...l, loading: true, error: '' }));
    const t = setTimeout(async () => {
      try {
        const data = await api.transactions({ month, ...filters });
        if (!cancelled) setList({ loading: false, error: '', ...data });
      } catch (err) {
        if (!cancelled) setList((l) => ({ ...l, loading: false, error: err.message }));
      }
    }, filters.q ? 250 : 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [month, filters, version]);

  // summary + reports
  useEffect(() => {
    let cancelled = false;
    setSummary((s) => ({ ...s, loading: true, error: '' }));
    api
      .summary(month)
      .then((data) => !cancelled && setSummary({ loading: false, error: '', data }))
      .catch((err) => !cancelled && setSummary((s) => ({ ...s, loading: false, error: err.message })));
    return () => {
      cancelled = true;
    };
  }, [month, version]);

  async function save(values) {
    const isEdit = Boolean(editing?.id);
    if (isEdit) await api.updateTx(editing.id, values);
    else await api.addTx(values);
    setEditing(null);
    toast(isEdit ? 'Changes saved' : `${values.type === 'income' ? 'Income' : 'Expense'} added`);
    // jump to the month of the new entry so it's visible
    if (values.date.slice(0, 7) !== month) setMonth(values.date.slice(0, 7));
    refresh();
  }

  async function remove(tx) {
    try {
      await api.deleteTx(tx.id);
      refresh();
      toast('Transaction deleted', {
        action: {
          label: 'Undo',
          run: async () => {
            try {
              await api.addTx({ type: tx.type, amount: (tx.amount_cents / 100).toFixed(2), category: tx.category, date: tx.date, note: tx.note });
              refresh();
            } catch (err) {
              toast(err.message, { type: 'error' });
            }
          },
        },
      });
    } catch (err) {
      toast(err.message, { type: 'error' });
      if (err.status === 404) refresh();
    }
  }

  async function changeCurrency(e) {
    try {
      const { user: updated } = await api.updateMe({ currency: e.target.value });
      onUserChange(updated);
    } catch (err) {
      toast(err.message, { type: 'error' });
    }
  }

  const totals = summary.data?.totals ?? { income: 0, expense: 0 };
  const net = totals.income - totals.expense;

  return (
    <div className="app">
      <header className="topbar">
        <div className="container topbar-row">
          <div className="brand">
            <img src="/favicon.svg" alt="" width="28" height="28" />
            <span>Pocket Ledger</span>
          </div>
          <div className="user-menu">
            <select aria-label="Currency" value={cur} onChange={changeCurrency} className="select-sm">
              {config.currencies.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <span className="user-name" title={user.email}>{user.name}</span>
            <button className="btn btn-ghost btn-sm" onClick={onLogout}>
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="container main">
        <div className="toolbar">
          <div className="month-switch">
            <button className="icon-btn" aria-label="Previous month" onClick={() => setMonth((m) => shiftMonth(m, -1))}>
              &#8249;
            </button>
            <h1>{monthLabel(month)}</h1>
            <button className="icon-btn" aria-label="Next month" onClick={() => setMonth((m) => shiftMonth(m, 1))}>
              &#8250;
            </button>
            {month !== thisMonth() && (
              <button className="link" onClick={() => setMonth(thisMonth())}>
                Today
              </button>
            )}
          </div>
          <nav className="tabs" role="tablist" aria-label="View">
            <button role="tab" aria-selected={tab === 'transactions'} className={tab === 'transactions' ? 'on' : ''} onClick={() => setTab('transactions')}>
              Transactions
            </button>
            <button role="tab" aria-selected={tab === 'reports'} className={tab === 'reports' ? 'on' : ''} onClick={() => setTab('reports')}>
              Reports
            </button>
          </nav>
        </div>

        <section className="cards" aria-label="Month summary" aria-busy={summary.loading}>
          <div className="stat-card">
            <span className="label">Income</span>
            <strong className="pos">{money(totals.income, cur)}</strong>
          </div>
          <div className="stat-card">
            <span className="label">Expenses</span>
            <strong className="neg">{money(totals.expense, cur)}</strong>
          </div>
          <div className="stat-card">
            <span className="label">Net this month</span>
            <strong className={net < 0 ? 'neg' : ''}>{money(net, cur, { signDisplay: 'exceptZero' })}</strong>
          </div>
          <div className="stat-card">
            <span className="label">Overall balance</span>
            <strong>{money(summary.data?.allTimeBalance ?? 0, cur)}</strong>
          </div>
        </section>

        {tab === 'transactions' ? (
          <TransactionList
            state={list}
            filters={filters}
            setFilters={setFilters}
            categories={config.categories}
            currency={cur}
            exportHref={api.exportUrl({ month, ...filters })}
            onAdd={() => setEditing({})}
            onEdit={setEditing}
            onDelete={remove}
            onRetry={refresh}
          />
        ) : (
          <Reports state={summary} month={month} currency={cur} onRetry={refresh} />
        )}
      </main>

      <button className="fab" aria-label="Add transaction" onClick={() => setEditing({})}>
        +
      </button>

      <Modal open={editing !== null} title={editing?.id ? 'Edit transaction' : 'New transaction'} onClose={() => setEditing(null)}>
        <TransactionForm
          initial={editing?.id ? editing : null}
          categories={config.categories}
          currency={cur}
          onSubmit={save}
          onCancel={() => setEditing(null)}
        />
      </Modal>
    </div>
  );
}
