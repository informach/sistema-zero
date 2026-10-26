# O contexto continua sendo a raiz do monorepo para resolver o lockfile do workspace.
FROM oven/bun:1 AS dependencies
WORKDIR /app
COPY package.json bun.lock ./
COPY patches ./patches
COPY packages/core/package.json ./packages/core/package.json
COPY packages/catalog/package.json ./packages/catalog/package.json
# Inclui as dependências de desenvolvimento do serviço: drizzle-kit executa as migrações.
RUN bun install --frozen-lockfile --filter @sistemazero/catalog --filter @sistemazero/core
COPY packages/core ./packages/core
COPY packages/catalog ./packages/catalog

FROM oven/bun:1 AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Preserve o workspace e os links do Bun, levando só o serviço e o núcleo que ele usa.
COPY --from=dependencies /app/package.json /app/bun.lock ./
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/packages/core ./packages/core
COPY --from=dependencies /app/packages/catalog ./packages/catalog
EXPOSE 3003
USER bun
CMD ["bun", "run", "--filter", "@sistemazero/catalog", "start"]
