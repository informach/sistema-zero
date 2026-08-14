# Full review do Pinta — 2026-08-14

## Parecer executivo

> **Status da remediação (14/08/2026): 7/7 corrigidos.** O editor agora aguarda e observa o
> `flush`; asset principal, ligados e Studio só recebem revisões confirmadas; o Pathfinder usa
> clipping Martinez robusto, componentes e orçamento de trabalho; diálogos respeitam a camada do
> topo; o tamanho do backup é incremental e byte-exato; e as resoluções vulneráveis de `nanoid`
> foram atualizadas.

**Recomendação original: não liberar o estado revisado sem corrigir os três achados de alta
severidade. A condição foi atendida pela remediação registrada abaixo.**

Os gates convencionais estão verdes — 774 testes, TypeScript estrito, verificação extra de símbolos não usados, Biome, build do playground e integração do host — e a base continua tecnicamente forte. A revisão adversarial, porém, encontrou sete achados acionáveis: três altos, três médios e um baixo.

Os bloqueadores são de comportamento, não de tipagem: sair do editor pode descartar uma edição quando a persistência falha; a transação de tileset/mapas e o reenvio ao Estúdio atravessam a fronteira de persistência antes do commit; e o novo Pathfinder pode bloquear a thread principal por aproximadamente 11 segundos no limite aceito pelo próprio modelo, apenas para recusar o resultado no fim.

### Resumo priorizado

| ID | Severidade | Prioridade | Achado |
|---|---:|---:|---|
| BUG-001 | Alta | P1 | Voltar fecha o editor mesmo quando o `flush` falha e descarta a única cópia da edição |
| BUG-002 | Alta | P1 | Assets ligados e resync do Estúdio são publicados antes da confirmação da persistência |
| PERF-001 | Alta | P1 | Pathfinder síncrono congela a UI por ~11 s no limite válido de 500 formas e depois recusa |
| BUG-003 | Média | P2 | Clipper recusa combinações válidas de formas suportadas (~0,146% no fuzz direcionado) |
| A11Y-001 | Média | P2 | Um único Escape fecha dois diálogos aninhados |
| PERF-002 | Média | P2 | Cada persistência reserializa a galeria inteira só para medir o orçamento (~54–86 ms a 30 MB) |
| SEC-001 | Baixa | P3 | Toolchain do Pinta alcança `nanoid@3.3.17`, marcado com advisory alto no lock atual |

### Resultado da remediação

| ID | Estado | Evidência principal |
|---|---|---|
| BUG-001 | Corrigido | `flush()` devolve resultado; Voltar só fecha após sucesso; falha de IDB mantém o editor aberto |
| BUG-002 | Corrigido | `onSaved` publica principal+ligados via `absorbMany`; `savedAsset` alimenta o resync |
| PERF-001 | Corrigido | 500 elipses: 31–47 ms local, com regressão `< 500 ms` |
| BUG-003 | Corrigido | fixture rotacionado verde; fuzz ampliado: 80.000 operações, 0 falhas geométricas |
| A11Y-001 | Corrigido | Escape/foco de dois diálogos coberto em duas etapas |
| PERF-002 | Corrigido | 30.026.911 bytes: ~101 ms frio e ~0,02 ms quente, com igualdade byte a byte |
| SEC-001 | Corrigido | `bun audit --json`: nenhum advisory de `nanoid` |

## Escopo e método

- Escopo principal: `packages/pinta`, inclusive alterações rastreadas e seis módulos novos ainda não rastreados no working tree.
- Integrações: rota do `community-kids`, portão de carreira, entrypoint raiz, subpath `studio-library`, persistência local e ponte Pinta → Estúdio.
- Baseline: auditoria de 2026-08-12 e suas correções, revalidadas pela suíte atual.
- Volume atual: 210 arquivos TS/TSX em `src`; 137 arquivos de produção, 27.135 linhas; 71 arquivos de teste; 273 linhas de CSS.
- Diff rastreado revisado: 9 arquivos, 611 inserções e 13 remoções. Também foram revisadas 1.912 linhas nos seis arquivos novos de flatten/pathfinder/clipper e testes.
- Método: grafo de imports com AST do TypeScript, buscas estáticas, inspeção manual dos hotspots, revisão do diff, fuzz determinístico, benchmarks sintéticos no limite, testes de integração, build e auditoria de dependências.
- Referência de interface: [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), consultada em 2026-08-14.

## Achados

### BUG-001 — Voltar pode descartar a edição depois de uma falha de persistência

**Severidade: Alta · Prioridade: P1 · Dados/UX**

