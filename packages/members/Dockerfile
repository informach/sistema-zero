# syntax=docker/dockerfile:1.20.0
# Contexto: raiz do monorepo. Mesma base observada e fixada no Auth.
FROM oven/bun:1.4.4@sha256:1d22548f177f4ff38e0c15baa3c2c46c6c2060ba2d1bc573bb4720b407548f1d AS base

WORKDIR /app
ENV NODE_ENV=production

FROM base AS dependencies
# O lock congelado precisa dos manifests de todos os workspaces, não dos fontes.
COPY package.json bun.lock ./
COPY --parents packages/*/package.json ./
COPY patches ./patches
# "..." inclui também os contratos puros do Arquipélago, nunca o pacote do jogo.
# drizzle-kit permanece instalado para o pre-deploy real db:migrate.
RUN bun install --frozen-lockfile --production --filter '@sistemazero/members...' \
    && mkdir -p packages/members/node_modules packages/core/node_modules \
       packages/studio/node_modules packages/pinta/node_modules packages/ui/node_modules \
       packages/arquipelago-contracts/node_modules

FROM base AS runtime
# Preserva a store e os links do Bun, sem copiar o cache global do instalador.
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/packages/members/node_modules ./packages/members/node_modules
COPY --from=dependencies /app/packages/core/node_modules ./packages/core/node_modules
COPY --from=dependencies /app/packages/studio/node_modules ./packages/studio/node_modules
COPY --from=dependencies /app/packages/pinta/node_modules ./packages/pinta/node_modules
COPY --from=dependencies /app/packages/ui/node_modules ./packages/ui/node_modules
COPY --from=dependencies /app/packages/arquipelago-contracts/node_modules ./packages/arquipelago-contracts/node_modules
COPY package.json tsconfig.base.json ./
COPY packages/members/package.json packages/members/tsconfig.json packages/members/drizzle.config.ts ./packages/members/
# Inclui schema, SQL e journal das migrations, além do grafo real de inicialização.
COPY packages/members/src ./packages/members/src
COPY packages/core/package.json packages/core/tsconfig.json ./packages/core/
COPY packages/core/src ./packages/core/src
COPY packages/studio/package.json packages/studio/tsconfig.json ./packages/studio/
COPY packages/studio/src ./packages/studio/src
COPY packages/pinta/package.json packages/pinta/tsconfig.json ./packages/pinta/
COPY packages/pinta/src ./packages/pinta/src
COPY packages/ui/package.json packages/ui/tsconfig.json ./packages/ui/
COPY packages/ui/src ./packages/ui/src
COPY packages/arquipelago-contracts/package.json packages/arquipelago-contracts/tsconfig.json ./packages/arquipelago-contracts/
COPY packages/arquipelago-contracts/src ./packages/arquipelago-contracts/src
# Entradas operacionais existentes; não são executadas durante o build.
COPY packages/members/scripts/bootstrap-kids-journey.ts \
     packages/members/scripts/adopt-arquipelago-gallery.ts \
     packages/members/scripts/production-schema-a.ts \
     packages/members/scripts/pensa-maintenance.ts \
     packages/members/scripts/pensa-cutover-migrations.ts \
     packages/members/scripts/seed-adult-journey.ts \
     packages/members/scripts/seed-creator-journey.ts \
     packages/members/scripts/seed-adult-journey-production.ts \
     packages/members/scripts/adult-journey-production-seed.ts \
     packages/members/scripts/finalize-first-steps-rollout.ts \
     packages/members/scripts/rollout-molda-entitlements.ts \
     packages/members/scripts/audit-lost-studio-submissions.ts \
     packages/members/scripts/restore-studio-submissions.ts \
     packages/members/scripts/backfill-materials-block.ts \
     packages/members/scripts/rebase-lesson-draft-revisions.ts \
     packages/members/scripts/reorganize-desafio-primeiro-jogo.ts \
     packages/members/scripts/migrate-studio-project-examples.ts ./packages/members/scripts/
COPY packages/members/scripts/publish-course.ts ./packages/members/scripts/
COPY packages/members/scripts/lib ./packages/members/scripts/lib
COPY scripts/release/start.mjs scripts/release/kids-journey-bootstrap.mjs \
     scripts/release/kids-journey-targets.mjs ./scripts/release/

# Documental: o app escuta em env.PORT (o Railway injeta $PORT em runtime).
EXPOSE 3004

# Roda como usuário sem privilégios (a imagem oven/bun já provê o usuário `bun`).
USER bun

CMD ["bun","scripts/release/start.mjs","packages/members/src/index.ts"]
