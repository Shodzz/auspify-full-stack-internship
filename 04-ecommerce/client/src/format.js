const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
export const price = (cents) => fmt.format((cents || 0) / 100);

export const date = (sqlDate) =>
  new Date(sqlDate.replace(' ', 'T') + 'Z').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export const orderNo = (id) => `#${String(id).padStart(5, '0')}`;

export const STATUS_LABEL = {
  placed: 'Placed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};