Toda edição apenas arma `dirty` e mantém `saveState: 'saved'` durante o debounce (`packages/pinta/src/state/editorStore.ts:178-184`, estado inicial em `:208-213`). Assim, por até um segundo o topo continua dizendo “Salvo” apesar de existir trabalho ainda não persistido.

Quando o salvamento falha, `saveNow` captura o erro, volta a marcar `dirty` e resolve a Promise normalmente (`packages/pinta/src/state/editorStore.ts:145-175`). O botão Voltar dispara `flush()` sem aguardar e chama `closeEditor()` imediatamente (`packages/pinta/src/components/editor/EditorScreen.tsx:619-622`); o cleanup também faz apenas `void flush()` (`:578-588`). Se IndexedDB, quota ou serialização continuar falhando, o store do editor é desmontado e a galeria mantém a versão anterior porque `onSaved` só roda no sucesso.

Reprodução mínima confirmada:

```json
{
  "immediatelyAfterCommit": { "saveState": "saved" },
  "afterFlush": { "saveState": "error", "saveError": null },
  "galleryName": "Teste",
  "editorName": "Alterado"
}
```

O erro nulo da reprodução vem da ausência intencional de `persistErrorMessage` no fake; em produção há copy, mas ela desaparece junto com o editor.

**Causa raiz:** `dirty` não pertence ao estado observável e `flush` não comunica sucesso/falha; a navegação trata “pedido de salvar iniciado” como “commit confirmado”.

**Correção recomendada:** tornar a pendência um estado explícito imediatamente no commit; fazer `flush` retornar um resultado discriminado; no Voltar, aguardar o resultado e só fechar em sucesso. Em erro, manter o editor aberto, preservar a edição e oferecer tentar novamente/baixar backup. Cobrir commit → falha → Voltar e commit → salvamento lento → Voltar.

### BUG-002 — A transação cross-asset e o Estúdio atravessam o commit cedo demais

**Severidade: Alta · Prioridade: P1 · Consistência/integração**

`commitLinked` aplica os mapas remapeados à galeria imediatamente, antes do autosave (`packages/pinta/src/state/editorStore.ts:187-205`). O asset principal só é absorvido via `onSaved`, depois da persistência (`:158-164`; montagem em `packages/pinta/src/components/editor/EditorScreen.tsx:525-543`). Se a escrita falhar, a galeria em memória fica com tileset antigo e mapas novos.

Reprodução confirmada com `persist` lançando erro:

```json
{
  "saveState": "error",
  "galleryTileset": "Peças",
  "galleryMap": "Mapa remapeado",
  "editorTileset": "Peças alteradas"
}
```

Além disso, `useStudioResync` observa o asset vivo do editor, não a revisão confirmada em disco. Ele agenda o envio após 1,5 s e força o job pendente no unmount (`packages/pinta/src/components/editor/useStudioResync.ts:71-121`). Portanto, uma edição que falhou localmente ainda pode ser reenviada ao Estúdio; ao voltar, o Pinta descarta a revisão enquanto o Estúdio pode permanecer nela.

**Causa raiz:** existem três momentos de publicação independentes — galeria ligada, disco e Estúdio — sem um único boundary de commit.

**Correção recomendada:** manter asset principal e ligados dentro da transação do editor até `persist` confirmar; publicar todos na galeria em uma única atualização após sucesso. Alimentar o resync a partir da revisão confirmada, ou bloquear/cancelar envios enquanto houver `dirty/error`. O callback de sucesso deve carregar `{ asset, linkedAssets, revision }`, e testes precisam cobrir falha, retry e unmount.

### PERF-001 — Pathfinder chega a 11 segundos de bloqueio antes da recusa

**Severidade: Alta · Prioridade: P1 · Performance/disponibilidade da UI**

O documento aceita 500 shapes (`packages/pinta/src/core/projectConfig.ts:28`) e a UI chama `pathfinderShapes` de forma síncrona no handler (`packages/pinta/src/components/editor/vector/VectorEditorScope.tsx:580-587`). A dobra processa um clip completo por forma (`packages/pinta/src/vector/pathfinder.ts:122-133`), enquanto o noding compara cada aresta dos dois operandos em laços aninhados (`packages/pinta/src/vector/polygonClip.ts:189-200`). O teto final de `MAX_PATH_CHARS` só é testado depois de toda a geometria e simplificação (`packages/pinta/src/vector/pathfinder.ts:240-247`).

Benchmark em Bun 1.3.11, unindo elipses válidas; as duas primeiras se sobrepõem e as demais ficam desconectadas:

