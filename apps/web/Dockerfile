FROM node:22-alpine AS build

WORKDIR /app

RUN corepack enable \
 && corepack prepare pnpm@10.33.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/package.json

# BuildKit cache mount keeps the pnpm store between builds.
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    --mount=type=cache,target=/root/.cache/node/corepack \
    pnpm install --frozen-lockfile --filter web

COPY apps/web ./apps/web

ARG VITE_API_URL=/api
ARG VITE_APP_MODE=production
ARG VITE_IT_SUPPORT_URL=
ARG VITE_IT_SUPPORT_EMAIL=
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_APP_MODE=${VITE_APP_MODE}
ENV VITE_IT_SUPPORT_URL=${VITE_IT_SUPPORT_URL}
ENV VITE_IT_SUPPORT_EMAIL=${VITE_IT_SUPPORT_EMAIL}

WORKDIR /app/apps/web
RUN pnpm build

FROM nginx:1.27-alpine

RUN apk add --no-cache wget tini \
 && rm -rf /usr/share/nginx/html/*

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

# nginx runs as non-root via nginx user (built into image)

EXPOSE 5173

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://localhost:5173/ || exit 1

ENTRYPOINT ["tini", "--"]
CMD ["nginx", "-g", "daemon off;"]
