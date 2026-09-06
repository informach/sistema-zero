# Full Review do Molda

**Data:** 2026-09-06 17:04 (America/Sao_Paulo)  
**Escopo:** estado atual do working tree em `packages/molda`, incluindo alterações locais ainda não commitadas  
**Arquivos TypeScript/TSX analisados:** 187  
**Linhas TypeScript/TSX:** 29.885  
**Código de produção:** 124 arquivos, 19.568 linhas  
**Estado do pacote no início da revisão:** 37 arquivos rastreados modificados e 8 arquivos novos não rastreados

## Resumo executivo

O Molda está com uma base tecnicamente forte: tipagem estrita, limites centralizados, entradas públicas bem separadas, sanitização defensiva, exportadores protegidos por orçamento, testes extensos e nenhum ciclo de importação de runtime encontrado. O grafo das três entradas públicas alcança todos os arquivos de produção; não há arquivo inteiro morto.

Ainda assim, a revisão encontrou **1 problema alto, 4 médios e 5 baixos**. Os problemas mais relevantes estão nas fronteiras entre estado transitório e persistido: uma edição feita imediatamente antes de voltar à galeria não é reenviada ao Estúdio; o histórico pode restaurar `locked` sem encerrar o submodo de malha; e o fluxo de snap preserva uma seleção antiga mesmo depois de a interface destacar outra peça. Também há uma falha topológica confirmada no corte de anel e uma corrida no orçamento do IndexedDB.

Nenhum arquivo de produção foi alterado durante esta revisão.

## Achados funcionais

### HIGH-1 — Voltar antes do autosave deixa a versão do Estúdio desatualizada

**Confiança:** alta  
**Arquivos:**

- `packages/molda/src/components/editor/EditorScreen.tsx:47`
- `packages/molda/src/components/editor/EditorScreen.tsx:55`
- `packages/molda/src/components/editor/useStudioResync.ts:33`
- `packages/molda/src/components/editor/useStudioResync.ts:44`
- `packages/molda/src/components/editor/useStudioResync.ts:68`
- `packages/molda/src/components/editor/useStudioResync.ts:89`

`useStudioResync` observa apenas `savedAsset`. Ao desmontar, ele envia somente o valor já colocado em `pendingRef`. No mesmo desmontar, `EditorScreen` dispara `void editor.flush()`, mas o salvamento termina depois que o hook deixou de existir; portanto, a mudança de `savedAsset` não agenda nenhum reenvio.

Reprodução executada com o app real, persistence em memória e fake viewport:

1. Abrir uma criação ligada ao bridge.
2. Trocar a paleta.
3. Clicar imediatamente em “Voltar para a galeria”, antes dos 600 ms do autosave.
4. Aguardar 2,2 s.

Resultado observado:

```json
{"persistedPalette":"pastel","resyncCalls":0}
```

A galeria local recebe a edição pelo `flush`, mas o item já importado no Estúdio continua com a versão anterior. Isso viola o contrato de mão dupla descrito no próprio adapter.

**Recomendação:** transformar fechamento em uma única operação drenável: finalizar gestos, aguardar `editor.flush()`, obter o snapshot efetivamente salvo e enfileirar/aguardar o resync antes de desmontar. A lógica de resync deve poder receber diretamente o último snapshot salvo, sem depender de um novo render do hook. Cobrir “editar e voltar antes do debounce” num teste integrado de `MoldaApp`.

### MEDIUM-1 — Desfazer pode manter o editor de malha aberto sobre uma peça trancada

**Confiança:** alta  
**Arquivos:**

- `packages/molda/src/components/editor/model/ModelEditor.tsx:525`
- `packages/molda/src/components/editor/model/ModelEditor.tsx:615`
- `packages/molda/src/components/editor/model/ModelEditor.tsx:653`
- `packages/molda/src/components/editor/model/ModelEditor.tsx:678`
- `packages/molda/src/model/meshTools.ts:54`
- `packages/molda/src/state/editorStore.ts:189`

A entrada explícita em “Editar malha” recusa peças trancadas ou escondidas, e trancar pela UI durante a edição fecha o submodo. Porém, o efeito que reconcilia a sessão após undo/redo só verifica se a peça e a malha ainda existem; não verifica `locked` nem `hidden`. As operações puras de malha também não fazem essa defesa.

Reprodução executada:

