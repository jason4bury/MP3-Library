const crypto = require('crypto');

// Login for the single web UI account set by APP_USERNAME / APP_PASSWORD in .env. index.js
// refuses to start without them (see checkRequiredSettings there), so there are no built-in
// default credentials to fall back on here.

// Simple per-IP brake on password guessing: after MAX_FAILURES wrong attempts within
// WINDOW_MS, further attempts from that address get a 429 until the window passes. In memory
// only, which is fine for a single-process app: a restart just clears the counters.
const MAX_FAILURES = 10;
const WINDOW_MS = 15 * 60 * 1000;
const failures = new Map(); // ip -> { count, first }

function isLockedOut(ip) {
  const entry = failures.get(ip);
  if (!entry) return false;
  if (Date.now() - entry.first > WINDOW_MS) {
    failures.delete(ip);
    return false;
  }
  return entry.count >= MAX_FAILURES;
}

function noteFailure(ip) {
  const entry = failures.get(ip);
  if (!entry || Date.now() - entry.first > WINDOW_MS) {
    failures.set(ip, { count: 1, first: Date.now() });
  } else {
    entry.count++;
  }
}

// Compares two strings in constant time (hashing first so different lengths don't leak
// through timing either).
function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) return next();
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  return res.redirect('/login.html');
}

function login(req, res, next) {
  const ip = req.ip;
  if (isLockedOut(ip)) {
    return res.status(429).json({ error: 'Too many failed sign-in attempts. Try again in 15 minutes.' });
  }

  const { username, password } = req.body || {};
  const userOk = safeEqual(username || '', process.env.APP_USERNAME);
  const passOk = safeEqual(password || '', process.env.APP_PASSWORD);

  if (!(userOk && passOk)) {
    noteFailure(ip);
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  failures.delete(ip);
  // New session ID on sign-in, so a session ID picked up before login can't be reused after it.
  req.session.regenerate((err) => {
    if (err) return next(err);
    req.session.authenticated = true;
    req.session.username = username;
    return res.json({ ok: true });
  });
  return undefined;
}

function logout(req, res) {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
}

function me(req, res) {
  res.json({ authenticated: !!(req.session && req.session.authenticated) });
}

module.exports = { requireAuth, login, logout, me };
