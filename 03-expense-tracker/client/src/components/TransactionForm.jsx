import { useState } from 'react';
import Field from './Field.jsx';
import { today } from '../format.js';

function check(v, categories) {
  const e = {};
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(v.amount.trim()) || Number(v.amount) <= 0) e.amount = 'Enter an amount above 0, up to 2 decimals.';
  if (!categories[v.type].includes(v.category)) e.category = 'Pick a category.';
  if (!v.date) e.date = 'Pick a date.';
  if (v.note.length > 140) e.note = 'Keep notes under 140 characters.';
  return e;
}

export default function TransactionForm({ initial, categories, currency, onSubmit, onCancel }) {
  const [values, setValues] = useState(() =>
    initial
      ? {
          type: initial.type,
          amount: (initial.amount_cents / 100).toFixed(2),
          category: initial.category,
          date: initial.date,
          note: initial.note,
        }
      : { type: 'expense', amount: '', category: categories.expense[0], date: today(), note: '' }
  );
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    if (errors[key]) setErrors((x) => ({ ...x, [key]: '' }));
  };

  const setType = (type) =>
    setValues((v) => ({ ...v, type, category: categories[type].includes(v.category) ? v.category : categories[type][0] }));

  async function submit(e) {
    e.preventDefault();
    setFormError('');
    const local = check(values, categories);
    setErrors(local);
    if (Object.keys(local).length) return;

    setBusy(true);
    try {
      await onSubmit({ ...values, amount: values.amount.trim(), note: values.note.trim() });
    } catch (err) {
      if (err.fields) setErrors(err.fields);
      setFormError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="stack modal-body">
      <div className="segmented" role="radiogroup" aria-label="Type">
        {['expense', 'income'].map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={values.type === t}
            className={`${t} ${values.type === t ? 'on' : ''}`}
            onClick={() => setType(t)}
          >
            {t === 'expense' ? 'Expense' : 'Income'}
          </button>
        ))}
      </div>

      <div className="row-2">
        <Field label={`Amount (${currency})`} error={errors.amount}>
          <input inputMode="decimal" placeholder="0.00" value={values.amount} onChange={set('amount')} autoFocus />
        </Field>
        <Field label="Date" error={errors.date}>
          <input type="date" value={values.date} onChange={set('date')} />
        </Field>
      </div>

      <Field label="Category" error={errors.category}>
        <select value={values.category} onChange={set('category')}>
          {categories[values.type].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>

      <Field label="Note" error={errors.note} hint={`${values.note.length}/140`}>
        <input value={values.note} onChange={set('note')} maxLength={140} placeholder="e.g. Groceries for the week" />
      </Field>

      {formError && <p className="form-error" role="alert">{formError}</p>}

      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn btn-primary" disabled={busy}>
          {busy && <span className="spinner" />}
          {initial ? 'Save changes' : 'Add'}
        </button>
      </div>
    </form>
  );
}
