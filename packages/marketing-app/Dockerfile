# Imagem do @sistemazero/marketing-app (Next.js 16, output standalone).
# IMPORTANTE: o contexto de build é a RAIZ do monorepo (workspace bun: @sistemazero/ui).
# O runtime é NODE (não Bun): `next build`/`next start` sob o runtime do Bun não é
# suportado oficialmente — o bun entra SÓ p/ instalar o workspace (bun.lock).

FROM node:22-bookworm-slim AS build
# Binário do bun emprestado da imagem oficial (instalação do workspace).
COPY --from=oven/bun:1 /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile
ENV NODE_ENV=production
# Build PACKAGE-LOCAL com runtime Node (gotcha do monorepo: `--filter` da raiz
# quebra a resolução do React nos workers de static-export — ver CLAUDE.md do admin).
RUN cd packages/marketing-app && npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# Railway injeta $PORT em runtime; fallback p/ a porta canônica do marketing-app.
ENV PORT=3012
# `::` p/ a rede privada IPv6 do Railway (mesma lição do HOST :: dos serviços Bun).
ENV HOSTNAME=::
# O standalone espelha a árvore do monorepo (outputFileTracingRoot = raiz):
# server.js fica em packages/marketing-app/, com o node_modules traçado na raiz.
COPY --from=build /app/packages/marketing-app/.next/standalone ./
COPY --from=build /app/packages/marketing-app/.next/static ./packages/marketing-app/.next/static
COPY --from=build /app/packages/marketing-app/public ./packages/marketing-app/public
# Launcher com fail-fast de env (em prod o Next NÃO roda o register() da
# instrumentation no boot — ver comentário no próprio script).
COPY --from=build /app/packages/marketing-app/scripts/boot-check.mjs ./packages/marketing-app/boot-check.mjs
# Cache do otimizador de imagens do Next: a árvore é copiada como root e o
# processo roda como `node` — sem isso todo next/image loga EACCES em prod.
RUN mkdir -p packages/marketing-app/.next/cache && chown -R node:node packages/marketing-app/.next
USER node
EXPOSE 3012
CMD ["node", "packages/marketing-app/boot-check.mjs"]
