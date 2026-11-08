require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');

// Refuse to start with missing or placeholder sign-in settings. This app is meant to be reachable
// from the internet, so it must never fall back to a built-in password or cookie secret.
function checkRequiredSettings() {
  const placeholders = new Set(['', 'change-me', 'change-this-to-a-long-random-string']);
  const problems = [];
  if (placeholders.has((process.env.APP_USERNAME || '').trim())) problems.push('APP_USERNAME is not set');
  if (placeholders.has((process.env.APP_PASSWORD || '').trim())) problems.push('APP_PASSWORD is not set (or is still "change-me")');
  const secret = (process.env.SESSION_SECRET || '').trim();
  if (placeholders.has(secret)) problems.push('SESSION_SECRET is not set (or is still the example value)');
  else if (secret.length < 32) problems.push('SESSION_SECRET is shorter than 32 characters');
  if (problems.length) {
    console.error('MP3 Library cannot start:\n  - ' + problems.join('\n  - '));
    console.error('Set these in your .env file (see .env.example), then start the container again.');
    process.exit(1);
  }
}
checkRequiredSettings();

const db = require('./db');
const { requireAuth, login, logout, me } = require('./auth');
const apiRoutes = require('./routes/api');
const { runScan, getScanStatus } = require('./scanner');
const { regenerateLoginBackground, getLoginBackgroundImageAt } = require('./loginBackground');
const { renderLoginPage } = require('./loginPage');
const { importArtistPhotosToDb } = require('./artistPhotos');
const SqliteSessionStore = require('./sqliteSessionStore');
const { DISPLAY_VERSION } = require('./version');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1); // needed if running behind a reverse proxy for cookies to work over https

app.disable('x-powered-by');

// Basic security headers for every response. No Content-Security-Policy yet: the frontend
// still uses inline onerror handlers and an inline login script (logged for a later version).
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('Referrer-Policy', 'same-origin');
  next();
});

// 10 MB rather than the 100 KB default, so importing a large .m3u8 playlist (sent as JSON text)
// isn't rejected.
app.use(express.json({ limit: '10mb' }));
app.use(
  session({
    store: new SqliteSessionStore(),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: 'lax',
      // Secure (HTTPS-only) cookie when the request came in over HTTPS, including through a
      // reverse proxy that sets X-Forwarded-Proto; plain cookie on a plain-HTTP LAN address.
      secure: 'auto',
    },
  })
);

// Public auth endpoints
app.post('/api/login', login);
app.post('/api/logout', logout);
app.get('/api/me', me);

// GET /healthz — plain, unauthenticated health check for uptime monitoring (Uptime Kuma, a
// Docker HEALTHCHECK — see the Dockerfile, a reverse proxy's own health probe, etc.). A
// monitoring tool has no session cookie, so this deliberately sits outside requireAuth, same as
// the login-background routes above. Kept minimal on purpose — this just confirms the process
// is up and SQLite is actually readable, not a deep diagnostic; that's what the in-app Health
// tab (GET /api/health/summary) is for.
app.get('/healthz', (req, res) => {
  try {
    db.prepare('SELECT 1').get();
    const scan = getScanStatus();
    res.json({
      status: 'ok',
      uptime_seconds: Math.round(process.uptime()),
      scan_status: scan ? scan.status : null,
    });
  } catch (err) {
    res.status(503).json({ status: 'error', message: err.message });
  }
});

// Public — serves the actual image bytes for one tile of the login page's background mosaic,
// by its index into the currently-persisted pool (see loginBackground.js). Deliberately NOT
// behind requireAuth, since it needs to render before the user has signed in. The pool itself
// only changes when a rescan finishes — this just serves whatever's currently persisted, so
// repeat calls (every page load) return the same pictures until the next rescan.
app.get('/api/login-background/image/:idx', (req, res) => {
  const idx = Number.parseInt(req.params.idx, 10);
  const photo = Number.isInteger(idx) ? getLoginBackgroundImageAt(idx) : null;
  if (!photo) return res.status(404).end();
  res.set('Content-Type', photo.mime || 'image/jpeg');
  res.set('Cache-Control', 'public, max-age=3600');
  res.send(photo.data);
});

// Everything else under /api requires a session
app.use('/api', requireAuth, apiRoutes);

// Static frontend — login.html is public, everything else requires auth. Server-rendered (not
// a plain sendFile) so the background mosaic's <img> tags are already in the HTML the browser
// gets back — see server/loginPage.js.
app.get('/login.html', (req, res) => {
  res.type('html').send(renderLoginPage());
});
// The browser asks for the icons on the sign-in page too, before there is a session.
const PUBLIC_PATHS = new Set(['/login.html', '/favicon.ico', '/apple-touch-icon.png']);
app.use((req, res, next) => {
  if (PUBLIC_PATHS.has(req.path) || req.path.startsWith('/api/')) return next();
  return requireAuth(req, res, next);
});
app.use(express.static(path.join(__dirname, '..', 'public')));

app.listen(PORT, () => {
  console.log(`MP3 Library v${DISPLAY_VERSION} listening on port ${PORT}`);

  // Import artist photos into the DB on every boot (not just on a rescan) — this is what
  // makes the fix take effect immediately on an existing, already-scanned library rather than
  // leaving artist_photos empty until the user happens to click Rescan. Cheap on repeat boots:
  // importArtistPhotosToDb() skips any photo whose file hasn't changed since it was last
  // imported (see its mtime check), so this only costs real disk time on the very first run
  // and whenever a photo has actually changed.
  try {
    const result = importArtistPhotosToDb();
    console.log(
      `Artist photos: ${result.imported} imported, ${result.unchanged} unchanged, ${result.removed} removed (${result.total} total)`
    );
    regenerateLoginBackground();
  } catch (err) {
    console.error('Failed to import artist photos on startup:', err);
  }

  const status = getScanStatus();
  if (!status || status.files_processed === 0) {
    console.log('No tracks in database yet — starting an initial scan...');
    runScan().catch((err) => console.error('Initial scan failed:', err));
  }
});
