FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache postgresql-client

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
RUN corepack enable && pnpm install --filter api

COPY apps/api/ ./apps/api/

WORKDIR /app/apps/api

EXPOSE 3000

CMD ["pnpm", "start"]
