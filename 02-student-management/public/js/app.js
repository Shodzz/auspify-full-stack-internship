import { students, ApiError } from './api.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// Filters, sort and page live in the URL so a refresh keeps your place.
const url = new URLSearchParams(location.search);
const state = {
  q: url.get('q') || '',
  course: url.get('course') || '',
  status: url.get('status') || '',
  sort: url.get('sort') || 'name',
  dir: url.get('dir') === 'desc' ? 'desc' : 'asc',
  page: Number(url.get('page')) || 1,
  limit: Number(url.get('limit')) || 10,
};

let rows = [];          // current page of students
let editing = null;     // student being edited, or null when adding
let loadCtrl = null;    // aborts a slow request when a newer one starts

const fmtDate = (iso) =>
  new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const ordinal = (n) => n + (['th', 'st', 'nd', 'rd'][n] || 'th');

function td(text, cls, label) {
  const cell = document.createElement('td');
  if (cls) cell.className = cls;
  if (label) cell.dataset.label = label;
  cell.textContent = text;
  return cell;
}

function toast(msg, type = '') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  $('#toasts').append(t);
  setTimeout(() => t.remove(), 3500);
}

/* ---------- list ---------- */

function syncUrl() {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(state)) {
    const isDefault = (k === 'sort' && v === 'name') || (k === 'dir' && v === 'asc') || (k === 'page' && v === 1) || (k === 'limit' && v === 10);
    if (v && !isDefault) p.set(k, v);
  }
  history.replaceState(null, '', p.size ? `?${p}` : location.pathname);
}

function showSkeleton() {
  const tbody = $('#rows');
  tbody.replaceChildren();
  for (let i = 0; i < Math.min(state.limit, 6); i++) {
    const tr = document.createElement('tr');
    tr.className = 'skeleton';
    for (let c = 0; c < 7; c++) tr.append(Object.assign(document.createElement('td'), { innerHTML: '<span></span>' }));
    tbody.append(tr);
  }
}

function renderRows() {
  const tbody = $('#rows');
  tbody.replaceChildren(
    ...rows.map((s) => {
      const tr = document.createElement('tr');

      const name = document.createElement('td');
      name.className = 'name';
      const strong = document.createElement('strong');
      strong.textContent = `${s.first_name} ${s.last_name}`;
      const email = document.createElement('span');
      email.textContent = s.email;
      name.append(strong, email);

      const status = document.createElement('td');
      status.className = 'cell-status';
      const pill = document.createElement('span');
      pill.className = `pill ${s.status.replace(' ', '-')}`;
      pill.textContent = s.status;
      status.append(pill);

      const actions = document.createElement('td');
      actions.className = 'actions';
      actions.innerHTML = `
        <button class="icon-btn" data-edit="${s.id}" type="button" aria-label="Edit"><svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z M14 6l4 4"/></svg></button>
        <button class="icon-btn danger" data-delete="${s.id}" type="button" aria-label="Delete"><svg viewBox="0 0 24 24"><path d="M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button>`;

      tr.append(
        td(s.roll_no, 'mono', 'Roll'),
        name,
        td(s.course, '', 'Course'),
        td(ordinal(s.year), '', 'Year'),
        td(fmtDate(s.enrolled_on), '', 'Enrolled'),
        status,
        actions
      );
      return tr;
    })
  );
}

function renderPager({ total, page, pages, limit }) {
  const from = total ? (page - 1) * limit + 1 : 0;
  const to = Math.min(page * limit, total);
  $('#pageInfo').textContent = total ? `Showing ${from}-${to} of ${total}` : '';
  $('#pageNum').textContent = `${page} / ${pages}`;
  $('#prevBtn').disabled = page <= 1;
  $('#nextBtn').disabled = page >= pages;
  $('#pager').hidden = total === 0;
}

function renderSortHeaders() {
  $$('.sort').forEach((b) => {
    if (b.dataset.sort === state.sort) b.setAttribute('aria-sort', state.dir === 'asc' ? 'ascending' : 'descending');
    else b.removeAttribute('aria-sort');
  });
}

