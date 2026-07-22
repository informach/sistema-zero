FROM node:22.17.0-bookworm-slim

COPY --from=docker.io/cloudflare/sandbox:0.10.3 /container-server/sandbox /sandbox

WORKDIR /opt/sz-runtime

COPY runtime/package.json ./package.json
RUN npm install --ignore-scripts --no-audit --no-fund \
  && npm cache clean --force

COPY runtime/inline-preview.mjs ./inline-preview.mjs

RUN mkdir -p /workspace/builds \
  && chown -R node:node /workspace /opt/sz-runtime

USER node
WORKDIR /workspace
ENTRYPOINT ["/sandbox"]
