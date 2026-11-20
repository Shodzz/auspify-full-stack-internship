import { profile, projects } from './profile.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v);
  }
  node.append(...children);
  return node;
}

/* ---------- content ---------- */

function initials(name) {
  const letters = name.replace(/[^\p{L}\s]/gu, '').trim().split(/\s+/).map((w) => w[0]).join('');
  return (letters || 'P').slice(0, 2).toUpperCase();
}

function renderProfile() {
  document.title = `${profile.name} | ${profile.role}`;
  $$('[data-name]').forEach((n) => (n.textContent = profile.name));
  $$('[data-initials]').forEach((n) => (n.textContent = initials(profile.name)));
  $('[data-role]').textContent = profile.role;
  $('[data-tagline]').textContent = profile.tagline;
  $('#year').textContent = new Date().getFullYear();

  $('#facts').append(...profile.facts.map(([k, v]) => el('div', {}, el('dt', { text: k }), el('dd', { text: v }))));
  $('#aboutText').append(...profile.about.map((p) => el('p', { text: p })));

  $('#skills').append(
    ...Object.entries(profile.skills).map(([group, items]) =>
      el('div', { class: 'skill-group' }, el('h4', { text: group }), el('ul', { class: 'chips' }, ...items.map((s) => el('li', { text: s }))))
    )
  );

  const list = $('#contactList');
  const add = (label, text, href) => {
    const value = href ? el('a', { href, text, ...(href.startsWith('http') ? { target: '_blank', rel: 'noopener' } : {}) }) : el('span', { text });
    list.append(el('li', {}, el('span', { class: 'k', text: label }), value));
  };
  add('Email', profile.email, `mailto:${profile.email}`);
  add('Location', profile.location);
  if (profile.links.github) add('GitHub', profile.links.github.replace(/^https?:\/\//, ''), profile.links.github);
  if (profile.links.linkedin) add('LinkedIn', 'Profile', profile.links.linkedin);
  if (profile.links.resume) add('Resume', 'Download PDF', profile.links.resume);
}

/* ---------- projects ---------- */

let activeTag = 'All';

function projectCard(p) {
  const thumb = el('div', { class: 'project-thumb' });
  if (p.image) {
    const img = el('img', { src: p.image, alt: `Screenshot of ${p.title}`, loading: 'lazy' });
    img.addEventListener('error', () => img.replaceWith(el('div', { class: 'thumb-fallback', text: initials(p.title) })));
    thumb.append(img);
  } else {
    thumb.append(el('div', { class: 'thumb-fallback', text: initials(p.title) }));
  }

  const details = el('button', { class: 'link-btn', type: 'button', text: 'Details' });
  details.addEventListener('click', () => openProject(p));
  const foot = el('div', { class: 'project-foot' }, details);
  if (p.repo) foot.append(el('a', { class: 'link-btn', href: p.repo, target: '_blank', rel: 'noopener', text: 'Source' }));

  return el(
    'article',
    { class: 'project' },
    thumb,
    el('div', { class: 'project-body' },
      el('h3', { text: p.title }),
      el('p', { text: p.summary }),
      el('ul', { class: 'tags' }, ...p.tags.map((t) => el('li', { text: t }))),
      foot
    )
  );
}

function renderProjects() {
  const shown = activeTag === 'All' ? projects : projects.filter((p) => p.tags.includes(activeTag));
  $('#projectGrid').replaceChildren(...shown.map(projectCard));
  $('#projectsEmpty').hidden = shown.length > 0;
}

function renderFilters() {
  const tags = ['All', ...new Set(projects.flatMap((p) => p.tags))];
  const box = $('#filters');
  for (const tag of tags) {
    const b = el('button', { class: 'filter', type: 'button', 'aria-pressed': String(tag === activeTag), text: tag });
    b.addEventListener('click', () => {
      activeTag = tag;
      $$('.filter', box).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      renderProjects();
    });
    box.append(b);
  }
}

function openProject(p) {
  const body = $('#dialogBody');
  body.replaceChildren(
    el('h3', { text: p.title }),
    el('ul', { class: 'tags' }, ...p.tags.map((t) => el('li', { text: t }))),
    el('ul', { class: 'points' }, ...p.highlights.map((h) => el('li', { text: h }))),
    p.repo
      ? el('a', { class: 'btn btn-primary', href: p.repo, target: '_blank', rel: 'noopener', text: 'View source' })
      : el('p', { class: 'opt', text: 'Source link not added yet.' })
  );
  $('#projectDialog').showModal();
}

/* ---------- header, nav, theme ---------- */

function initNav() {
  const header = $('.site-header');
  const nav = $('#nav');
  const menuBtn = $('#menuBtn');

  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const setMenu = (open) => {
    nav.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  menuBtn.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  $$('a', nav).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && setMenu(false));

  const links = new Map($$('a', nav).map((a) => [a.hash.slice(1), a]));
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        links.forEach((a, id) => a.classList.toggle('active', id === entry.target.id));
      }
    },
    { rootMargin: '-45% 0px -50% 0px' }
  );
  $$('main section[id]').forEach((s) => observer.observe(s));
}

