# Evidências da análise Flute × marketing

Data: 15/10/2026. Proposta: [aproveitamento no marketing](../../docs/plans/2026-10-15-flute-aproveitamento-marketing.md).

## Escopo e identificação

- Raiz analisada: `C:\Users\tocha\Downloads\flute-main\flute-main`.
- Manifesto: `@webprodigies/flute`, versão local 0.1.2, licença MIT.
- Cópia sem diretório `.git`; não foi possível atribuir um commit à pasta baixada. A versão do manifesto não comprova identidade com o pacote publicado.
- Inventário: 40 arquivos `.ts`/`.tsx` em `src`, 3.897 linhas; 29 arquivos de teste `.test.ts`, `.test.tsx`, `.test.mjs` e `.spec.ts` em `tests`.
- Node observado: 24.15.0. npm: 11.12.1. Playwright do projeto: 1.58.2. Chromium requerido: revisão 1208, Chrome for Testing 145.0.7632.6.
- FFmpeg disponível: `N-123778-g3b55818764-20260331`.

Hashes SHA-256 do snapshot consultado:

| Arquivo | SHA-256 |
| --- | --- |
| `package.json` | `E5FAFFA55A8A75B91465DD5E484974E66AA0D7707215866D3A4920846F9F336E` |
| `package-lock.json` | `9BC478215C6FB87549DF2D4114C5BC136D5F09BE0CF622300097E2A25D46CBCF` |
| `src/core/motion.ts` | `2875535AE2D630FF155FA5F1A64D987EBA4C3B4A5AE46E4F8AED4CFC39FB4116` |
| `src/export/services.ts` | `9044B6B340F7FCDFCD9E92937190696A5AF527369B5102CF8534AAA5A3612CD5` |

Não houve alteração no código-fonte dos aplicativos ou do Flute. A verificação criou `node_modules`, saídas de build/testes na cópia baixada e instalou a versão de Chromium solicitada pelo Playwright no cache do usuário. Relatórios foram escritos nesta pasta e a proposta em `docs/plans`. Nenhuma chamada de IA do produto, publicação ou importação de acervo foi executada. As alterações preexistentes do workspace foram preservadas.

## Execuções e resultados

Os totais abaixo pertencem a execuções diferentes e não devem ser somados como se fossem testes distintos.

| Execução | Resultado observado |
| --- | --- |
| `npm ci --ignore-scripts --no-audit --no-fund` | 158 pacotes instalados; scripts de instalação desabilitados |
| `npm run typecheck` | Concluiu sem diagnóstico TypeScript |
| `npm run test:architecture` | Checker estático passou; testes Node: 141 passaram, 1 falhou ao criar symlink com `EPERM` |
| `npx vitest run tests/core tests/react tests/project tests/preview tests/cli tests/export --reporter=dot` | 24 arquivos; 408 testes passaram, 21 falharam; duração reportada 28,71 s |
| `npm run build:test` | Build de fixtures concluído |
| `npm run build:library` | Bundle da biblioteca e declaração de tipos concluídos |
| `npx playwright install chromium` | Instalados Chromium e headless-shell 1208, antes ausentes |
| `npx vitest run tests/project/commands.test.ts tests/project/recipes.test.ts --maxWorkers=1 --reporter=json --outputFile=...` | 88 passaram, 10 falharam em 98; ver JSON |
| `FLUTE_TEST_PORT=4387 npx playwright test --reporter=line` | 8 testes de navegador passaram; duração reportada 27,8 s |
| `npx vitest run tests/export --reporter=json --outputFile=...` | 15 passaram, 2 falharam em 17; ambas falhas ocorreram na preparação de symlinks |
| `npx vitest run tests/project/commands.test.ts -t 'refuses dirty source after an interrupted write' --reporter=verbose` | 1 passou; 79 não selecionados; duração reportada 991 ms |

Artefatos preservados:

- [Resultados de projeto em JSON](project-tests.json) e [log](project-tests.log).
- [Resultados de exportação em JSON](export-tests.json) e [log](export-tests.log).
- [Testes de navegador](browser-tests.log).
- [Teste isolado de recuperação](recovery-test-isolated.log).
- [Snapshot original do exemplo plating](flute-plating-original.png), extraído do campo `snapshot.image` da receita local, sem edição. É uma miniatura pré-existente, não uma nova prova de render nem referência visual aprovada para o Sistema Zero.

### Interpretação das falhas

**Chromium ausente:** a máquina tinha outras revisões instaladas, mas o Playwright dessa cópia buscava `chromium-1208/chrome-win64/chrome.exe`. Uma chamada direta a `chromium.launch({headless:true,channel:'chromium'})` reproduziu a ausência. Instalado o navegador correto, os testes de exportação real a 30 e 120 fps, erro de captura, falta de encoder e cancelamento passaram. A leitura do schema também confirma suporte a 60 fps, mas os dois casos parametrizados de exportação dessa suíte usam 30 e 120.

**Symlinks:** o processo Windows recebeu `EPERM` ao preparar arquivos/diretórios simbólicos. Isso impede testar aqueles cenários; não demonstra que o código aceitou um caminho proibido. Não foram elevadas permissões nem enfraquecidas verificações.

**Ocorrências transitórias:** o teste de espera da atualização do dev server excedeu 5 segundos na bateria inicial; não falhou na repetição dirigida. O teste de recuperação após escrita interrompida falhou no relatório de projeto com `STACK_TRACE_ERROR`, mas passou isoladamente sem mudança de código. A causa de ambas as ocorrências não foi estabelecida; registrar como instabilidade observada, não como defeito corrigido.

Não foram executados benchmarks de GPU, `verify:release`, publicação npm, matriz completa de instalações Next/Vite/React, integração com Electron do Sistema Zero ou cenas reais do nosso Studio. Não foram alterados testes para obter aprovação.

## Mapa de evidências do Flute

Os caminhos abaixo são relativos à raiz externa identificada acima. As linhas ajudam a localizar o trecho no snapshot consultado.

| Tema | Arquivo / localização | Evidência |
| --- | --- | --- |
| Composição real | `src/react/index.tsx:61` | Props de `Scene`, tempo externo, camera/focus e composição React |
| Fundo preto | `src/core/scene.ts:4`; `src/react/index.tsx:189` | Constante e sobrescrita do fundo no renderer |
| Velocidade e duração | `src/core/motion.ts:87`, `:177`, `:204` | Padrão 0,5, conversão do tempo e duração de apresentação |
| Tempo do conteúdo | `src/react/index.tsx:329`; `src/core/authoring.ts:76` | `useSceneTime`; conteúdo precisa optar por consumir o relógio |
| Foco progressivo | `src/core/spatial.ts`; `src/react/FocusFilter.tsx` | Cálculo puro de profundidade e composição de filtros SVG |
| Receita | `src/core/recipes.ts:35` | Schema de receita, identidade e vínculo a JSX/TSX |
| Guia da IA | `src/core/authoring.ts` | Conceitos, capacidades, exemplo executável e diagnóstico, sem executar agente |
| Catálogo limitado | `src/preview/modules.tsx:21`; `src/project/discovery.ts:16` | 256 módulos/entradas, correspondendo a até 128 pares usuais |
| Carregamento de módulos | `src/preview/modules.tsx:22` | Carrega todos os módulos fornecidos ao entrar no catálogo; cartões usam imagens |
| Enquadramento | `src/preview/ScenePreview.tsx:103` | `Math.max` para preenchimento com crop |
| Preservação da prévia | `src/preview/session.ts` | Última definição válida, tempo em memória e pausa após mudança |
| Captura explícita | `src/react/capture.ts` | Uma ponte por página, `seek` e rejeição de cena inválida |
| Limites de export | `src/core/export.ts:9` | Loopback, formato MP4, fps, dimensões pares e duração máxima |
| Sessão do navegador | `src/export/services.ts:42` | Página nova sem importação da sessão do usuário |
| Alcance da guarda de rede | `src/export/services.ts:47` | Restrição aplicada a `isNavigationRequest`, não a toda requisição |
| Prontidão | `src/export/services.ts:58` | Espera fontes/imagens, ignorando rejeição de `image.decode` |
| Vídeo sem áudio | `src/export/services.ts:94` | FFmpeg com `-an`, PNG por pipe e codec H.264 |
| Quadros sequenciais | `src/export/services.ts:106` | `seek` e screenshot por frame |
| Snapshot | `src/export/commands.ts:45` e `:56` | Conferência de receita antes da escrita; não é hash completo de todos os insumos visuais |
| Proteção de caminhos | `src/project/services.ts` | Escopo, recusa de symlink, leitura limitada e comparação antes de escrita |
| Separação de camadas | `scripts/check-architecture.mjs:33` | Regras de dependência por camada e AST |
| Integração de desenvolvimento | `src/project/portable.ts`; `src/project/vite.ts` | Wrappers e rotas de preview, com exclusão por condição de build |
| Publicação sem testes hospedados | `.github/workflows/publish.yml:41`; `README.md` | Workflow builda/publica; verificações de release ficam locais |
| Direitos de reutilização | `LICENSE` | MIT; preservação do aviso e licença nas cópias/partes substanciais |

