FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN echo "=== BUILDER /app ===" && ls -la /app
RUN echo "=== BUILDER /app/dist ===" && ls -la /app/dist || true
RUN echo "=== BUILDER dist files ===" && find /app/dist -maxdepth 3 -type f || true


FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
RUN echo "=== RUNNER /app ===" && ls -la /app
RUN echo "=== RUNNER /app/dist ===" && ls -la /app/dist || true
RUN echo "=== RUNNER dist files ===" && find /app/dist -maxdepth 3 -type f || true

EXPOSE 3000

CMD ["node", "dist/main.js"]