function initTheme() {
  const root = document.documentElement;
  let saved = null;
  try { saved = localStorage.getItem('theme'); } catch { /* storage blocked */ }
  const systemDark = matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = saved || (systemDark ? 'dark' : 'light');

  $('#themeBtn').addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch { /* ignore */ }
  });
}

/* ---------- contact form ---------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(values) {
  const errors = {};
  if (values.name.length < 2) errors.name = 'Please enter your name.';
  if (!EMAIL_RE.test(values.email)) errors.email = 'That email address does not look right.';
  if (values.message.length < 10) errors.message = 'The message is a bit short (at least 10 characters).';
  return errors;
}

function showErrors(form, errors) {
  $$('.field', form).forEach((f) => f.classList.remove('invalid'));
  $$('.field-error', form).forEach((p) => (p.textContent = ''));
  for (const [name, msg] of Object.entries(errors)) {
    const input = form.elements[name];
    if (!input) continue;
    input.closest('.field').classList.add('invalid');
    $(`.field-error[data-for="${name}"]`, form).textContent = msg;
  }
  const first = Object.keys(errors)[0];
  if (first && form.elements[first]) form.elements[first].focus();
}

function initContact() {
  const form = $('#contactForm');
  const status = $('#formStatus');
  const btn = $('#sendBtn');
  const label = $('.btn-label', btn);
  const counter = $('#charCount');

  form.elements.message.addEventListener('input', (e) => {
    counter.textContent = `${e.target.value.length} / 2000`;
  });

  // clear a field's error as soon as the user edits it
  form.addEventListener('input', (e) => {
    const field = e.target.closest('.field');
    if (field?.classList.contains('invalid')) {
      field.classList.remove('invalid');
      $('.field-error', field).textContent = '';
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = '';
    status.className = 'form-status';

    const values = Object.fromEntries(
      ['name', 'email', 'subject', 'message', 'website'].map((k) => [k, form.elements[k].value.trim()])
    );
    const errors = validate(values);
    if (Object.keys(errors).length) return showErrors(form, errors);

    btn.disabled = true;
    label.textContent = 'Sending...';
    btn.prepend(el('span', { class: 'spinner', 'aria-hidden': 'true' }));

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.fields) showErrors(form, data.fields);
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      form.reset();
      counter.textContent = '0 / 2000';
      status.textContent = 'Thanks, your message is in. I will reply by email.';
      status.classList.add('ok');
    } catch (err) {
      status.textContent = err.message === 'Failed to fetch' ? 'Could not reach the server. Check your connection and try again.' : err.message;
      status.classList.add('err');
    } finally {
      btn.disabled = false;
      label.textContent = 'Send message';
      $('.spinner', btn)?.remove();
    }
  });
}

renderProfile();
renderFilters();
renderProjects();
initNav();
initTheme();
initContact();
