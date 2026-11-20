// Same rules as the browser-side checks in public/js/main.js.
// The browser checks are for convenience; these are the ones that count.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const str = (v) => (typeof v === 'string' ? v.trim() : '');

export function checkContact(body) {
  const src = body && typeof body === 'object' ? body : {};
  const data = {
    name: str(src.name),
    email: str(src.email).toLowerCase(),
    subject: str(src.subject),
    message: str(src.message),
    // hidden field, real people leave it empty
    website: str(src.website),
  };

  const errors = {};
  if (data.name.length < 2 || data.name.length > 80) {
    errors.name = 'Please enter your name (2-80 characters).';
  }
  if (!EMAIL_RE.test(data.email) || data.email.length > 120) {
    errors.email = 'That email address does not look right.';
  }
  if (data.subject.length > 120) {
    errors.subject = 'Keep the subject under 120 characters.';
  }
  if (data.message.length < 10) {
    errors.message = 'The message is a bit short (at least 10 characters).';
  } else if (data.message.length > 2000) {
    errors.message = 'The message is too long (2000 characters max).';
  }

  return { data, errors: Object.keys(errors).length ? errors : null };
}
