FROM node:22-alpine AS deps

WORKDIR /app

RUN apk add --no-cache postgresql-client \
 && corepack enable \
 && corepack prepare pnpm@10.33.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json

# BuildKit cache mount keeps the pnpm store between builds (huge speedup on
# repeat deploys: installs become link-only). Corepack cache avoids re-download.
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    --mount=type=cache,target=/root/.cache/node/corepack \
    pnpm install --frozen-lockfile --prod --filter api

FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache postgresql-client tini \
 && addgroup -g 1001 -S eom \
 && adduser -S eom -u 1001 -G eom

# COPY --chown sets ownership at copy time — avoids a separate `chown -R`
# pass over tens of thousands of node_modules files (multi-minute on HDDs).
COPY --chown=eom:eom --from=deps /app/node_modules ./node_modules
COPY --chown=eom:eom --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --chown=eom:eom apps/api ./apps/api

RUN mkdir -p /backups /agent_updates \
 && chown eom:eom /backups /agent_updates

USER eom

WORKDIR /app/apps/api

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1));"

ENTRYPOINT ["tini", "--"]
CMD ["node", "startup.js"]
