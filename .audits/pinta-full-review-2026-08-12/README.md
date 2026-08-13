# Full review do Pinta — 2026-08-12

## Parecer executivo

**Resultado pós-correção: os seis achados foram corrigidos e cobertos por regressões; os gates isolados do Pinta estão verdes.**

O pacote isolado está tecnicamente forte: TypeScript estrito, Biome e a suíte completa passam; o playground compila; a API pública está pequena e os consumidores respeitam os entrypoints. Não encontrei import circular de runtime, arquivo de produção claramente órfão, `any`, `eval`, `dangerouslySetInnerHTML`, URL externa em shapes de imagem ou acesso direto dos consumidores aos módulos internos.

O lote implementado fecha o defeito de alta severidade do orçamento agregado, os quatro defeitos médios, o defeito baixo do modal e a janela de `objectURL`. Também adiciona as cinco fontes aprovadas — Baloo 2, Nunito, Press Start 2P, Bungee e Fredoka — com WOFF2 distribuído pelo Pinta e incorporação apenas das famílias usadas em todos os SVGs, PNGs, folhas, mapas, ZIPs e miniaturas vetoriais. As seções de achados abaixo preservam a evidência anterior à correção; o estado final está nesta abertura, nos arquivos de issue e em `qa/verification-report.md`.

### Resumo priorizado

| ID | Severidade | Prioridade | Estado | Achado |
|---|---:|---:|---:|---|
| BUG-001 | Alta | P1 | Corrigido | Galeria válida podia gerar backup que o Pinta recusava restaurar |
| BUG-002 | Média | P1 | Corrigido | Cache de miniaturas não era particionado por perfil |
| BUG-003 | Média | P2 | Corrigido | Shape oculto deslocava o conteúdo visível ao inserir outro desenho |
| BUG-004 | Média | P2 | Corrigido | Busca do seletor achatava bitmaps repetidamente no thread principal |
| BUG-005 | Média | P2 | Corrigido | Trap de foco falhava quando o foco já tinha escapado do modal |
| BUG-006 | Baixa | P3 | Corrigido | Modal fechava mesmo quando a inserção falhava |

## Escopo e método

- Escopo principal: `packages/pinta`, incluindo alterações rastreadas e arquivos ainda não rastreados presentes no working tree.
- Integrações: entrypoint raiz, subpath `studio-library`, `community-kids`, ponte Pensa → Pinta → Studio e contrato de namespace por perfil.
- Volume: 191 arquivos TS/TSX/CSS em `src`, 34.215 linhas; 125 arquivos de produção, 23.639 linhas.
- Diff rastreado do Pinta: 23 arquivos, 1.783 inserções e 96 remoções, além dos arquivos novos ainda não rastreados.
- Verificação: inspeção de grafo de imports, busca de padrões de risco, diff review, testes, cobertura, typecheck, lint, build Vite, smoke HTTP e reproduções mínimas em Bun.
- Referência de UI: [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), consultada em 2026-08-12.

## Achados

### BUG-001 — backup gerado pelo Pinta pode ser impossível de restaurar

**Severidade: Alta · Prioridade: P1 · Dados/estabilidade**

Cada shape de imagem aceita até 300.000 caracteres em `src/vector/model.ts:188` e o documento aceita até 500 shapes em `src/core/projectConfig.ts:28`. O sanitizer só aplica o teto individual (`src/vector/model.ts:261-278`); não existe orçamento agregado por asset ou galeria. `galleryToPintaJson` serializa tudo sem limitar a saída (`src/export/projectJson.ts:108-113`) e o ZIP inclui esse JSON integral (`src/export/zip.ts:182-195`), mas o restaurador recusa qualquer arquivo acima de 32 MiB antes de lê-lo (`src/components/gallery/GalleryScreen.tsx:168-174`).

