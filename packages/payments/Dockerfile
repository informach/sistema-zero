# O contexto continua sendo a raiz do monorepo para resolver o lockfile do workspace.
FROM oven/bun:1 AS dependencies
WORKDIR /app
COPY package.json bun.lock tsconfig.base.json ./
COPY patches ./patches
COPY packages/core/package.json ./packages/core/package.json
COPY packages/payments/package.json ./packages/payments/package.json
# Inclui as dependências de desenvolvimento do serviço: drizzle-kit executa as migrações.
RUN bun install --frozen-lockfile --filter @sistemazero/payments --filter @sistemazero/core
COPY packages/core ./packages/core
COPY packages/payments ./packages/payments

FROM oven/bun:1 AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Preserve o workspace e os links do Bun, levando só o serviço e o núcleo que ele usa.
COPY --from=dependencies /app/package.json /app/bun.lock /app/tsconfig.base.json ./
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/packages/core/package.json /app/packages/core/tsconfig.json ./packages/core/
COPY --from=dependencies /app/packages/core/node_modules ./packages/core/node_modules
COPY --from=dependencies /app/packages/core/src ./packages/core/src
COPY --from=dependencies /app/packages/payments/package.json /app/packages/payments/tsconfig.json /app/packages/payments/drizzle.config.ts ./packages/payments/
COPY --from=dependencies /app/packages/payments/node_modules ./packages/payments/node_modules
COPY --from=dependencies /app/packages/payments/src ./packages/payments/src
COPY --from=dependencies /app/packages/payments/scripts ./packages/payments/scripts
EXPOSE 3001
USER bun
CMD ["bun", "run", "--filter", "@sistemazero/payments", "start"]
