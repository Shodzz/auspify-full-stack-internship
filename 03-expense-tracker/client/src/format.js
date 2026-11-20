const formatters = new Map();

export function money(cents, currency = 'USD', opts = {}) {
  const key = currency + JSON.stringify(opts);
  if (!formatters.has(key)) {
    formatters.set(key, new Intl.NumberFormat(undefined, { style: 'currency', currency, ...opts }));
  }
  return formatters.get(key).format((cents || 0) / 100);
}

// local date, not UTC, so late-evening entries don't land on tomorrow
export const today = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
export const thisMonth = () => today().slice(0, 7);

export function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(month, style = 'long') {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: style, year: 'numeric' });
}

export function shortMonth(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'short' });
}

export function dayLabel(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}