Reprodução confirmada: um único asset aceito pelo sanitizer com 112 imagens no teto individual gerou 33.633.813 bytes, 79.381 bytes acima do limite de restore. O teto de 500 shapes permitiria estados muito maiores. O histórico também preserva pelo menos um snapshot mesmo acima do orçamento de 16 MB (`src/core/history.ts:20-37`), aumentando o risco de pressão de memória.

**Causa raiz:** limites locais foram definidos por shape e por arquivo de entrada, sem um orçamento serializado comum entre modelo, persistência, histórico, exportação e restauração.

**Correção recomendada:** criar uma função única de orçamento agregado, aplicada antes de commit/persistência e reutilizada no backup/ZIP; recusar a operação com feedback claro. Validar também o payload base64/assinatura PNG, pois hoje apenas prefixo e comprimento são verificados.

### BUG-002 — cache de miniaturas cruza a fronteira de perfil

**Severidade: Média · Prioridade: P1 · Isolamento/privacidade**

O contrato exige um IndexedDB por criança (`src/state/persistence.ts:7-10`), mas `thumbCache` é global e indexado apenas por `asset.id`; o stamp contém apenas `updatedAt` e, em mapas, o timestamp do tileset (`src/export/studioLibrary.ts:121-139`). `setPintaStorageNamespace` troca o banco sem limpar ou particionar o cache (`src/state/persistence.ts:27-31`).

Reprodução confirmada: perfil A e perfil B, com mesmo id/timestamp e fills vermelho/azul, produziram `sameThumb: true`; no perfil B a miniatura continuou vermelha. Colisões aleatórias de UUID são improváveis, mas uma fronteira de perfil não deve depender dessa improbabilidade nem de como o dado foi criado.

**Causa raiz:** o namespace faz parte da identidade persistida, mas não da identidade do cache.

**Correção recomendada:** incluir o namespace na chave/stamp ou limpar o cache atomicamente ao trocar namespace. Adicionar teste com mesmo id/timestamp em dois perfis.

### BUG-003 — shapes ocultos quebram a inserção WYSIWYG

**Severidade: Média · Prioridade: P2 · Funcional**

`thumbnailShapes` entrega todos os shapes (`src/core/assetThumb.ts:31-45`). A miniatura filtra os ocultos em `VectorFrameSvg` (`src/vector/VectorFrameSvg.tsx:132`), mas `shapesForInsert` escala, calcula bounds e insere todos (`src/vector/insertAsset.ts:97-111`). Isso contradiz o próprio contrato documentado de inserir exatamente o que a miniatura mostra.

Reprodução confirmada: um retângulo visível em `x=0` e um oculto em `x=10000` resultaram no visível em `x=-2452.5`, completamente fora de um canvas 100×100; o oculto foi inserido em `x=2547.5`.

**Causa raiz:** a definição compartilhada de “cara do asset” retorna dados não visíveis, enquanto apenas o renderer aplica `visibleShapes`.

**Correção recomendada:** filtrar `visibleShapes` antes de definir o plano, os bounds, a contagem e o clone. Tratar documento totalmente oculto como vazio e cobrir a regressão em `insertAsset.test.ts`.

### BUG-004 — busca recalcula miniaturas raster de forma síncrona

**Severidade: Média · Prioridade: P2 · Performance**

O diálogo chama `insertableAssets` uma vez para a busca e outra para saber se existe algum candidato (`src/components/editor/vector/VectorInsertAssetDialog.tsx:35-42`). Para cada asset, `insertableAssets` chama `insertPlanFor` (`src/vector/insertAsset.ts:144-157`), que chama `thumbnailBitmap`; em sprites/cenários multicamada isso executa `flattenCels` e aloca um bitmap novo (`src/core/assetThumb.ts:14-27`). Cada `AssetThumb` renderizado calcula a miniatura novamente.

Benchmark mínimo com um estado válido de 64 cenários 512×512 e quatro camadas visíveis: 20 scans levaram 829,8 ms, média de 41,5 ms por scan e 320 MiB de buffers de saída acumulados. Uma atualização de query faz dois scans antes da renderização, cerca de 83 ms nessa carga de referência.

