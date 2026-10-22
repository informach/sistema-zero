# syntax=docker/dockerfile:1.20.0
# Contexto: raiz do monorepo. Bun 1.4.4 preserva a versão observada no deploy
# anterior de oven/bun:1; o digest impede que um novo build troque o runtime.
FROM oven/bun:1.4.4@sha256:1d22548f177f4ff38e0c15baa3c2c46c6c2060ba2d1bc573bb4720b407548f1d AS base
WORKDIR /app
ENV NODE_ENV=production

FROM base AS dependencies
COPY package.json bun.lock ./
# O lock congelado exige todos os manifests reais, mas o filtro instala apenas
# Auth e suas dependências. Nenhuma fonte de outro workspace entra neste estágio.
COPY --parents packages/*/package.json ./
COPY patches ./patches
RUN bun install --frozen-lockfile --production --filter @sistemazero/auth \
    && mkdir -p packages/auth/node_modules packages/core/node_modules

FROM base AS runtime
# Copiar node_modules inteiro desta instalação filtrada conserva os links/store
# do Bun, inclusive as dependências nativas do drizzle-kit operacional.
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/packages/auth/node_modules ./packages/auth/node_modules
COPY --from=dependencies /app/packages/core/node_modules ./packages/core/node_modules
COPY package.json tsconfig.base.json ./
COPY packages/auth/package.json packages/auth/tsconfig.json packages/auth/drizzle.config.ts ./packages/auth/
COPY packages/auth/src ./packages/auth/src
COPY packages/auth/scripts/seed-admin.ts packages/auth/scripts/backfill-default-profiles.ts ./packages/auth/scripts/
COPY packages/core/package.json packages/core/tsconfig.json ./packages/core/
COPY packages/core/src ./packages/core/src
# O controlador de releases pode iniciar a mesma imagem em manutenção, sem
# importar o Auth nem iniciar seus jobs. O CMD normal permanece inalterado.
COPY scripts/release/start.mjs ./scripts/release/start.mjs

EXPOSE 3002
USER bun
CMD ["bun", "run", "--filter", "@sistemazero/auth", "start"]
