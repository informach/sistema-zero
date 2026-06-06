# Imagem do serviço @sistemazero/funnel (funil de vendas — Astro SSR no Bun).
# IMPORTANTE: o contexto de build é a RAIZ do monorepo (não esta pasta), pois o
# Bun precisa do workspace inteiro para instalar as dependências (inclui
# @sistemazero/core e @sistemazero/ui).
FROM oven/bun:1

WORKDIR /app
ENV NODE_ENV=production

# Copia o workspace (o .dockerignore exclui node_modules/.git/.env etc.).
COPY . .

# Instala exatamente o que está no lockfile (inclui devDeps: drizzle-kit roda as
# migrations no pre-deploy e o astro/check participam do build).
RUN bun install --frozen-lockfile

# Build do Astro: marketing pré-renderizado + servidor SSR (dist/server/entry.mjs).
# ⚠️ As PUBLIC_* (Efí) e FUNNEL_PUBLIC_URL são INLINED AQUI no build — defina-as
# como variáveis do serviço no Railway (ficam disponíveis no build do Dockerfile).
RUN bun run --filter @sistemazero/funnel build

# Documental: o standalone escuta em HOST/PORT do ambiente (Railway injeta $PORT;
# defina HOST=:: p/ dual-stack no private networking).
EXPOSE 4321

# Roda como usuário sem privilégios (a imagem oven/bun já provê o usuário `bun`).
USER bun

# Wrapper direto (sem `bun run` no meio): garante que o SIGTERM do Railway chega
# ao processo do servidor — o wrapper drena as requisições in-flight (graceful
# shutdown) e inicializa o Sentry no boot.
CMD ["bun", "packages/funnel/scripts/start.mjs"]