| Formas | Tempo | Resultado |
|---:|---:|---|
| 20 | 32,1 ms | sucesso |
| 50 | 82,3 ms | sucesso |
| 100 | 325,4 ms | `too-big` |
| 200 | 1.346,7 ms | `too-big` |
| 500 | 10.956,5 ms | `too-big` |

No caso máximo, a criança perde responsividade por quase 11 segundos para receber apenas um toast de recusa. Em aparelho móvel de entrada, a janela tende a ser pior.

**Causa raiz:** limite de armazenamento aplicado tarde, operação quadrática/crescente na thread principal e ausência de orçamento intermediário por pontos/arestas/tempo.

**Correção recomendada:** fazer preflight barato de participantes, pontos achatados e limite superior do `d`; tratar componentes desconectados sem executar clip par-a-par; impor orçamento de trabalho durante a dobra; e mover operações potencialmente longas para Worker cancelável. Adicionar benchmark/regressão com 100, 200 e 500 formas e SLA explícito.

### BUG-003 — O clipper falha em formas suportadas

**Severidade: Média · Prioridade: P2 · Funcional**

O Pathfinder declara retângulos arredondados, elipses e polígonos fechados como elegíveis, mas o encadeamento pode não fechar e retorna `null` (`packages/pinta/src/vector/polygonClip.ts:361-406`, propagado em `:501-522`). A orquestração transforma isso em `geometry-failed` sem alterar o documento (`packages/pinta/src/vector/pathfinder.ts:205-216`), o que evita corrupção, mas recusa uma operação válida.

Fuzz determinístico com pares de retângulos arredondados, elipses e estrelas/polígonos rotacionados encontrou 29 recusas geométricas em 19.838 pares que passaram da guarda `apart`: **0,146%**. O primeiro caso reproduzível ocorreu na iteração 1.420, com um retângulo arredondado rotacionado 10,42° e uma estrela de oito pontas rotacionada 139,65°. Em contrapartida, 20.000 pares de retângulos axis-aligned bateram a área analítica sem falha.

**Causa raiz provável:** tolerâncias e escolha local de próxima aresta deixam uma cadeia aberta em interseções próximas/complexas; a rede de segurança detecta o problema corretamente, mas o algoritmo não o resolve.

**Correção recomendada:** promover o primeiro caso determinístico a regressão, reduzir a entrada a um fixture mínimo e corrigir o noding/encadeamento. Manter property tests com seed e invariantes de área. Se a robustez exigir uma biblioteca especializada, avaliar peso, licença e comportamento determinístico antes de substituir o núcleo.

### A11Y-001 — Escape fecha o seletor de cor e o diálogo de gradiente juntos

**Severidade: Média · Prioridade: P2 · Acessibilidade/UX**

Cada `Dialog` aberto instala seu próprio listener de `keydown` no `document` (`packages/pinta/src/components/ui/Dialog.tsx:89-115`). O handler chama `stopPropagation`, que não impede outros listeners no mesmo `document` (`:23-32`). O diálogo de gradiente contém dois `ColorButton`, e cada um renderiza outro `Dialog` inline (`packages/pinta/src/components/editor/VectorPropertiesPanel.tsx:142-183`; `packages/pinta/src/components/editor/ColorPicker.tsx:268-307`).

Reprodução em happy-dom com dois `Dialog` aninhados e um único Escape:

```json
{ "parentClosed": 1, "childClosed": 1 }
```

O comportamento esperado é fechar somente a camada modal superior, preservando o contexto do gradiente e devolvendo o foco ao acionador dentro dela.

**Causa raiz:** o trap é global por instância, mas não existe uma pilha global de modais/topmost dialog.

**Correção recomendada:** manter uma pilha/registro de modais e permitir Escape/focus trap somente no topo. Não usar apenas `stopImmediatePropagation`: o listener do pai normalmente foi registrado primeiro e fecharia a camada errada. Adicionar teste de dois modais e restauração de foco em duas etapas.

### PERF-002 — A medição exata do backup causa jank no autosave grande

**Severidade: Média · Prioridade: P2 · Performance**

Antes de cada `setMany`, a persistência lê a galeria inteira, monta a projeção e chama `galleryBackupByteLength` (`packages/pinta/src/state/persistence.ts:127-148`). Essa função gera todo o JSON formatado e então cria outro buffer UTF-8 só para medir (`packages/pinta/src/export/projectJson.ts:107-118`). Se o teto for ultrapassado, a versão atual é serializada novamente.