async function load() {
  loadCtrl?.abort();
  loadCtrl = new AbortController();
  syncUrl();
  renderSortHeaders();
  $('#errorState').hidden = true;
  $('#emptyState').hidden = true;
  $('#table').hidden = false;
  showSkeleton();

  try {
    const data = await students.list(state, loadCtrl.signal);
    rows = data.items;
    state.page = data.page;
    renderRows();
    renderPager(data);

    if (!rows.length) {
      $('#table').hidden = true;
      const filtered = state.q || state.course || state.status;
      $('#emptyTitle').textContent = filtered ? 'No matches' : 'No students yet';
      $('#emptyText').innerHTML = filtered
        ? 'Nothing matches these filters. Try a different search.'
        : 'Add your first student, or run <code>npm run seed</code> to load sample data.';
      $('#emptyAction').textContent = filtered ? 'Clear filters' : 'Add student';
      $('#emptyAction').dataset.mode = filtered ? 'clear' : 'add';
      $('#emptyState').hidden = false;
    }
  } catch (err) {
    if (err.name === 'AbortError') return;
    $('#table').hidden = true;
    $('#pager').hidden = true;
    $('#errorText').textContent = err.message;
    $('#errorState').hidden = false;
  }
}

async function loadMeta(first = false) {
  try {
    const meta = await students.meta();
    for (const [key, n] of Object.entries({ total: meta.total, ...meta.counts })) {
      const el = $(`[data-count="${key}"]`);
      if (el) el.textContent = n;
    }
    if (first) {
      const opts = (list) => list.map((v) => new Option(v.replace(/^./, (c) => c.toUpperCase()), v));
      $('#courseFilter').append(...opts(meta.courses));
      $('#statusFilter').append(...opts(meta.statuses));
      $('#course').append(...opts(meta.courses));
      $('#status').append(...opts(meta.statuses));
      $('#courseFilter').value = state.course;
      $('#statusFilter').value = state.status;
    }
    $$('.stat').forEach((b) => b.classList.toggle('selected', b.dataset.status === state.status));
  } catch {
    // the list request will show the error, no need to say it twice
  }
}

/* ---------- add / edit ---------- */

const form = $('#studentForm');
const FIELDS = ['roll_no', 'first_name', 'last_name', 'email', 'phone', 'course', 'year', 'enrolled_on', 'status'];

function setFieldErrors(errors = {}) {
  for (const name of FIELDS) {
    const msg = errors[name] || '';
    form.elements[name].closest('.field').classList.toggle('invalid', !!msg);
    $(`.err[data-for="${name}"]`, form).textContent = msg;
  }
  const first = FIELDS.find((n) => errors[n]);
  if (first) form.elements[first].focus();
}

function openForm(student = null) {
  editing = student;
  form.reset();
  setFieldErrors();
  $('#formError').textContent = '';
  $('#formTitle').textContent = student ? 'Edit student' : 'Add student';
  $('#saveBtn').textContent = student ? 'Save changes' : 'Add student';
  $('#enrolled_on').max = new Date().toISOString().slice(0, 10);

  if (student) {
    for (const name of FIELDS) form.elements[name].value = student[name] ?? '';
  } else {
    form.elements.enrolled_on.value = new Date().toISOString().slice(0, 10);
    form.elements.status.value = 'active';
  }
  $('#formDialog').showModal();
  form.elements.roll_no.focus();
}

