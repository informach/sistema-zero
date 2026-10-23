---
status: resolved
file: packages/studio/playwright.python-editor.config.ts
line: 12
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Isolar a descoberta da suíte do editor

## Review Comment

playwright.python-editor.config.ts aponta para todo e2e-python-editor sem testMatch. A inclusão de bridge-workspace.spec.ts faz a configuração histórica descobrir também a Ponte, mas seu webServer inicia somente Vite em5298. Os testes novos dependem de configuration/distribution/project encaminhados ao runtime5297, iniciado apenas pela configuração python-bridge. A execução isolada da suíte do editor passa a falhar ou depender de um servidor externo não declarado.

Prova independente sem executar Playwright: importar a configuração e enumerar os specs retorna testMatch=undefined, candidatos source-editor.spec.ts e bridge-workspace.spec.ts, único servidor5298. Separar os matches explicitamente; a configuração da Ponte já declara seus dois servidores.

## Triage

- Decision: `VALID`
- Notes: Implementador definiu testMatch exclusivo de source-editor na configuração histórica. Revalidação independente confirmou a descoberta isolada; a configuração da Ponte pode incluir os dois specs porque declara seus dois servidores. Nenhuma implementação alterada pelo revisor.

## Verification

- Importação real das configurações via Bun: editorMatch=['source-editor.spec.ts']; bridgeMatch=/(?:bridge-workspace|source-editor)\\.spec\\.ts$/; bridgeServers=2. Assertions passam com exit0.
- Nenhum processo Playwright foi iniciado pelo revisor.
