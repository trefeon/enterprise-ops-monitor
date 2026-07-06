FROM node:22-alpine AS deps

WORKDIR /app

RUN apk add --no-cache postgresql-client && corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
RUN pnpm install --frozen-lockfile --prod --filter api

FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache postgresql-client tini \
 && addgroup -g 1001 -S eom \
 && adduser -S eom -u 1001 -G eom

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY apps/api ./apps/api

RUN mkdir -p /backups /agent_updates \
 && chown -R eom:eom /app /backups /agent_updates

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
