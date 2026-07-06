FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY client/package.json ./client/

RUN npm install

COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY client ./client

RUN npm run build --workspace=@matchmind/shared
RUN npm run build --workspace=@matchmind/client

FROM nginx:alpine AS runner

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/client/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
