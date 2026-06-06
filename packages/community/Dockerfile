# Imagem da área do aluno @sistemazero/community (Next.js 16, output standalone).
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
# quebra a resolução do React nos workers de static-export — ver CLAUDE.md).
RUN cd packages/community && npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# Railway injeta $PORT em runtime; fallback p/ a porta canônica do community.
ENV PORT=3007
# `::` p/ a rede privada IPv6 do Railway (mesma lição do HOST :: dos serviços Bun).
ENV HOSTNAME=::
# O standalone espelha a árvore do monorepo (outputFileTracingRoot = raiz):
# server.js fica em packages/community/, com o node_modules traçado na raiz.
COPY --from=build /app/packages/community/.next/standalone ./
COPY --from=build /app/packages/community/.next/static ./packages/community/.next/static
COPY --from=build /app/packages/community/public ./packages/community/public
# Launcher com fail-fast de env (em prod o Next NÃO roda o register() da
# instrumentation no boot — ver comentário no próprio script).
COPY --from=build /app/packages/community/scripts/boot-check.mjs ./packages/community/boot-check.mjs
USER node
EXPOSE 3007
CMD ["node", "packages/community/boot-check.mjs"]
