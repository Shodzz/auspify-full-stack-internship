import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

export const COOKIE = 'et_session';
const WEEK = 7 * 24 * 60 * 60 * 1000;

export function resolveSecret(value = process.env.JWT_SECRET) {
  if (value && value.length >= 32) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set (32+ characters) in production.');
  }
  if (value) console.warn('JWT_SECRET is shorter than 32 characters, using a temporary one instead.');
  else console.warn('JWT_SECRET is not set. Using a temporary secret; sessions end when the server restarts.');
  return crypto.randomBytes(48).toString('hex');
}

export function makeAuth({ secret, secureCookies }) {
  const cookieOpts = { httpOnly: true, sameSite: 'strict', secure: secureCookies, path: '/' };

  return {
    signIn(res, userId) {
      const token = jwt.sign({}, secret, { subject: String(userId), expiresIn: '7d' });
      res.cookie(COOKIE, token, { ...cookieOpts, maxAge: WEEK });
    },
    signOut(res) {
      res.clearCookie(COOKIE, cookieOpts);
    },
    // Adds req.userId, or answers 401.
    required(req, res, next) {
      const token = req.cookies?.[COOKIE];
      if (!token) return res.status(401).json({ error: 'Please log in.' });
      try {
        const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
        req.userId = Number(payload.sub);
        next();
      } catch {
        res.clearCookie(COOKIE, cookieOpts);
        res.status(401).json({ error: 'Your session has expired. Please log in again.' });
      }
    },
  };
}