**Causa raiz:** o predicado de elegibilidade executa materialização raster pesada, misturando metadado de filtro com geração de preview.

**Correção recomendada:** filtrar por kind/estrutura com predicado barato; calcular `temAlgum` a partir desse conjunto uma vez; memoizar a miniatura achatada por identidade/revisão do asset e compartilhá-la com o card.

### BUG-005 — trap de foco não recupera foco que já saiu do modal

**Severidade: Média · Prioridade: P2 · Acessibilidade**

O comentário e o branch de `Dialog` tentam recuperar foco externo (`src/components/ui/Dialog.tsx:57-64`), mas o `onKeyDown` está no card (`src/components/ui/Dialog.tsx:77-84`). Se o foco está no `body` ou num botão da tela de fundo, o evento nasce fora do card e nunca chega ao handler. `aria-modal` não aplica comportamento por si só e o restante da página não recebe `inert`.

Reprodução estrutural em happy-dom: após focar um botão de fundo e disparar `Tab`, `defaultPrevented=false` e o foco permaneceu fora. A cobertura confirma a lacuna: as linhas do trap em `Dialog.tsx:45-71` não são exercitadas.

**Causa raiz:** o listener que deveria recuperar um escape está localizado dentro da região da qual o foco já escapou.

**Correção recomendada:** usar listener document-level de `keydown`/`focusin` com ciclo de vida do modal, ou portal + `inert` nos siblings, mantendo restauração do foco. Validar em Chromium, Firefox e Safari; as diretrizes atuais também pedem foco visível e comportamento completo de teclado.

### BUG-006 — falha de inserção fecha o modal

**Severidade: Baixa · Prioridade: P3 · UX**

O click chama `insertFromAsset(asset)` e fecha sempre (`src/components/editor/vector/VectorInsertAssetDialog.tsx:71-74`). A função retorna `void` e tem três saídas de falha com toast: raster/PNG indisponível, conteúdo vazio e teto de shapes (`src/components/editor/vector/VectorEditorScope.tsx:381-406`). A criança perde a busca/seleção e precisa reabrir o diálogo.

**Causa raiz:** o comando não expõe sucesso/falha para a camada de apresentação.

**Correção recomendada:** devolver resultado discriminado/booleano e fechar apenas após commit; manter o diálogo aberto com o toast em caso de erro.

## Arquitetura e manutenção

### Pontos fortes

- API pública controlada por `src/index.ts`; integração de dados usa apenas o subpath `studio-library`.
- Consumidores encontrados usam os entrypoints públicos; não encontrei import externo direto de internals do Pinta.
- A análise de imports não encontrou arquivo de produção órfão. O componente fortemente conectado inicialmente apontado pelo grafo era composto por imports `type`; não confirmei ciclo de runtime.
- Sanitizers são defensivos e o modelo impõe quotas amplas para animações, bitmaps, mapas e paths.
- Persistência serializa writes por store e captura o handle do namespace no início da operação.
- Sem `any`, `as unknown`, `@ts-ignore`, `eval`, `dangerouslySetInnerHTML` ou `fetch('data:')` nos caminhos de produção inspecionados.
- URLs de shapes de imagem ficam restritas a `data:image/png;base64,`, bloqueando `http(s)`, SVG e `javascript:`.

### Dívida técnica relevante

Os maiores arquivos concentram várias responsabilidades:

- `VectorStage.tsx`: 1.261 linhas; pan, desenho, seleção, rotação, nodes, texto, ponteiros e renderização.
- `TilemapEditor.tsx`: 927 linhas; gestos, layers, rasterização de tiles vetoriais e renderização.
- `VectorEditorScope.tsx`: 811 linhas; contexto, histórico, clipboard, atalhos, seleção, node ops e inserção.
- `core/project.ts`: 807 linhas; tipos, quotas, sanitização e migrações.
- `vector/pathNodes.ts`: 784 linhas; parser, geometria e operações de nodes.

