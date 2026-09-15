# Build stage
FROM node:24-alpine AS builder

# pnpm is the canonical package manager (pnpm-lock.yaml committed; ci.yml
# installs with pnpm@10 --frozen-lockfile). npm ci cannot work here: there
# is no package-lock.json.
RUN npm install -g pnpm@10

# Husky's prepare hook has nothing to install inside a build container
ENV HUSKY=0

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY vendor/ ./vendor/
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# Production stage
FROM nginx:alpine

WORKDIR /usr/share/nginx/html

RUN rm -rf ./*
COPY --from=builder /app/dist .

COPY docker/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/index.html || exit 1
