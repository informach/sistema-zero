# Imagem do serviço @sistemazero/api-gateway.
# IMPORTANTE: o contexto de build é a RAIZ do monorepo (não esta pasta), pois o
# Bun precisa do workspace inteiro para instalar as dependências (inclui @sistemazero/core).
FROM oven/bun:1

WORKDIR /app
ENV NODE_ENV=production

# Copia o workspace (o .dockerignore exclui node_modules/.git/.env etc.).
COPY . .

# Instala exatamente o que está no lockfile.
RUN bun install --frozen-lockfile

# Documental: o app escuta em env.PORT (o Railway injeta $PORT em runtime).
EXPOSE 3000

# Roda como usuário sem privilégios (a imagem oven/bun já provê o usuário `bun`).
USER bun

CMD ["bun", "run", "--filter", "@sistemazero/api-gateway", "start"]
