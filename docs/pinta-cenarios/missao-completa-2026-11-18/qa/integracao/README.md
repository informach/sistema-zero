# Oficinas e atualização de dependências

Provas locais em 18/11/2026, nesta máquina. `browser.json` contém dois ensaios com os
componentes reais, zero falhas ou skips. As capturas mostram o jogo executando e o programa
preservado. O perfil é sintético e as requisições de API são abortadas para ensaiar offline;
nenhuma conta autenticada ou resposta de nuvem bem-sucedida é simulada.

O primeiro caso muda a programação na Ponte, depois o mapa na outra aba e compara arquivos,
IR e blocos integralmente. O segundo edita somente a folha de peças: os mapas vinculados
recebem a colisão nova sem serem abertos no Pinta. O retorno ao foco é simulado porque o
Chromium headless mantém todas as páginas visíveis/focadas.

`dependency-red.log` é a falha esperada do segundo fluxo com o hook do commit anterior,
antes da propagação das dependências. A fonte corrigida foi guardada e restaurada com
conferência SHA-256 antes da execução verde. O teste falha porque o mapa não é reenviado.

`pinta-suite.log`: 2.104 testes, zero falhas, 24.619 verificações, incluindo recursos privados,
grafo com ciclos e contratos antigos. `pinta-typecheck.log` e `studio-typecheck.json` registram
os gates completos. A verificação Studio inclui o host real e as fixtures de integração.

Reprodução: `bunx playwright test --config playwright.pinta-integration.config.ts` no Estúdio;
`bun run typecheck` e `PYTHON=<pygame-ce instalado> bun test src scripts` no Pinta.
O servidor dedicado usa porta 5403 e guarda seus arquivos somente em `.cache`.