## Mapa de evidências do Sistema Zero

| Fonte | Conclusão usada |
| --- | --- |
| `docs/superpowers/plans/2026-10-15-marketing-desktop-colaborativo-lotes.md:1` | L0 ainda em validação; L1–L11 pendentes |
| Mesmo plano, seção L6, linha 215 | Demonstrações, composição, gravação, cortes, áudio e legendas já fazem parte da primeira liberação |
| `docs/plans/2026-10-15-marketing-desktop-l0-evidencias.md` | Provas reais de texto, imagem e render; limitações explícitas de login inicial e colaboração |
| `packages/marketing-production/src/story.ts` | Schema de composição e patch restrito, sem timeline completa |
| `packages/marketing-production/src/story-composition.tsx` | Composição já usa frame do Remotion e clipe com áudio configurável |
| `packages/marketing-desktop/src/main/render-worker.ts` | Render Remotion local em processo de trabalho, com cancelamento |
| `packages/marketing-desktop/src/main/preload.ts` | Ponte de operações específicas; não shell genérico |
| `packages/marketing-desktop/README.md` | Bancada local sem biblioteca durável, sincronização ou publicação |
| `packages/marketing/CLAUDE.md`; `packages/marketing-app/CLAUDE.md` | Base backend/BFF, identidade, publicação e mídia a preservar; trechos históricos conferidos contra plano atual |
| `packages/funnel/src/funnels/registry.ts` | Registro dos produtos kids e pro; não foi inferida nova oferta |
| `packages/studio/src/official-extensions/game-2d-advanced/runtime.ts:245`, `:828`, `:4388` | Tempo próprio e `requestAnimationFrame` no runtime 2D |
| Produção P07, `apoio/v3/fontes-e-producao.md:17` | Diferença controlada entre variantes, ações e estados capturados |
| Produção P08, `apoio/fontes-e-producao.md` | Proveniência de asset, código, runtime, bloco e resultado real da batalha |

## Consultas oficiais complementares

A análise funcional é do snapshot local, não uma inferência a partir do README público. As consultas oficiais serviram para conferir identidade e compatibilidade conceitual:

- [Repositório Flute](https://github.com/webprodigies-org/flute): descrição pública e instalação React DOM.
- [Compartilhamento de composição no Remotion](https://www.remotion.dev/docs/player/integration): uma composição para prévia e render, com configurações de bundler próprias.
- [Frame atual](https://www.remotion.dev/docs/use-current-frame): relógio explícito da composição.
- [Animação de propriedades](https://www.remotion.dev/docs/animating-properties): animação orientada por frame.

A ligação de `Scene.timeMs` ao frame do Remotion é uma proposta deduzida das APIs lidas. Não é integração certificada pelos autores nem prova realizada nesta sessão.
