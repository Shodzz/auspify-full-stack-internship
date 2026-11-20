import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api.js';
import ProductArt from '../../components/ProductArt.jsx';
import { Crumbs, ErrorBox, Field, Loading, Spinner, useToast } from '../../components/ui.jsx';

const CATEGORIES = ['Kitchen', 'Desk', 'Home', 'Outdoors'];
const blank = { name: '', slug: '', description: '', category: 'Kitchen', price: '', stock: '0', hue: '200', featured: false, active: true };

export default function ProductForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const toast = useToast();
  const [v, setV] = useState(isNew ? blank : null);
  const [loadError, setLoadError] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isNew) return;
    api.admin
      .product(id)
      .then(({ product: p }) =>
        setV({ ...p, price: (p.price_cents / 100).toFixed(2), stock: String(p.stock), hue: String(p.hue), featured: !!p.featured, active: !!p.active })
      )
      .catch((err) => setLoadError(err.message));
  }, [id, isNew]);

  if (loadError) return <ErrorBox message={loadError} />;
  if (!v) return <Loading />;

  const set = (k) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setV((x) => ({ ...x, [k]: value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: '' }));
  };

  async function submit(e) {
    e.preventDefault();
    setFormError('');
    const local = {};
    if (v.name.trim().length < 2) local.name = 'Name is required.';
    if (!/^\d{1,6}(\.\d{1,2})?$/.test(String(v.price).trim()) || Number(v.price) <= 0) local.price = 'Enter a price like 12.50';
    if (!/^\d+$/.test(String(v.stock))) local.stock = 'Whole number, 0 or more.';
    setErrors(local);
    if (Object.keys(local).length) return;

    setBusy(true);
    const body = { ...v, stock: Number(v.stock), hue: Number(v.hue) };
    try {
      if (isNew) await api.admin.createProduct(body);
      else await api.admin.updateProduct(id, body);
      toast(isNew ? 'Product created' : 'Product saved', 'success');
      navigate('/admin?tab=products');
    } catch (err) {
      if (err.fields) setErrors(err.fields);
      setFormError(err.message);
      setBusy(false);
    }
  }

  return (
    <>
      <Crumbs items={[['Admin', '/admin?tab=products'], [isNew ? 'New product' : `Edit ${v.name}`]]} />
      <h1 className="page-title">{isNew ? 'New product' : 'Edit product'}</h1>
      <div className="cart-layout">
        <form className="card" onSubmit={submit} noValidate>
          <div className="form-grid">
            <Field label="Name" error={errors.name} className="span-2"><input value={v.name} onChange={set('name')} maxLength={80} /></Field>
            <Field label="URL slug" error={errors.slug} hint="Leave empty to build it from the name"><input value={v.slug} onChange={set('slug')} maxLength={60} placeholder="speckled-mug" /></Field>
            <Field label="Category" error={errors.category}>
              <select value={v.category} onChange={set('category')}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
            </Field>
            <Field label="Price (USD)" error={errors.price}><input inputMode="decimal" value={v.price} onChange={set('price')} placeholder="0.00" /></Field>
            <Field label="Stock" error={errors.stock}><input inputMode="numeric" value={v.stock} onChange={set('stock')} /></Field>
            <Field label="Description" error={errors.description} className="span-2"><textarea rows={4} value={v.description} onChange={set('description')} maxLength={1000} /></Field>
            <Field label={`Colour (hue ${v.hue})`} error={errors.hue} className="span-2"><input type="range" min="0" max="359" value={v.hue} onChange={set('hue')} /></Field>
          </div>
          <div className="checks">
            <label><input type="checkbox" checked={v.featured} onChange={set('featured')} /> Featured on the home page</label>
            <label><input type="checkbox" checked={v.active} onChange={set('active')} /> Visible in the shop</label>
          </div>
          {formError && <p className="form-error" role="alert">{formError}</p>}
          <div className="form-actions">
            <Link className="btn btn-ghost" to="/admin?tab=products">Cancel</Link>
            <button className="btn btn-primary" disabled={busy}>{busy && <Spinner />} {isNew ? 'Create product' : 'Save changes'}</button>
          </div>
        </form>
        <aside className="card summary">
          <h2>Preview</h2>
          <ProductArt hue={Number(v.hue)} category={v.category} className="preview-art" />
          <strong>{v.name || 'Product name'}</strong>
          <span className="muted">{v.category} · {v.price ? `$${v.price}` : '$0.00'}</span>
        </aside>
      </div>
    </>
  );
}
