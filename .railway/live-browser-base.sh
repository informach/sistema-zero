#!/bin/bash
set -euo pipefail
# Base sem dados de aula, credenciais ou processo de captura em execução.
install -d -m 755 /opt/live-browser
install -m 755 "$(node -p 'process.execPath')" /opt/live-browser/node
npm install --prefix /opt/live-browser --ignore-scripts --no-audit --no-fund playwright@1.62.1
PLAYWRIGHT_BROWSERS_PATH=/opt/live-browser/browsers /opt/live-browser/node_modules/.bin/playwright install --with-deps chromium
id recorder >/dev/null 2>&1 || useradd --create-home --uid 1001 recorder