Benchmark com um asset válido de 30.029.113 bytes, abaixo do teto de 32 MiB: **86,3 / 61,6 / 62,3 / 53,5 ms** por chamada em Bun. Esse custo síncrono ocorre antes da escrita real no IndexedDB e ultrapassa o orçamento de vários frames.

**Causa raiz:** o orçamento exato é recalculado do zero para toda a galeria em toda mutação.

**Correção recomendada:** cachear a contribuição serializada exata por `{id, updatedAt}` e manter o total incremental, incluindo os bytes fixos/separadores do envelope; invalidar apenas os assets alterados. Para legado acima do teto, comparar os dois totais sem serializar todos os assets duas vezes. Cobrir igualdade byte a byte contra o serializer canônico.

### SEC-001 — Advisory no `nanoid` transitivo do toolchain

**Severidade contextual: Baixa · Prioridade: P3 · Supply chain de desenvolvimento**

`bun audit --json` reportou 32 advisories no lockfile do monorepo. A análise de caminho mostrou que as versões vulneráveis de Astro/Hono/Drizzle etc. não pertencem ao Pinta. No caminho declarado pelo toolchain do Pinta, Vite 8.0.16 e esbuild 0.25.12 estão fora das faixas reportadas, mas `vite → postcss@8.5.23 → nanoid@3.3.17` alcança [GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8), marcado como alto pelo audit para versões `<3.3.18`. O lock confirma `nanoid@3.3.17` em `bun.lock:2304`.

O contexto reduz a severidade para o Pinta: é dependência transitiva de build/dev e não encontrei chamada do gerador vulnerável em runtime do editor.

**Correção recomendada:** atualizar/deduplicar a linha 3 para `nanoid >= 3.3.18`, regenerar o lock e rerodar o audit e todos os builds do workspace. A mudança é de lock compartilhado, então deve ser tratada fora de um patch isolado do Pinta.

## Arquitetura e manutenção

### Pontos fortes

