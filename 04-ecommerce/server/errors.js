export class HttpError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export const fail = (status, message, fields) => {
  throw new HttpError(status, message, fields);
};

export const parseId = (raw, what = 'Item') => {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) fail(404, `${what} not found.`);
  return id;
};

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  let message = err.message;
  if (err.type === 'entity.parse.failed') message = 'Invalid JSON body.';
  if (status >= 500) {
    console.error(err);
    message = 'Unexpected server error.';
  }
  res.status(status).json({ error: message, ...(err.fields && { fields: err.fields }) });
}
