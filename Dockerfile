FROM node:22-slim

# better-sqlite3 собирается из исходников, если нет готового бинарника.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# База лежит в томе, чтобы история и напоминания переживали рестарт.
VOLUME ["/app/data"]
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