1. Abrir uma peça de malha inicialmente trancada.
2. Destrancar e entrar em “Editar malha”.
3. Desfazer o destrancamento.
4. Selecionar um vértice e pressionar `PageUp`.

Resultado observado:

```json
{"locked":true,"meshEditPart":"body","before":0,"after":1}
```

A peça aparece trancada, o overlay continua ativo e o vértice se move mesmo assim.

**Recomendação:** encerrar o submodo sempre que o asset atual marcar a peça editada como `locked` ou `hidden`. Como defesa em profundidade, `moveMeshVertices`, `deleteMeshSelection` e as ferramentas de `meshTools` também devem recusar fonte trancada/escondida. Adicionar regressão com undo e redo, não apenas com o botão de trancar.

### MEDIUM-2 — `loopCut` cria T-junction quando um triângulo recebe dois cortes

**Confiança:** alta  
**Arquivo:** `packages/molda/src/model/meshTools.ts:354`

Depois de cortar os quads, o algoritmo insere midpoints nas faces vizinhas somente enquanto `cycle.length < 4`. Se um triângulo encosta em duas arestas propagadas, o primeiro midpoint o transforma em quad e o segundo deixa de ser inserido. A malha resultante mantém o segundo midpoint no quad vizinho, mas não na face adjacente, criando uma rachadura topológica/T-junction que passa pela normalização e pode ser salva/exportada.

Reprodução pura executada com dois quads compartilhando a aresta inicial e terminando em duas arestas do mesmo triângulo. O midpoint de `d-g` foi criado, mas a face `t` não o usa:

```json
{
  "midDg": "v_y8zat5",
  "triangle": {"v":["c","v_09a8fi","d","g"]},
  "usedByTriangle": false
}
```

**Recomendação:** antes de publicar o corte, contar quantas arestas cortadas atingem cada face não visitada. Para dois midpoints em um triângulo, dividir a face em faces válidas e reprojetar a pele; se esse caso ainda não tiver semântica definida, recusar toda a operação atomicamente. Adicionar uma verificação de conformidade de arestas, pois `meshIssues` atualmente não detecta T-junction.

### MEDIUM-3 — O orçamento do IndexedDB pode ser ultrapassado por duas instâncias

**Confiança:** alta  
**Arquivos:**

- `packages/molda/src/state/persistence.ts:105`
- `packages/molda/src/state/persistence.ts:204`
- `packages/molda/src/state/persistence.ts:232`
- `packages/molda/src/state/persistence.ts:236`
- `packages/molda/src/state/persistence.ts:272`
- `packages/molda/src/state/persistence.ts:324`

A fila de escrita é compartilhada por `dbName`, mas o inventário de bytes é local a cada instância de `createMoldaPersistence`. Uma instância pode carregar o inventário vazio, outra gravar, e a primeira continuar usando seu cache antigo. O `BroadcastChannel` só invalida instâncias que instalaram `subscribe`, e mesmo nesse caso duas abas podem calcular o orçamento antes de receber o aviso.

Reprodução executada com duas instâncias públicas no mesmo namespace, cada asset medindo 320 bytes e orçamento total de 480 bytes:

```json
{
  "eachBytes": 320,
  "maxBytes": 480,
  "second": "accepted",
  "stored": ["a","b"],
  "storedBytes": 640
}
```

**Recomendação:** fazer inventário e fila compartilharem a mesma autoridade por banco no mesmo realm; para múltiplas abas, colocar o ledger de bytes no próprio IndexedDB e validar orçamento + escrever na mesma transação, ou serializar a seção crítica com um lock cross-tab. Criar teste com duas instâncias previamente carregadas e outro com duas gravações simultâneas.

### MEDIUM-4 — Trocar a seleção pela lista durante “Grudar” move a seleção antiga

**Confiança:** alta  
**Arquivos:**

- `packages/molda/src/components/editor/model/useSnapController.ts:49`
- `packages/molda/src/components/editor/model/useSnapController.ts:62`
- `packages/molda/src/components/editor/model/useSnapController.ts:103`
- `packages/molda/src/components/editor/model/ModelEditor.tsx:1069`
- `packages/molda/src/state/sessionStore.ts:99`

O controller congela `primaryId` e `movingIds` quando a ferramenta começa. O palco fica dedicado ao snap, mas a lista de peças continua interativa e `onSelect` não cancela a operação. Assim, a interface pode destacar uma peça nova enquanto o segundo toque ainda move o grupo antigo.

