FROM node:22-alpine AS build

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install --frozen-lockfile --filter web

COPY apps/web ./apps/web

ARG VITE_API_URL=/api
ARG VITE_IT_SUPPORT_URL=
ARG VITE_IT_SUPPORT_EMAIL=
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_IT_SUPPORT_URL=${VITE_IT_SUPPORT_URL}
ENV VITE_IT_SUPPORT_EMAIL=${VITE_IT_SUPPORT_EMAIL}

WORKDIR /app/apps/web
RUN pnpm build

FROM nginx:1.27-alpine

RUN apk add --no-cache wget

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 5173

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q -O /dev/null http://localhost:5173/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
