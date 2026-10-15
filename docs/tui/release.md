# Distribuição e atualização

`bun run build:tui` gera módulos, workers, browser Node, helper Windows pré-compilado, nativos externos fixados e manifesto SHA-256 em `packages/tui/dist`. O alvo desta release é Windows x64. O lockfile da distribuição fixa também dependências transitivas. `bun run verify:tui` copia a release para uma pasta temporária com espaços/Unicode, instala com `--frozen-lockfile --ignore-scripts` e verifica CLI, SQLite, AJV, TypeScript, renderer nativo/WASM, ConPTY e Chromium.

Instalação local, a partir da raiz do monorepo:

```powershell
bun packages/tui/dist/install.js packages/tui/dist "$env:LOCALAPPDATA\sistemazero\tui" "$env:LOCALAPPDATA\sistemazero\agent"
bun "$env:LOCALAPPDATA\sistemazero\tui\launcher.js" --help
```

O instalador mantém releases imutáveis por digest, verifica arquivos, instala dependências e testa o CLI antes de publicar o ponteiro `active.json` atomicamente. Um mutex impede instaladores concorrentes no mesmo destino. O perfil deve estar parado antes da ativação; execute `sistemazero rpc runtime.shutdown` se houver supervisor ativo. Essa exclusão também impede inicialização simultânea durante o backup e a troca.

Para atualizar, repita o comando com a nova distribuição. A versão anterior permanece disponível. Acrescente `--rollback` para selecionar a versão anterior, desde que aceite o schema atual. `bun run verify:tui:upgrade` mata um instalador durante preparação, confere que a versão ativa permaneceu intacta, verifica backup com dado real e exerce rollback/launcher fora do cwd original.

O manifesto comprova integridade local; não é assinatura de uma editora ou canal de atualização remoto. Obtenha o pacote de uma origem confiável. O instalador não instala Bun, Git, rg, Node, Docker, Chromium ou os clientes oficiais silenciosamente. Os pré-requisitos são diagnosticados separadamente. Não há publicação/push/deploy incluídos neste fluxo.