Reprodução executada:

```json
{
  "selectedBeforeTarget": "wing",
  "selectedAfterTarget": "body",
  "bodyMoved": true,
  "wingMoved": false
}
```

**Recomendação:** cancelar “Grudar” quando `selectedId` ou `extraIds` divergir do snapshot da operação, ou bloquear/tornar inerte a troca de seleção durante as duas fases. Revalidar também a seleção corrente antes do commit.

### LOW-1 — Apagar uma extra anterior troca desnecessariamente a cor guardada do lápis

**Confiança:** alta  
**Arquivos:**

- `packages/molda/src/components/editor/model/ModelEditor.tsx:1133`
- `packages/molda/src/model/partOps.ts:627`
- `packages/molda/src/components/editor/texture/TextureEditor.tsx:308`

Os dados remapeiam índices acima da cor removida para `index - 1`, preservando a mesma cor física. A UI, porém, manda qualquer `paintColor >= index` para `1`. O caso é alcançável no editor de modelo: escolher a extra 17 no modo Pintar, voltar a Montar, apagar a extra 16 usada pela peça e retornar a Pintar.

Reprodução executada:

```json
{"remainingExtra":["#222222"],"brushColor":1,"remainingColorIndex":16}
```

**Recomendação:** se a cor ativa for igual à removida, usar a primeira pintável; se for maior, decrementar o índice. O mesmo helper deve atender modelo e textura, mesmo que o ramo `>` ainda não seja alcançável pela UI atual da textura.

### LOW-2 — Ligar o espelho no teto falha sem qualquer retorno visual

**Confiança:** alta  
**Arquivos:**

- `packages/molda/src/model/partOps.ts:557`
- `packages/molda/src/components/editor/model/ModelEditor.tsx:666`
- `packages/molda/src/components/editor/model/Toolbox.tsx:140`
- `packages/molda/src/state/editorStore.ts:155`

Quando os gêmeos excederiam o teto de peças ou triângulos, `setMirrorX` devolve o mesmo objeto. `commit` ignora a referência idêntica, e o botão não está desabilitado nem mostra toast. Para a criança, o clique simplesmente não funciona.

**Recomendação:** devolver resultado discriminado com `parts-full`/`triangles-full`, como outras operações, ou calcular `canMirror` para desabilitar o botão com motivo acessível.

## Arquitetura e manutenção

### LOW-3 — Dois orquestradores concentram responsabilidades demais

**Confiança:** alta

| Arquivo | Linhas | Responsabilidades acumuladas |
|---|---:|---|
| `src/components/editor/model/ModelEditor.tsx` | 1.306 | sessão, histórico, gestos, pintura, malha, snap, export, atalhos, painéis, thumbnail e mensagens |
| `src/viewport/MoldaViewport.ts` | 1.313 | renderer, câmera, órbita, gizmo, picking, seleção, drag, pintura, snap, overlays, thumbnail e recuperação WebGL |

As extrações recentes (`useSnapController`, `meshCommands`, `modelEditorHooks`) apontam na direção correta, mas os bugs MEDIUM-1 e MEDIUM-4 mostram que as invariantes entre sessão e asset ainda ficam espalhadas pelo orquestrador.

**Recomendação:** extrair uma máquina de estados explícita para submodos/gestos do editor e controllers de viewport por responsabilidade. Manter `ModelEditor` como composição e `MoldaViewport` como façade sobre controllers de interação, render e lifecycle.

### LOW-4 — Quatro grupos de duplicação exata

**Confiança:** alta

| Grupo | Instâncias |
|---|---|
| `isTypingTarget` | `EditorScreen.tsx:24`, `modelEditorHooks.ts:22`, `TextureEditor.tsx:69` |
| `chip` | `PaintToolbox.tsx:45`, `TextureEditor.tsx:75` |
| `resize` do renderer | `MoldaViewport.ts:625`, `SkyPreview.ts:187`, `TexturePreview.ts:148` |
| agendamento de frame | `MoldaViewport.ts:610`, `SkyPreview.ts:176`, `TexturePreview.ts:137` |

O primeiro grupo é o mais importante: três handlers de teclado podem divergir na definição de campo editável. Os dois últimos repetem lifecycle de canvas/WebGL.

**Recomendação:** centralizar `isTypingTarget`; extrair helpers visuais compartilhados para `chip`; criar uma composição pequena de resize/frame scheduling em vez de herança entre renderers.

