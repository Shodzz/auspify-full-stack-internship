import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { HttpError } from './errors.js';

export const COOKIE = 'cs_session';
const WEEK = 7 * 24 * 60 * 60 * 1000;

export function resolveSecret(value = process.env.JWT_SECRET) {
  if (value && value.length >= 32) return value;
  if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET must be set (32+ characters) in production.');
  console.warn('JWT_SECRET missing or too short; using a temporary secret. Logins reset when the server restarts.');
  return crypto.randomBytes(48).toString('hex');
}

export function makeAuth(db, { secret, secureCookies }) {
  const cookieOpts = { httpOnly: true, sameSite: 'strict', secure: secureCookies, path: '/' };
  const findUser = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?');

  // Looks the user up on every request so a deleted user or a role change
  // takes effect right away instead of when the token expires.
  function load(req) {
    const token = req.cookies?.[COOKIE];
    if (!token) return null;
    try {
      const { sub } = jwt.verify(token, secret, { algorithms: ['HS256'] });
      return findUser.get(Number(sub)) ?? null;
    } catch {
      return null;
    }
  }

  return {
    signIn(res, userId) {
      res.cookie(COOKIE, jwt.sign({}, secret, { subject: String(userId), expiresIn: '7d' }), { ...cookieOpts, maxAge: WEEK });
    },
    signOut(res) {
      res.clearCookie(COOKIE, cookieOpts);
    },
    optional(req, res, next) {
      req.user = load(req);
      next();
    },
    required(req, res, next) {
      req.user = load(req);
      if (!req.user) return next(new HttpError(401, 'Please log in to continue.'));
      next();
    },
    admin(req, res, next) {
      req.user = load(req);
      if (!req.user) return next(new HttpError(401, 'Please log in to continue.'));
      if (req.user.role !== 'admin') return next(new HttpError(403, 'Admins only.'));
      next();
    },
  };
}
