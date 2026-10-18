FROM node@sha256:4e6b70dd6cbfc88c8157ba19aa3d9f9cce6ba4703576d55459e45efcbc9c5f5d

COPY --from=docker.io/cloudflare/sandbox:0.10.3 /container-server/sandbox /sandbox

WORKDIR /opt/language
COPY runtime/package.json runtime/package-lock.json ./
RUN npm ci --ignore-scripts --omit=dev --no-audit --no-fund \
  && npm cache clean --force
COPY dist/server.mjs ./server.mjs
RUN mkdir -p /workspace \
  && chown node:node /workspace \
  && chmod -R a-w /opt/language

USER node
WORKDIR /workspace
ENTRYPOINT ["/sandbox"]
