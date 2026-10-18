FROM node:22.17.0-bookworm-slim

COPY --from=docker.io/cloudflare/sandbox:0.10.3 /container-server/sandbox /sandbox

WORKDIR /opt/sz-runtime
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/sz-runtime/browsers

COPY runtime/package.json ./package.json
COPY runtime/package-lock.json ./package-lock.json
RUN npm ci --ignore-scripts --no-audit --no-fund \
  && node node_modules/playwright-core/cli.js install --with-deps chromium --only-shell \
  && npm cache clean --force

COPY runtime/pack-artifact.mjs ./
COPY runtime/check-project.mjs ./
COPY runtime/validation-profile.json ./
COPY runtime/playtest.mjs runtime/gameplay.mjs runtime/check-objectives.mjs ./
COPY runtime/execution-observation.generated.mjs ./
COPY runtime/python-inspect.mjs ./
COPY runtime/python-playtest.mjs runtime/python-playtest.generated.mjs ./
COPY runtime/python-browser-resources.mjs ./
COPY runtime/portable-path.generated.mjs ./

RUN mkdir -p /workspace/builds \
  && chown -R node:node /workspace \
  && chmod -R a-w /opt/sz-runtime

USER node
WORKDIR /workspace
EXPOSE 3000
ENTRYPOINT ["/sandbox"]
