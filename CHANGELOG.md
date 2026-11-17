# Changelog

All notable changes to MP3 Library are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), with versions in the form
v<major>.<minor> (two-digit minor) to match the Git tags and Docker image tags. Versioning
restarted at v1.00; earlier changes are in [docs/HISTORY-before-1.00.md](docs/HISTORY-before-1.00.md).

## [Unreleased]

## [1.03] - 2026-11-17

### Changed
- Your music and artist pictures folders now go straight into `docker-compose.yml` (replace the
  `/path/to/...` examples), so they aren't set twice. `.env` holds only the app settings.
- The host port is set in `docker-compose.yml` (`"3000:3000"`), and the compose file runs
  `jason4bury/mp3-library:latest`.

### Removed
- `PORT`, `MP3_LIBRARY_TAG`, `MUSIC_HOST_DIR_1`, `MUSIC_HOST_DIR_2`, `ARTIST_PICTURES_HOST_DIR`
  and `DATA_HOST_DIR` from `.env.example`.

## [1.02] - 2026-11-17

### Changed
- `docker-compose.yml` and `.env.example` work for anyone again, with no shared Docker folder
  needed: one `.env` next to the compose file holds the folders, port and app settings.
  Compose stops with a clear message if `MUSIC_HOST_DIR_1` or `ARTIST_PICTURES_HOST_DIR` is
  missing.
- One music folder by default (`MUSIC_HOST_DIR_1`); a second is one line to switch on.
- The database goes in the `mp3-library-data` Docker volume unless `DATA_HOST_DIR` is set.
- The image tag (`MP3_LIBRARY_TAG`) and host port (`PORT`) can be set in `.env` again.

### Removed
- The `ENV`, `CONFIGS`, `MUSIC` and `MP3_ARTIST_PICS` variables from a shared main `.env`, and
  the `home.group` label.

## [1.01] - 2026-11-16

### Changed
- `docker-compose.yml` now fits a shared Docker setup: the app's settings come from its own
  `.env` through `env_file` (`${ENV}/mp3-library/.env`), and the data, music and artist
  pictures folders come from `CONFIGS`, `MUSIC` and `MP3_ARTIST_PICS` in the main `.env` next
  to the compose file. It runs the published image; it no longer builds from source
  (use `docker build -t jason4bury/mp3-library .` for that). Adds a `home.group=Music` label.
- `PORT`, `ARTIST_PICTURES_DIR` and `DATA_DIR` are fixed in the compose file, so nothing in the
  app's `.env` can move them.
- `.env.example` now holds only the settings the app reads: `MUSIC_DIR`, the sign-in settings
  and Last.fm.

### Removed
- The `mp3-library-data` named volume.
- `PORT`, `MP3_LIBRARY_TAG`, `MUSIC_HOST_DIR_1`, `MUSIC_HOST_DIR_2`,
  `ARTIST_PICTURES_HOST_DIR` and `DATA_HOST_DIR` from `.env.example`: the folders now come from
  the main `.env`.

## [1.00] - 2026-11-07

First release in the house style. Includes everything in the earlier history, plus:

### Added
- Sign-in lockout: 10 wrong passwords from one address within 15 minutes blocks further tries
  for 15 minutes.
- Basic security headers (no framing, no MIME sniffing, same-origin referrer).
- Favicon and home-screen icon, also shown on the sign-in page.
- About shows the copyright, MIT licence and a link to the GitHub repository.
- `docker-compose.yml` can build the image itself (`docker compose up -d --build`), and the
  image tag can be set with `MP3_LIBRARY_TAG`.
- `.dockerignore`, ESLint config (`npm run lint`) and OCI labels on the image.

### Changed
- The app refuses to start if `APP_USERNAME`, `APP_PASSWORD` or `SESSION_SECRET` is missing or
  still the example value, instead of falling back to built-in defaults.
- The session cookie is marked secure when the app is reached over HTTPS, and a new session ID
  is issued at sign-in.
- Data location: `DATA_HOST_DIR` replaces `CONFIGS`. Leave it blank to use the
  `mp3-library-data` Docker volume.
- Docker image pinned to Node.js 22.23.4 and built from `package-lock.json` with `npm ci`.
- Dependencies updated: better-sqlite3 12, music-metadata 11, Express 4.22.3. `npm audit` is
  clean (it reported 5 issues before, including a critical one in proxy-addr).
- Large `.m3u8` imports (over 100 KB) are accepted.
- Last.fm requests identify the app as `MP3-Library/1.00` with the repository URL.
- The personal website link in About is replaced by the repository link.

### Fixed
- A rescan with a music folder offline, unmounted or empty deleted every track in it, and with
  them their playlist entries, favourites and play history. Those tracks are now kept and the
  scan says which folder was missing.
- The `.gitignore` lines started with spaces (and two ended with a carriage return), so none of
  them matched and `.env`, `node_modules/` and `data/` could be committed.
- The multi-select "Add to playlist" bar was always on screen, even with nothing selected.
- The play next, queue, radio and add buttons on each track row sat outside the table, so the
  row lines and header stopped short of them.
- Streaming: a range request past the end of the file or with start after end now gets a
  "416 Range Not Satisfiable" instead of the start of the file, and "last N bytes" requests are
  served correctly (and aren't counted as a play).
- An unknown Health issue type such as `__proto__` gave a server error instead of a 400.
