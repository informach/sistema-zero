# Imagem do palco de gravação @sistemazero/palco-gravacao (Next.js 16, output standalone), só no
# staging. Mesma receita do community-kids, cujo código o palco monta: contexto de build na RAIZ
# do monorepo, bun só para instalar o workspace, runtime Node.

FROM node:22-bookworm-slim AS build
COPY --from=oven/bun:1 /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile
ENV NODE_ENV=production
# O verificador TypeScript passa pelo código do Kids inteiro: a mesma folga de memória do Kids.
ENV NODE_OPTIONS=--max-old-space-size=4096
ARG RAILWAY_GIT_COMMIT_SHA
RUN cd packages/palco-gravacao && npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3010
ENV HOSTNAME=::
COPY --from=build /app/packages/palco-gravacao/.next/standalone ./
COPY --from=build /app/packages/palco-gravacao/.next/static ./packages/palco-gravacao/.next/static
COPY --from=build /app/packages/palco-gravacao/public ./packages/palco-gravacao/public
# O mesmo fail-fast de ambiente dos apps do aluno (JWT, gateway, emissor), antes do server.js.
COPY --from=build /app/packages/member-shell/scripts/boot-check.mjs ./packages/palco-gravacao/boot-check.mjs
RUN mkdir -p packages/palco-gravacao/.next/cache && chown -R node:node packages/palco-gravacao/.next
COPY --from=build /app/scripts/release/start.mjs ./scripts/release/start.mjs
USER node
EXPOSE 3010
CMD ["node","scripts/release/start.mjs","packages/palco-gravacao/boot-check.mjs"]