### LOW-5 — Quatro exports internos não possuem uso

**Confiança:** alta

| Arquivo | Export |
|---|---|
| `src/core/color.ts:47` | `linearToSrgb` |
| `src/model/meshTools.ts:777` | `faceVerticesOf` |
| `src/model/shapes.ts:36` | `shapeHasFace` |
| `src/model/vec.ts:37` | `vecEquals` |

Nenhum deles é alcançado pelas entradas públicas nem referenciado em produção ou testes. Não há arquivo inteiro morto.

**Recomendação:** remover os quatro exports/funções se não fizerem parte de uma extensão planejada. Potencial de limpeza é pequeno, aproximadamente 10–20 linhas.

## Saúde arquitetural verificada

- As entradas `src/index.ts`, `src/assets/index.ts` e `src/export/studioLibrary.ts` alcançam todos os 121 arquivos de produção sob `src`; os outros 3 arquivos de suporte são usados por teste, Playwright e benchmark. Há **0 arquivos mortos**.
- Não foi encontrado ciclo de importação de runtime. Há apenas dois componentes fortemente conectados por imports de tipos, apagados na emissão.
- `@sistemazero/molda/assets` permanece puro: sem React, Zustand, Three ou IndexedDB.
- Nenhum `any`, `@ts-ignore`, `@ts-expect-error`, `eval` ou `dangerouslySetInnerHTML` foi encontrado no código do pacote.
- O compilador também passou com `noUnusedLocals` e `noUnusedParameters` habilitados.
- A interface usa controles semânticos, alvos de toque de 44 px, foco visível e `motion-reduce`; a revisão não encontrou violação bloqueadora de acessibilidade nas telas principais.
- Sanitização, limites de peças/triângulos/skins, ZIP por ranges e exportadores têm defesas consistentes e testes de corrupção/orçamento.

## Verificação executada

| Comando/cenário | Resultado |
|---|---|
| `bun run typecheck` em `packages/molda` | exit 0 |
| `bunx tsc --noEmit --noUnusedLocals --noUnusedParameters` | exit 0 |
| `bun test src` | 457 passaram, 0 falharam, 51 arquivos |
| `bun run check` | 192 arquivos verificados, 0 erros |
| `git diff --check -- packages/molda` | exit 0 |
| `bun run e2e` | 9 passaram, 0 falharam, Chromium |
| `bun run typecheck:kids` | exit 0 |
| `bun run test:kids` | 565 passaram, 0 falharam, 79 arquivos |
| `bun run scripts/bench-mesh.ts` | executado; `meshIssues` 20,0 ms e `loopCut` 6,1 ms no benchmark atual |
| Repro fechamento rápido | persistiu `pastel`, 0 resyncs |
| Repro undo + lock + edição de vértice | vértice Y mudou de 0 para 1 com `locked: true` |
| Repro snap com troca pela lista | `wing` selecionada; `body` moveu |
| Repro orçamento multi-instância | 640 bytes aceitos sob teto de 480 |
| Repro loop cut em triângulo com duas arestas | segundo midpoint ausente na face adjacente |

## Lacunas de QA

- O E2E atual cobre o fluxo feliz de snap, mas não a troca de seleção pela lista durante a ferramenta.
- Os testes de lock cobrem entrada recusada e trancamento pela UI, mas não undo/redo restaurando a flag durante o submodo.
- O teste de fechamento do resync parte de um `savedAsset` já alterado; falta integrar autosave + desmontagem no mesmo cenário.
- O `loopCut` cobre cubo, borda e precisão mínima, mas não polos onde uma face recebe dois midpoints.
- A persistência testa serialização em uma instância, não duas instâncias/abas com inventários já carregados.
- Permanece pendente, conforme a própria documentação do pacote, QA manual no kids com dois perfis e QA de nuvem em staging.

## Ordem recomendada de correção

1. Corrigir e testar o drain de save + resync no fechamento.
2. Fechar e defender operações de malha quando undo/redo restaurar `locked`/`hidden`.
3. Tornar `loopCut` atômico para faces atingidas por múltiplas arestas.
4. Unificar a autoridade do orçamento por banco e cobrir concorrência.
5. Cancelar snap em mudança de seleção.
6. Corrigir remapeamento do lápis e feedback do espelho.
7. Fazer as extrações estruturais e a limpeza de duplicações/exports em mudança separada.
