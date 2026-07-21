FROM node:20-bookworm-slim AS builder

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

FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    perl \
    poppler-utils \
    wget \
    xz-utils \
  && rm -rf /var/lib/apt/lists/* \
  && wget -qO- "https://yihui.org/tinytex/install-bin-unix.sh" | sh \
  && export PATH="$(echo /root/.TinyTeX/bin/*):${PATH}" \
  && tlmgr path add \
  && tlmgr update --self \
  && tlmgr install \
    collection-latexrecommended \
    geometry \
    enumitem \
    hyperref \
    titlesec \
    latexmk \
    moderncv \
    fontawesome5 \
    fontawesome6 \
    academicons \
    pgf \
    luatexbase \
  && tlmgr path add

ENV PATH="/root/.TinyTeX/bin/x86_64-linux:/root/.TinyTeX/bin/aarch64-linux:${PATH}"

COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY server/package.json ./server/

RUN npm install --omit=dev --workspace=@matchmind/server --workspace=@matchmind/shared

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/server/dist ./server/dist
COPY server/latex ./server/latex

EXPOSE 3001

CMD ["node", "server/dist/index.js"]
