FROM oven/bun:1.3.11 AS dependencies
WORKDIR /build
COPY packages/live-recorder/package.json ./package.json
RUN bun install --production

FROM mcr.microsoft.com/playwright:v1.62.1-noble
USER root
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates gosu tini && rm -rf /var/lib/apt/lists/*
COPY --from=dependencies /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app
COPY --from=dependencies /build/node_modules ./node_modules
COPY packages/live-recorder/package.json ./package.json
COPY packages/live-recorder/src ./src
COPY packages/live-recorder/entrypoint.sh /usr/local/bin/live-recorder-entrypoint
RUN chmod 755 /usr/local/bin/live-recorder-entrypoint && mkdir -p /data/live-recorder && chown -R pwuser:pwuser /app /data/live-recorder
# O volume Railway é montado depois do build e pertence a root. O entrypoint
# prepara apenas o diretório de dados e troca para pwuser antes de iniciar Bun.
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
EXPOSE 3017
ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/live-recorder-entrypoint"]
CMD ["bun", "src/server.ts"]
