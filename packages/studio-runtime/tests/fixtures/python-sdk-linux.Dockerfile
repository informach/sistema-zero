FROM docker:29.8.2-cli AS docker
FROM node:24.15.0-bookworm-slim
COPY --from=docker /usr/local/bin/docker /usr/local/bin/docker
COPY --from=docker /usr/local/libexec/docker/cli-plugins/docker-buildx /usr/local/libexec/docker/cli-plugins/docker-buildx
COPY --from=docker /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
WORKDIR /proof
ENTRYPOINT ["node", "/proof/linux-runner.cjs"]