- Os dois entrypoints públicos (`src/index.ts` e `src/export/studioLibrary.ts`) alcançam todos os 137 arquivos de produção quando imports de tipo são incluídos. `src/core/types.ts` é corretamente type-only no grafo de runtime.
- Não há ciclo de import de runtime.
- Não foram encontrados `any`, `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, `eval`, `new Function`, `dangerouslySetInnerHTML`, atribuição a `innerHTML` ou `fetch` em produção.
- Texto exportado para SVG passa por escape XML; imagens vetoriais são limitadas a PNG `data:` e tamanho máximo.
- Sanitizers continuam fail-soft e os limites de shapes, frames, mapas, bitmaps e payloads têm cobertura ampla.
- A rota do `community-kids` agora usa corretamente o portão de criação livre em Construtor(a); os testes de conformance e acesso confirmam a distinção para recursos com IA.

### Dívida técnica

Os maiores módulos continuam concentrando muitas responsabilidades:

- `VectorStage.tsx`: 1.282 linhas.
- `TilemapEditor.tsx`: 946 linhas.
- `VectorEditorScope.tsx`: 879 linhas.
- `core/project.ts`: 807 linhas.
- `vector/pathNodes.ts`: 784 linhas.

O risco não justifica refactor massivo antes dos bloqueadores, mas os próximos cortes naturais são controladores puros de gesto/viewport/texto no `VectorStage`, comandos de documento no `VectorEditorScope` e operações/layers no `TilemapEditor`.

A varredura de clones encontrou 57 janelas sobrepostas de nove linhas, concentradas em poucos grupos: renderização de miniatura em canvas repetida em quatro componentes, `withLayer` duplicado em `tiles/stamp.ts` e `tiles/tilemapOps.ts`, e montagem semelhante de geometria em `spritesheet.ts`/`vectorSheet.ts`. Não há evidência de divergência funcional agora; é oportunidade baixa de centralização, não bloqueador.

O build gera um chunk principal de 531,75 kB minificado / 159,11 kB gzip e emite o alerta de 500 kB. O host carrega o Pinta como superfície isolada e as fontes já são chunks separados, por isso classifico como dívida, mas o novo núcleo geométrico reforça a conveniência de lazy loading por editor/exportador.

## UI e acessibilidade

Além do A11Y-001, a inspeção estática não encontrou violação acionável nas diretrizes consultadas:

- controles icon-only usam nome acessível;
- alvos principais mantêm 44 px;
- os diálogos têm `role=dialog`, `aria-modal`, título associado, foco inicial, restauração e `overscroll-contain`;
- os campos têm labels e os estados de foco têm substituto visível;
- animações respeitam `prefers-reduced-motion` e não há `transition: all`;
- não foram encontrados elementos não semânticos com `onClick` no fluxo de produção revisado.

O uso intencional de `autoFocus` em nome/tamanho/texto merece validação em iOS/Android porque pode abrir teclado e mover o viewport, mas não o classifiquei como bug sem evidência em browser real.

## Testes e verificações

### Verificação pós-remediação

| Verificação fresca | Resultado |
|---|---|
| `bun test src --timeout 30000` no Pinta | PASS — 781 testes, 0 falhas, 3.436 expects, 71 arquivos |
| `bun run typecheck` | PASS |
| `bunx tsc --noEmit --noUnusedLocals --noUnusedParameters` | PASS |
| `bun run check` | PASS — 219 arquivos |
| build Vite do playground | PASS — 1.802 módulos |
| `member-shell/tests/creative-apps-access.test.ts` | PASS — 6 testes |
| testes de rotas embarcadas do `community-kids` | PASS — 13 testes, 32 expects; typecheck PASS |
| `bun install --frozen-lockfile` | PASS — lockfile reproduzível, sem mudanças |
| fuzz rotacionado ampliado | 80.000 operações; 0 `geometry-failed` |
| regressão Pathfinder 500 formas | PASS — 31–47 ms local, SLA `< 500 ms` |
| benchmark do cache exato, 30.026.911 bytes | ~101 ms frio; ~0,02 ms quente; igualdade byte a byte |
| `bun audit --json` | nenhum advisory de `nanoid` |

| Verificação | Resultado |
|---|---|
| `bun test src` em `packages/pinta` | PASS — 774 testes, 0 falhas, 3.401 expects, 71 arquivos |
| `bun test src --coverage` | PASS — 774 testes; relatório de cobertura gerado |
| `bun run typecheck` | PASS |
| `bunx tsc --noEmit --noUnusedLocals --noUnusedParameters` | PASS |
| `bun run check` | PASS — 219 arquivos |
| `bunx vite build --config playground/vite.config.ts` | PASS — 1.801 módulos; alerta de chunk principal |
| `git diff --check` no Pinta e rota | PASS |
| `member-shell/tests/creative-apps-access.test.ts` | PASS — 6 testes |
| testes dirigidos de carreira/focus/embedded no `community-kids` | PASS — 30 testes |
| `bun run typecheck` em `community-kids` | PASS |
| Grafo AST de imports | 137/137 alcançáveis; 0 ciclos de runtime |
| Fuzz de retângulos axis-aligned | 20.000 pares; 0 divergências de área |
| Fuzz de formas suportadas rotacionadas | 19.838 casos processados; 29 `geometry-failed` |
| Benchmark Pathfinder | 32,1 ms (20) → 10.956,5 ms (500) |
| Benchmark orçamento de backup | 53,5–86,3 ms por medição a 30.029.113 bytes |

Hotspots de cobertura de produção continuam nos funis dependentes de browser/canvas (`pixel/render.ts`, `rasterize.ts`, `studioBridge.ts`) e em fluxos grandes de UI. O núcleo novo de flatten/pathfinder/clipper ficou entre 97% e 100% de linhas na instrumentação, mas o fuzz mostrou que cobertura estrutural alta não substitui robustez geométrica.

## Lacunas e confiança

- Confiança **alta** nos achados de persistência, modal, Pathfinder e orçamento: todos têm reprodução determinística e referência direta ao fluxo de produção.
- Confiança **alta** na arquitetura estática, tipagem e gates.
- Confiança **moderada** na experiência visual final: não existe harness E2E real do Pinta; happy-dom não implementa canvas, layout, ponteiro ou teclado móvel como um navegador.
- Não foram exercitados manualmente em Chromium/WebKit/Firefox: drag/resize/rotate, download, clipboard, pagehide real, IndexedDB sob quota real, leitor de tela e teclado virtual.
- `bun audit` é do lockfile compartilhado. SEC-001 foi atribuído ao Pinta por caminho de dependência; os demais advisories do monorepo ficam fora deste escopo.

## Ordem recomendada

1. Unificar a fronteira de commit: `dirty` observável, `flush` com resultado, Voltar aguardado e publicação atômica de asset + ligados.
2. Fazer o resync consumir somente revisões confirmadas.
3. Colocar preflight/orçamento/Worker no Pathfinder antes de liberar a feature.
4. Fixar o caso determinístico do clipper e ampliar property tests.
5. Implementar pilha de modais e teste de Escape em duas camadas.
6. Tornar a contagem do backup incremental e exata.
7. Atualizar o `nanoid` transitivo no lock compartilhado.
