<p align="center">
  <img src="assets/MP3-Library.png" alt="MP3 Library icon" width="128">
</p>

# MP3 Library

A self-hosted web app for searching, playing and organising your MP3 collection, run in Docker.

![Version](https://img.shields.io/badge/version-v1.01-blue)
![Platform](https://img.shields.io/badge/platform-Docker-2496ED?logo=docker&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=nodedotjs&logoColor=white)
![Licence](https://img.shields.io/badge/licence-MIT-green)
![Last commit](https://img.shields.io/github/last-commit/jason4bury/MP3-Library)

MP3 Library scans your music folders, reads the ID3 tags and embedded cover art, matches artist photos from a folder on disk, and keeps it all in a SQLite database. You browse, search and play everything from a browser, from home or (behind HTTPS) from anywhere.

## ✨ Features

- **Library scanning**: walks one or more music folders for `.mp3` files, reads title, artist, album, year, genre, track and disc number, length and bitrate, and pulls out embedded cover art once per album. Rescans only re-read files that changed. If a music folder is offline or empty during a rescan, its tracks are kept (with a warning) rather than removed, so playlists, favourites and history are never lost to an unplugged drive.
- **Artist photos**: matched by folder name from your artist pictures folder (`Artist Pictures/<Artist>/folder.jpg`, or any image in that folder). Matching ignores case, accents, punctuation and a leading "The". Photos are imported into the database, so pages load without reading the disk.
- **Search and filters**: full-text search across title, artist, album and genre, with artist, album, year, genre and favourites filters, sortable columns and live suggestions in the search box.
- **Player**: streams in the browser with seeking, volume, shuffle, keyboard shortcuts (Space, arrow keys) and an optional crossfade. It remembers the track, position and queue when you come back.
- **Now Playing queue**: shows what's coming up for any source (playlist, Tracks tab, album, Shuffle All, Rediscover, Radio, History). Play next, add to queue, remove and drag to reorder.
- **Shuffle All, Rediscover and Radio**: shuffle the whole library, favour tracks you haven't played for a while, or start a radio from any track using similar artists from Last.fm (or the same genre and artist without it).
- **Artist and album pages**: albums, tracks and cover art, plus a Last.fm bio, tags, similar artists and listener stats when a Last.fm key is set.
- **Playlists**: create, rename, reorder, import and export `.m3u`/`.m3u8`, add several tracks at once, smart playlists that update from a saved search, and one-click playlists by artist, genre, year or decade (smart or fixed, all tracks or a random pick).
- **Favourites, play counts and history**: a full play log with a 7-day recap and "On this day" from earlier years.
- **Last.fm scrobbling** (optional): connect your account in Settings to scrobble what you play.
- **Health and Stats tabs**: missing tags, missing cover art and photos, scan errors and possible duplicates, plus totals and breakdowns by decade, year, genre, artist and album.
- **Backups**: one click downloads a consistent copy of the database.
- **Sign-in**: one username and password, sessions that survive a restart, and a lockout after 10 wrong passwords in 15 minutes. A rotating mosaic of your artist photos and covers sits behind the sign-in page.
- **Health check**: `GET /healthz` for Docker, Portainer and uptime monitors.

## 📋 Requirements

- Docker with Docker Compose v2 (Docker Desktop on Windows, or Docker Engine on Linux or a NAS)
- Your music folders and artist pictures folder reachable from the Docker host
- Optional: a free [Last.fm API account](https://www.last.fm/api/account/create) for artist info, Radio and scrobbling
- To run without Docker: Node.js 22.12 or later

## 📦 Installation

The compose file is made for a shared Docker folder: one main `.env` next to `docker-compose.yml` that names your folders, and a separate `.env` for each app. The main `.env` needs:

```
ENV=E:/Docker/env          # folder holding one subfolder per app, each with its .env
CONFIGS=E:/Docker/configs  # folder holding one data subfolder per app
MUSIC=D:                   # music root
MP3_ARTIST_PICS=D:/Music/Artist Pictures
```

Compose reads `${...}` values only from that main `.env`, never from the app's own `.env`.

1. Put `docker-compose.yml` from this repository in your Docker folder (or add its `mp3-library` service to the compose file you already have), and set the four values above in the main `.env`.
2. Copy `.env.example` to `<ENV>/mp3-library/.env` and fill it in (see Configuration below). At minimum set `APP_USERNAME`, `APP_PASSWORD` and `SESSION_SECRET`.
3. Start it from the Docker folder:

   ```
   docker compose up -d mp3-library
   ```

   This pulls `jason4bury/mp3-library` from Docker Hub. To build the image yourself, run `docker build -t jason4bury/mp3-library .` in this repository first.
4. Open `http://<your-server>:3000` and sign in. The first scan starts on its own.

Your music is read from `<MUSIC>/main` and `<MUSIC>/soundtracks`. Change those two volume lines in `docker-compose.yml` if your folders are elsewhere.

**Updating:** `docker compose pull` then `docker compose up -d`. The database is upgraded in place on start-up; nothing needs rescanning.

## 🚀 Usage

- **Rescan** in the top bar picks up new, changed and removed files. Progress shows next to it.
- Click **▶** on a track to play it. Clicking elsewhere on a row never starts playback, so you can select, browse and open links safely.
- **⬇ Backup** downloads the database as a `.db` file. Keep it somewhere other than the music disk. It holds your Last.fm session if you connected scrobbling, so keep it private.
- **⚙ Settings** has Last.fm scrobbling and crossfade. **About** shows the version, licence and a link to this repository.

### If a scan finds no files

The app can't see anything at the paths you gave it. Check the mount from inside the container:

```
docker compose exec mp3-library ls -la /music/collection1
```

If that's empty, check `MUSIC` in the main `.env` and the music volume lines in `docker-compose.yml`. On Windows with Docker Desktop's older Hyper-V backend, also check the drive is shared under Settings > Resources > File sharing (the WSL 2 backend shares all drives).

## ⚙️ Configuration

The app's settings live in `<ENV>/mp3-library/.env`, which the compose file passes to the container with `env_file`. Keep it out of Git; `.env.example` shows every setting.

| Setting | Required | What it does |
| --- | --- | --- |
| `MUSIC_DIR` | | Music folders as the container sees them, comma-separated |
| `APP_USERNAME`, `APP_PASSWORD` | Yes | The sign-in account |
| `SESSION_SECRET` | Yes | Random string of 32+ characters that signs session cookies |
| `LASTFM_API_KEY` | | Last.fm artist and album info, and similar-artist Radio |
| `LASTFM_API_SECRET` | | With the key, lets you connect scrobbling in Settings |

The app refuses to start if the sign-in settings are missing or still the example values, and says which one in `docker compose logs mp3-library`.

The host port (`3000`), and `PORT`, `ARTIST_PICTURES_DIR` and `DATA_DIR` inside the container, are fixed in `docker-compose.yml`. The music, artist pictures and data folders are set in the main `.env`, not here.

**One music folder only?** Delete the `collection2` volume line in `docker-compose.yml` and set `MUSIC_DIR=/music/collection1` in the app's `.env`. More than two? Add a `/music/collection3` volume line and append `/music/collection3` to `MUSIC_DIR`.

### Where data is stored

The database (`library.db`: tracks, cover art, artist photos, playlists, favourites, history, Last.fm cache and sessions) is in the container's `/data` folder, which is `<CONFIGS>/mp3-library` on the host. It survives rebuilds and updates. The app never writes to your music or pictures folders.

### Putting it on the internet

- Put it behind a reverse proxy with HTTPS (Nginx Proxy Manager, Caddy, Traefik, Synology) rather than forwarding the port from your router. The session cookie is marked secure automatically when the proxy forwards HTTPS.
- Use a strong `APP_PASSWORD` and a random `SESSION_SECRET`.
- If you only need it yourself, a WireGuard or Tailscale tunnel avoids exposing it at all.

### Running without Docker

Install Node.js 22.12+, run `npm ci --omit=dev`, set `MUSIC_DIR`, `ARTIST_PICTURES_DIR` and `DATA_DIR` in `.env` to real paths on that machine and start it with `npm start`. It listens on port 3000 unless `PORT` is set.

### Project layout

```
server/
  index.js               Express app, start-up checks, sessions, security headers
  auth.js                sign-in, sign-out and lockout
  db.js                  SQLite schema and migrations
  scanner.js             scans the music folders and reads tags
  artistPhotos.js        matches and imports artist photos
  lastfm.js              Last.fm info, cache and scrobbling
  loginBackground.js     picks the sign-in page mosaic
  loginPage.js           renders the sign-in page with the mosaic
  sqliteSessionStore.js  keeps sessions in SQLite
  search.js              full-text search query builder
  version.js             shows package.json's version as v1.00
  routes/api.js          every /api endpoint
public/                  the browser app (index.html, login.html, css/, js/app.js, icons)
assets/                  icon and README image
docs/                    history before v1.00
```

Run `npm run lint` (ESLint) before committing.

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md). Changes before v1.00 are in [docs/HISTORY-before-1.00.md](docs/HISTORY-before-1.00.md).

## 📄 Licence

MIT, see [LICENSE](LICENSE). Copyright (c) 2026 Jason Rhodes.
