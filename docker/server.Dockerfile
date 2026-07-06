FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY server/package.json ./server/

RUN npm install

COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY server ./server

RUN npm run build --workspace=@matchmind/shared
RUN npm run build --workspace=@matchmind/server

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY server/package.json ./server/

RUN npm install --omit=dev --workspace=@matchmind/server --workspace=@matchmind/shared

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/server/dist ./server/dist

EXPOSE 3001

CMD ["node", "server/dist/index.js"]
