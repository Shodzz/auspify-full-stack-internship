// Thin wrapper around fetch that turns non-2xx responses into thrown errors
// carrying the server's message and per-field errors.

export class ApiError extends Error {
  constructor(message, status, fields) {
    super(message);
    this.status = status;
    this.fields = fields || null;
  }
}

export async function api(path, { method = 'GET', body, signal } = {}) {
  let res;
  try {
    res = await fetch(path, {
      method,
      signal,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('Could not reach the server. Is it running?', 0);
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.error || `Request failed (${res.status})`, res.status, data?.fields);
  return data;
}

export const students = {
  list: (params, signal) => api('/api/students?' + new URLSearchParams(params), { signal }),
  meta: () => api('/api/meta'),
  create: (s) => api('/api/students', { method: 'POST', body: s }),
  update: (id, s) => api(`/api/students/${id}`, { method: 'PUT', body: s }),
  remove: (id) => api(`/api/students/${id}`, { method: 'DELETE' }),
};
