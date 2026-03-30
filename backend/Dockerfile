FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN echo "=== /app root ===" && ls -la /app
RUN echo "=== /app/src ===" && find /app/src -maxdepth 3 -type f | head -200 || true
RUN echo "=== tsconfig files ===" && ls -la /app/tsconfig* /app/nest-cli.json || true

RUN npm run build

RUN echo "=== DIST ROOT ===" && ls -la /app/dist || true
RUN echo "=== DIST FILES ===" && find /app/dist -maxdepth 5 -type f || true


FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

RUN echo "=== RUNNER DIST FILES ===" && find /app/dist -maxdepth 5 -type f || true

EXPOSE 3000

CMD ["npm", "run", "start:prod"]