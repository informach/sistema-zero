# Qualificação isolada do executor de testes do Estúdio

Base: `63f27049a923302d904a88df6607a96510689532`. Branch de investigação:
`estudio-missao-playwright-164-20261119`. Não integrada à staging.

## Motivo e separação de causas

O Playwright 1.60.0 apresentou rejeição não tratada ao fechar um diálogo
`beforeunload`: `Page.handleJavaScriptDialog: No dialog is showing`. O SDK e
seu Chromium instalado eram da mesma distribuição; não havia incompatibilidade
local entre essas versões. O servidor de diálogos do upstream 1.64.1 trata
o fechamento concorrente. Referências primárias:

- https://raw.githubusercontent.com/microsoft/playwright/v1.60.0/packages/playwright-core/src/server/dialog.ts
- https://raw.githubusercontent.com/microsoft/playwright/v1.64.1/packages/playwright-core/src/server/dialog.ts

Isso não demonstra a causa da falha intermitente dos menus. Na execução Linux
44553378086, o registro de eventos mostra que o clique destinado a Colar foi
recebido pelo documento da prévia. O contextmenu anterior estava cancelado
com `defaultPrevented: true`. Não foi aplicado ajuste de z-index, atraso,
clique forçado ou repetição automática para ocultar essa falha.

## Experimento

Apenas as duas dependências de desenvolvimento do Estúdio foram fixadas em
1.64.1. O aplicativo servido é o mesmo build estático da base integrada,
na porta 5347. Os navegadores do experimento usam um cache próprio, sem
substituir os navegadores das outras sessões. A resolução anterior do Molda
foi preservada, removendo somente três entradas aninhadas que a instalação
filtrada tinha atualizado incidentalmente. O Bun 1.3.11 validou o lockfile
com `install --frozen-lockfile --ignore-scripts --lockfile-only`; o diff
resultante contém apenas os pins e entradas do SDK do Estúdio.

Observação opcional pelo CDP: `STUDIO_NATIVE_INPUT_TRACE=1`, Chromium somente.
`STUDIO_MENU_CAPTURE=0` desativa os observadores DOM para comparar a entrega
nativa de entrada. A captura tem recibo de perda/truncamento e limite de
8 MiB; não altera os eventos, o foco ou a aplicação. Não constitui medida
de desempenho do produto.

## Resultados locais já observados

Sem retries, no Windows, com o mesmo aplicativo:

| Fluxo | Resultado |
| --- | --- |
| Três cenários de recarga/salvamento, 12 repetições | 36 passaram, 4,4 min |
| Colagem no Canvas 3D, 12 repetições | 12 passaram, 2,3 min |
| Fluxo de aprendizado CSS, 12 repetições | 12 passaram, 2,1 min |
| Segurança/execução/recarga nos motores configurados | 21 passaram, 3,9 min |

Evidências locais em `packages/studio/.cache/mission/playwright-164-*`.
Essas repetições não comprovam a eliminação do defeito intermitente Linux.
A sequência dos três motores passou sem retries: execução e CSP no Chromium
e Firefox, programas hostis no Chromium e recarga no Chromium e WebKit.
Isso não representa a suíte completa de programas hostis em todos os motores.
A checagem completa de tipos falhou na
instalação filtrada, com módulos de outros workspaces ausentes; foi iniciada
a instalação completa congelada para reproduzir o ambiente da CI. Essa
instalação terminou com sucesso (2395 pacotes, 38,78 s); a nova checagem
completa `tsc --noEmit` terminou com código 0, sem diagnósticos. Não foram
alterados tipos ou ocultados diagnósticos para contornar essa falha.
A checagem estrita dos dois helpers passou separadamente, assim como o Biome
dos quatro arquivos E2E alterados. Após a instalação completa, a resolução
efetiva foi conferida: Estúdio 1.64.1, Molda 1.60.0.

## Pendências de integração

- Qualificar a candidata em CI Linux/Windows com os navegadores correspondentes.
- Resolver ou reproduzir com evidência suficiente a falha de menu Linux.
- Manter v4 fora da branch principal da missão enquanto seus gates falharem.

A missão global permanece aberta. Este relatório não declara concluída
a homologação dos aparelhos físicos, dos grandes jogos, do envio pelos
Members nem das demais capacidades profissionais previstas na missão.
