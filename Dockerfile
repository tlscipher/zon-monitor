FROM node:22-slim AS build

WORKDIR /app

COPY package.json yarn.lock ./
COPY prisma ./prisma/

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN yarn install --frozen-lockfile
RUN npx prisma generate

COPY src ./src
COPY tsconfig.json ./
COPY declarations.d.ts ./

RUN npx tsc

FROM debian:trixie-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=build /usr/local/bin/node /usr/local/bin/
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./
COPY data/proxies.txt ./data/proxies.txt

ENV NODE_ENV=webhook
ENV UV_THREADPOOL_SIZE=256

EXPOSE 4488

CMD ["node", "dist/index.js"]
