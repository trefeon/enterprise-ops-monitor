FROM node:22-alpine

WORKDIR /app

RUN corepack enable \
 && corepack prepare pnpm@10.33.0 --activate

COPY package.json pnpm-lock.yaml ./

# BuildKit cache mount keeps the pnpm store between builds.
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    --mount=type=cache,target=/root/.cache/node/corepack \
    pnpm install --prod --frozen-lockfile

COPY server.js .

EXPOSE 3000

CMD ["node", "server.js"]
