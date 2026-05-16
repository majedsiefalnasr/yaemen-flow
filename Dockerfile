# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install deps first (layer cache)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
# The server bundle externalises several packages (h3-v2, @tanstack/*, react…)
# so production node_modules must be present at runtime.
FROM node:22-alpine

WORKDIR /app

# Re-install only production deps (faster than copying all of node_modules)
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev

# Copy the build artefacts and server adapter
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server-railway.mjs ./server-railway.mjs

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server-railway.mjs"]
