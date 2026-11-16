# MP3 Library v1.01. Build with: docker build -t jason4bury/mp3-library:1.01 .
# Node.js is pinned to an exact version so every build is the same; bump it here on purpose.
ARG NODE_IMAGE=node:22.23.4-bookworm-slim

# --- Build stage: install production dependencies from package-lock.json ---
# better-sqlite3 needs build tools if no prebuilt binary matches the CPU architecture.
FROM ${NODE_IMAGE} AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# --- Runtime stage ---
FROM ${NODE_IMAGE}
LABEL org.opencontainers.image.title="MP3 Library" \
      org.opencontainers.image.description="Self-hosted web app for searching, playing and organising an MP3 collection" \
      org.opencontainers.image.version="1.01" \
      org.opencontainers.image.source="https://github.com/jason4bury/MP3-Library" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.authors="Jason Rhodes"
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
COPY server ./server
COPY public ./public

ENV NODE_ENV=production
EXPOSE 3000

VOLUME ["/data"]

# Backs Docker's own container health status (visible via `docker ps` / `docker inspect`, and
# what tools like Portainer show) with GET /healthz. Uses Node itself to make the request rather
# than adding curl/wget, which this slim runtime image doesn't have.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||3000)+'/healthz',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "server/index.js"]