Isso não é motivo para um refactor massivo imediato, mas eleva o risco de mudanças concorrentes. O melhor corte é extrair controladores/reducers puros por gesto e deixar os componentes como composição. Priorize `VectorStage`, `TilemapEditor` e o fluxo de exportação, que também são os hotspots de cobertura.

Há ainda uma oportunidade baixa em `TilemapEditor.tsx:169-196`: a URL de objeto do tileset vetorial é revogada apenas em `load/error`; o cleanup só marca `cancelled`. Revogar no cleanup, com guarda idempotente, elimina a janela de leak em troca rápida/unmount.

## Testes e verificações da rodada original

| Verificação | Resultado |
|---|---|
| `bun run typecheck` em `packages/pinta` | PASS |
| `bun run check` em `packages/pinta` | PASS — 198 arquivos |
| `bun test src` | PASS — 658 testes, 0 falhas, 2.950 expects |
| `bun test --coverage ...` | PASS — 94,54% linhas no conjunto instrumentado; inclui testes |
| build Vite do playground | PASS — 1.788 módulos |
| smoke HTTP `/` e `/main.tsx` em `127.0.0.1:5199` | PASS — HTTP 200 |
| testes selecionados do `community-kids` | PASS — 25 testes |
| typecheck do `community-kids` | FAIL — erros atuais em `packages/studio`, sem diagnóstico no Pinta |
| `git diff --check -- packages/pinta` | PASS |

O build emitiu alerta de chunk: JS principal com 506,75 kB minificado/151,25 kB gzip. Como o host carrega o Pinta dinamicamente, não trato isso como bloqueador, mas o playground mostra que há espaço para dividir exportadores/rasterizadores e superfícies de editor.

O relatório de cobertura global do Bun inclui arquivos `.test.ts`, então não deve ser lido como 94,54% de produção. Hotspots de produção observados: `ExportDialog.tsx` 50,30% linhas, `TilemapEditor.tsx` 58,68%, `pixel/render.ts` 24,32%, `useStudioResync.ts` 47,73%, `rasterize.ts` 53,13% e `Dialog.tsx` 71,23%.

## Lacunas de QA

- Não há Playwright, Cypress, WebdriverIO ou outro E2E do Pinta detectado.
- O CLI `agent-browser` exigido pelo procedimento de QA não está instalado; portanto, não executei fluxos reais de ponteiro, teclado, download, canvas, drag/resize/rotate ou rasterização em browser.
- O playground subiu e os módulos foram transformados via HTTP, mas isso não substitui interação real.
- Antes de release, são obrigatórios ao menos: CRUD da galeria, desenho pixel, seleção/rotação/nodes vetoriais, inserir vetor/pixel, restore/ZIP, exportação PNG/SVG/spritesheet, integração Studio e navegação completa por teclado em modal.

## Ordem de correção executada

1. Implementar orçamento agregado e garantir que todo backup gerado seja restaurável.
2. Particionar o cache de miniaturas por namespace.
3. Corrigir a semântica de shapes ocultos e adicionar o teste de regressão.
4. Separar elegibilidade de geração de thumbnail e memoizar previews.
5. Corrigir o trap de foco e validar em browsers reais.
6. Fechar o modal de inserção apenas no sucesso.
7. Criar a primeira suíte E2E do Pinta antes de ampliar as features vetoriais.

## Conclusão pós-correção

O plano aprovado foi executado integralmente: BUG-001 a BUG-006 estão corrigidos, o cleanup da Blob URL está coberto e as cinco fontes atravessam modelo, editor e todos os funis de exportação. A limitação remanescente da revisão é de infraestrutura de QA: não existe suíte E2E do Pinta para validar ponteiros, canvas, downloads e foco em múltiplos browsers. Isso não reabre nenhum dos seis bugs, mas continua sendo o próximo investimento recomendado antes de ampliar o editor vetorial.
