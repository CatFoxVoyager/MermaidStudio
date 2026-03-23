# Multi-stage build for production
FROM node:18-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=development
RUN npm run build

# Production stage
FROM nginx:stable-alpine AS production
WORKDIR /usr/share/nginx/html

# Copy built files
COPY --from=builder /app/dist .

# Copy nginx configuration
COPY docker/nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]