function quickCheck(v) {
  const e = {};
  if (!/^[A-Za-z0-9-]{3,20}$/.test(v.roll_no)) e.roll_no = 'Use 3-20 letters, digits or dashes.';
  if (!v.first_name) e.first_name = 'Required.';
  if (!v.last_name) e.last_name = 'Required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) e.email = 'Enter a valid email address.';
  if (!v.course) e.course = 'Pick a course.';
  if (!v.enrolled_on) e.enrolled_on = 'Required.';
  return e;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const values = Object.fromEntries(FIELDS.map((n) => [n, form.elements[n].value.trim()]));
  const errors = quickCheck(values);
  setFieldErrors(errors);
  $('#formError').textContent = '';
  if (Object.keys(errors).length) return;

  const btn = $('#saveBtn');
  btn.disabled = true;
  btn.classList.add('busy');
  const oldLabel = btn.textContent;
  btn.textContent = 'Saving...';

  try {
    const saved = editing ? await students.update(editing.id, values) : await students.create(values);
    $('#formDialog').close();
    toast(editing ? `Updated ${saved.first_name} ${saved.last_name}` : `Added ${saved.first_name} ${saved.last_name}`);
    await Promise.all([load(), loadMeta()]);
  } catch (err) {
    if (err instanceof ApiError && err.fields) setFieldErrors(err.fields);
    $('#formError').textContent = err.message;
  } finally {
    btn.disabled = false;
    btn.classList.remove('busy');
    btn.textContent = oldLabel;
  }
});

form.addEventListener('input', (e) => {
  const field = e.target.closest('.field');
  if (field?.classList.contains('invalid')) {
    field.classList.remove('invalid');
    $('.err', field).textContent = '';
  }
});

/* ---------- delete ---------- */

let toDelete = null;

function askDelete(student) {
  toDelete = student;
  $('#confirmText').textContent = `${student.first_name} ${student.last_name} (${student.roll_no}) will be removed permanently.`;
  $('#confirmDialog').showModal();
}

$('#confirmBtn').addEventListener('click', async () => {
  const btn = $('#confirmBtn');
  btn.disabled = true;
  try {
    await students.remove(toDelete.id);
    $('#confirmDialog').close();
    toast(`Deleted ${toDelete.first_name} ${toDelete.last_name}`);
    await Promise.all([load(), loadMeta()]);
  } catch (err) {
    $('#confirmDialog').close();
    toast(err.message, 'error');
    if (err.status === 404) load();
  } finally {
    btn.disabled = false;
  }
});

/* ---------- wiring ---------- */

$$('[data-close]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));

$('#addBtn').addEventListener('click', () => openForm());
$('#emptyAction').addEventListener('click', (e) => {
  if (e.currentTarget.dataset.mode === 'clear') {
    Object.assign(state, { q: '', course: '', status: '', page: 1 });
    $('#search').value = '';
    $('#courseFilter').value = '';
    $('#statusFilter').value = '';
    loadMeta();
    load();
  } else openForm();
});
$('#retryBtn').addEventListener('click', () => { loadMeta(true); load(); });

$('#rows').addEventListener('click', (e) => {
  const edit = e.target.closest('[data-edit]');
  const del = e.target.closest('[data-delete]');
  if (edit) openForm(rows.find((s) => s.id === Number(edit.dataset.edit)));
  if (del) askDelete(rows.find((s) => s.id === Number(del.dataset.delete)));
});

let searchTimer;
$('#search').value = state.q;
$('#search').addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.q = e.target.value.trim();
    state.page = 1;
    load();
  }, 250);
});

$('#courseFilter').addEventListener('change', (e) => { state.course = e.target.value; state.page = 1; load(); });
$('#statusFilter').addEventListener('change', (e) => {
  state.status = e.target.value;
  state.page = 1;
  $$('.stat').forEach((b) => b.classList.toggle('selected', b.dataset.status === state.status));
  load();
});

$$('.stat').forEach((b) =>
  b.addEventListener('click', () => {
    state.status = b.dataset.status;
    state.page = 1;
    $('#statusFilter').value = state.status;
    $$('.stat').forEach((x) => x.classList.toggle('selected', x === b));
    load();
  })
);

$$('.sort').forEach((b) =>
  b.addEventListener('click', () => {
    const key = b.dataset.sort;
    state.dir = state.sort === key && state.dir === 'asc' ? 'desc' : 'asc';
    state.sort = key;
    load();
  })
);

$('#perPage').value = String(state.limit);
$('#perPage').addEventListener('change', (e) => { state.limit = Number(e.target.value); state.page = 1; load(); });
$('#prevBtn').addEventListener('click', () => { state.page--; load(); });
$('#nextBtn').addEventListener('click', () => { state.page++; load(); });

loadMeta(true);
load();
