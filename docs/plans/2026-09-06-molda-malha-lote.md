> Cópia do plano aprovado em 06/09/2026 (o original vivia fora do repositório, em `~/.claude/plans/`); as decisões D1 a D14 e os lotes M1 a M5 estão aqui.

# Lote 06/09/2026: 7 correções + malha (vértices/arestas/faces) no Molda

> O plano anterior (Molda em 8 lotes) está concluído e arquivado em
> `docs/plans/2026-09-04-molda-design.md`. Este arquivo passa a ser o plano do lote de 06/09.
> Regras de sempre: copy pt-BR sem travessão, `bun run typecheck && bun test && bun run check` por
> pacote tocado, biome, nada commitado sem pedido (e `git add` escopado por caminho quando pedir).
> Decisões da dona (06/09): malha COMPLETA (M1 a M5); a "faixa branca" é o CABEÇALHO DA GALERIA do
> Molda; extras baratos + seleção múltipla entram.

## Contexto

Sete relatos vieram do uso real (kids em staging/produção) depois do Molda entrar em produção:
(1) a paleta do Molda enche de cores quase iguais; (2) o card da galeria do Molda corta em cima no
hover; (3) o Molda saiu do padrão visual do Pinta/Estúdio (cabeçalho branco); (4) no Estúdio
Completo, apagar um projeto não pega: ele volta da nuvem; (5) no editor de vetor do Pinta, arrastar
uma forma seleciona o texto junto e o palco trava; (6) sumiu o "Editar" do asset já no projeto no
painel Imagens e sons do Estúdio, e ele precisa valer para o Pinta E para o Molda; (7) o admin não
tem o card do Molda em "Ferramentas e comunidades" com o uso por aluno. Além disso, a dona pediu
o estudo do Blockbench para trazer edição de vértices, arestas e faces ao Molda, e outras melhorias.
Todas as causas foram localizadas no código (abaixo, com arquivo:linha). Ordem de execução:
F4 → F6 → F1 → F5 → F2/F3 → F7 → M1…M5 → extras. Deploy: members ANTES do kids e do admin.

---

## F4. Estúdio Completo: projeto apagado volta da nuvem

**Causa raiz (determinística).** `packages/community-kids/src/lib/studio-cloud.ts:379-385`:
`onDeleted(id)` chama `marks.delete(id)` (apaga a REVISÃO conhecida) ANTES de `enqueueRemove(id)`
(361-372) ler `marks.revision(id)` → lápide `{revision: null}` e `DELETE … {baseRevision: 0}`.
O members (`creations.repository.ts:522`) recusa base ≠ corrente → 409 `CREATION_STALE_BASE` para
todo item já commitado → o cliente (`creations-cloud.ts:805-822`) tira o job da fila e chama
`onStale` → `restoreAfterStaleRemove` (348-359) limpa a lápide, baixa e RESTAURA o projeto no mesmo
id → o card volta. Mesmo defeito em `pinta-cloud-persistence.ts:572-576` e
`molda-cloud-persistence.ts:454-465`. Os testes atuais consagram o defeito
(`tests/studio-cloud.test.ts:234-253` assere `revision: null` e nunca olha `removed[0].baseRevision`;
`pinta-cloud-persistence.test.ts:248-266`; `molda-cloud-persistence.test.ts:253-276`).
O 409 do members NÃO expõe `currentRevision` no corpo (`members/src/interfaces/http/error-handler.ts`,
só `details.hashes`), e `readError` do cliente (`creations-cloud.ts:343-358`) só lê `hashes`.

**Camadas (todas baratas, todas entram):**
1. **Ler a revisão ANTES de apagar a marca** nos três wrappers (`studio-cloud.ts onDeleted`,
   `pinta-cloud-persistence.ts deleteAsset`, `molda-cloud-persistence.ts remove/removeMany`):
   `enqueueRemove(id)` primeiro (lê `marks.revision`), `marks.delete(id)` depois, com comentário.
2. **`restoreAfterStaleRemove` vira `resolveStaleRemove(id, {currentRevision?, retried?})`**: só
   restaura quando a nuvem PROVA edição depois da última sincronia deste aparelho, por REVISÃO
   (`typeof tombstone.revision === 'number' && current > tombstone.revision`); senão a exclusão é
   nossa e a base estava errada: grava `revision: current` na lápide e reenvia UMA vez com a revisão
   autoritativa. Sem `currentRevision` (serviço antigo): `cloud.download(id)` decide (`null` = já não
   existe → lápide `sent: true`). Lápide legada sem revisão é autoritativa (mesma régua do
   reconcile). `marks.clearTombstone` SÓ depois de `restoreProjectFromCloud` gravar; `console.warn`
   no restauro real. Pinta/Molda: idêntico, com `persistAssets`/`saveMany` + `emitChangedSoon`.
3. **Plumbing do `currentRevision`**: members `error-handler.ts` → `details: { currentRevision }`
   no 409 de `CreationStaleBaseError` (alargar o tipo de `details`); kids `creations-cloud.ts`:
   `CloudError.details.currentRevision`, `readError` lê, `StaleListener = ({ itemId, currentRevision? })`,
   `step()` repassa. BFF (`member-shell/routes/creations.ts:488-491`) já repassa o corpo intacto.
4. **Reenvio do reconcile usa a revisão da NUVEM**: `creations-sync.ts` `remove?: (itemId,
   cloudRevision)` chamado com `remote.revision` (linha ~577); os três wrappers trocam
   `tombstone?.revision ?? marks.revision(itemId) ?? 0` por `cloudRevision`.
5. **Apagar antes de descer**: `studio-full-client.tsx:651-663` `backToList`:
   `cloud.flush({timeoutMs: 3000}).then(() => pullMissing())`.
6. `persistence.ts:423-460` do studio fica como está (a corrida com o reconcile já é fechada por
   `localUpdatedAt` → `skipped`); documentar no commit. Selo: falha no retry/restauro já cai em
   `staleFailed`; status "voltou de outro aparelho" é follow-up.

**Autocura dos dados já implantados**: lápides `{revision: null}` são reenviadas pelo reconcile com
a revisão da nuvem (4) → 200; itens que já quicaram voltaram com `marks.set(id, …, revision)` →
a próxima exclusão lê a revisão (1) → 200. Nada a migrar.

**Testes**: kids `tests/studio-cloud.test.ts` (a) `marks.set('p1', 1000, 5)` → `onDeleted` →
`removed[0].baseRevision === 5`, lápide `{sent:false, revision:5}`; (b) 409 com `currentRevision`
igual à conhecida → reenvia UMA vez, `fake.restored` vazio, `onRemoved` marca `sent`; (c) 409 sem
`currentRevision` decide pelo `download`; (d) revisão MAIOR (7 > 5) → restaura, `marks.revision 7`,
lápide limpa só depois; (e) `download` rejeita → lápide sobrevive; (f) `download` null → `sent`;
(g) lápide legada null → reenvio com a revisão da nuvem sem restaurar; (h) reconcile reenvia com
`remote.revision`. Espelhos em `pinta-cloud-persistence.test.ts` e `molda-cloud-persistence.test.ts`
(inclusive `removeMany`). `creations-sync.test.ts` (harness `remove(itemId, revision)`),
`creations-cloud.test.ts` (fake 409 com `details.currentRevision`; `readError`). members
`tests/integration/creations.test.ts`: 409 traz `details.currentRevision`; `DELETE` base 0 num item
revisão 1 → 409, base 1 → 200. member-shell (opcional): pass-through do 409.
**Follow-up registrado**: o `resolveStale` de UPLOAD (`studio-cloud.ts:329-345` e irmãos) assume que
linha apagada aceita qualquer base; com o `currentRevision` plumbado, `marks.set(id, …, currentRevision)`
no ramo `!downloaded`.

---

## F6. Estúdio: "Editar" do asset que está no projeto (Pinta E Molda, mão dupla)

**Achado.** O fio `onEditDrawing` está intacto (`studio-full-editor.tsx:183` → `/pinta?desenho=`),
mas: (1) o botão grande "✏️ Editar" morava na seção "Meus desenhos", que MORRE quando o host passa
`pintaLibrary` (`AssetsPanel.tsx:644`), sobrando só um link de 10px "✏️ editar desenho" no card
(`AssetsPanel.tsx:504-513`); (2) o botão exige que o id exista na BIBLIOTECA PESSOAL
(`editableDrawingIds`, `AssetsPanel.tsx:150-158`), e essa biblioteca (`sistema-zero-personal-assets-<ns>`)
é o ÚNICO store do kids que NÃO vai para a nuvem: em outro aparelho (ou storage limpo) o projeto
volta com `libId: personal:<id>` e sem registro pessoal → botão some para sempre e o "Trazer do
Pinta" só mostra "✓ no projeto" (sem reparo); (3) `AssetsPanel.tsx:121-133` não tem `.catch`: uma
rejeição deixa `personal` vazio em silêncio; (4) para o Molda não existe nada: "Modelos 3D"
(`AssetsPanel.tsx:584-637`) não tem botão, e `personalSync.ts:136,161,170` +
`projectStore.updateAssetImage` (2632-2652) são só-imagem.

**Desenho.**
- **`ProjectAsset.libOrigin?: 'pinta' | 'molda'`** (`packages/studio/src/core/project.ts`, sanitizado
  e preservado como o `libId`): gravado por `PintaImportDialog` (`'pinta'`), `MoldaImportDialog`
  (`'molda'`) e `addFromPersonal` (`PersonalAsset.origin ?? 'pinta'`). Legado sem `libOrigin`: origem
  do registro pessoal se existir, senão pelo `kind` (3D → molda; imagem → pinta).
- **Hosts**: `onEditDrawing(id)` fica (Pinta) e nasce `onEditCreation?: (creationId) => void` (Molda),
  molde exato do `studio/edit-drawing.ts` (contexto `studio/edit-creation.ts`, latch no `StudioCore`,
  prop em `studio/types.ts`, tipo no `index.ts`). Kids `studio-full-editor.tsx`: `openCreationInMolda(id)`
  → `window.open('/molda?criacao=' + id, '_blank', 'noopener,noreferrer')`, passado só com `moldaOwned`
  (`estudio/page.tsx` já calcula). `molda-client.tsx` já lê `?criacao=` (`:54-60`).
- **Botão de verdade** (`AssetsPanel.tsx`): "✏️ Editar" como botão (ícone + texto, alvo ≥ 32px, não
  link de 10px) no card de "No projeto" (imagens) E no card de "Modelos 3D", quando `libId` é
  `personal:*` e o callback da origem existe. NÃO exige mais o registro pessoal: ao clicar, se
  `getPersonalAsset(id)` não existe, REPARA primeiro (`savePersonalAsset({id, name, kind, origin,
  dataUrl, originalFileName, width, height})` a partir do asset do projeto) e só então abre o app;
  assim a guarda `getPersonalAsset` do `resyncToStudio` volta a passar em outro aparelho. Textura do
  Molda (imagem com `libOrigin: 'molda'`) abre o Molda, nunca o Pinta. `.catch` no efeito de carga
  (loga + mantém o que tinha).
- **Molda mão dupla**: `packages/molda/src/components/appContext.tsx` `MoldaHostAdapter.resyncToStudio?:
  (asset: MoldaExportedAsset) => Promise<{updated: boolean}>`; hook `components/editor/useStudioResync.ts`
  (porte do `pinta/src/components/editor/useStudioResync.ts`: só depois de SALVAR, debounced, nunca
  ao abrir) chamando `exportLoadedAssetForStudio(asset)` (variante pura de `exportAssetForStudio` em
  `export/studioLibrary.ts`, mesmo cache por `id\0updatedAt`); kids `molda-client.tsx` implementa com a
  guarda `getPersonalAsset(id)` (molde de `pinta-client.tsx:211-220`) + `savePersonalAsset({...,
  origin: 'molda'})`.
- **`personalSync` com 3D** (`packages/studio/src/asset-library/personalSync.ts`): `drawingNeedsSync`
  aceita `model3d`/`environment3d`; `mergeDrawingIntoAsset` para 3D leva `dataUrl` + `originalFileName`
  (sem ele o load DESCARTA o asset 3D, `core/project.ts:496-497`); `reconcileDrawingsFromRestoredProject`
  sem o filtro `kind === 'image'`; `projectStore.updateAssetImage` → `updateAssetData` (ramo 3D:
  `isValidAssetDataUrl(dataUrl, kind, originalFileName)`, teto `maxModel3DDataUrlChars` + orçamento
  total; nunca toca `name/id/libId/source`); o caminho de projeto FECHADO já confere o orçamento.
- `MoldaImportDialog`/`PintaImportDialog`: sem mudança de UX além do `libOrigin`.

**Testes**: `AssetsPanelEditDrawing.test.tsx` com `pintaLibrary` PRESENTE (seção morta e botão no
card); rejeição da carga não esconde o botão; `libId` sem registro pessoal → botão presente e o
clique repara (`savePersonalAsset` chamado) antes de abrir; card 3D do Molda com "Editar" chamando
`onEditCreation` com o id da criação; textura do Molda abre o Molda; `personalSync.test.ts` `describe`
3D (bytes iguais no-op; `.glb` novo chega ao projeto aberto e ao fechado; `originalFileName` sobrevive
ao `sanitizeProjectAssets`; estouro vai para `takeDrawingSyncFailures`); `projectStore` 3D valida
MIME × extensão × assinatura; molda `useStudioResync.test.tsx` (abrir não sincroniza, salvar sim);
kids `tests/molda-client.test.tsx` (guarda `getPersonalAsset`); `MoldaImportDialog.test.tsx` (botão
após importar); `core/project` sanitize do `libOrigin`.

---

## F1. Molda: "+ Nova cor" inunda a paleta

**Causa raiz.** `packages/molda/src/components/editor/model/ColorsPanel.tsx:115-123`: `<input
type="color">` escondido, não controlado (abre em `#000000`), com `onChange` do React (= evento
nativo `input`, disparado a cada passo do arrasto no seletor do sistema) → `onAddColor(hex)` a cada
passo → `addExtraColor` (dedup só por hex exato, `model/partOps.ts:396-408`) + `commit()`
(`ModelEditor.tsx:355-365`): uma extra e um passo de desfazer por pixel arrastado, até o teto de 48.
O `TextureEditor.tsx:243-257` reusa o painel (mesmo defeito). Conta-gotas, "Vestir com textura" e
sanitize NÃO são a causa (verificado). Regra da casa: seletor NATIVO fica (painel custom rejeitado);
o padrão certo já existe no `SkyEditor.tsx:39-66,120-151` (`useSkyGesture`: `replace` ao vivo, UM
`commitGesture` no fim).

**Desenho.** O "+" vira GESTO: o 1º `input` adiciona UMA extra (ou reaproveita a cor se já existir),
os seguintes só TROCAM a cor dessa extra no lugar (índice estável), via `editor.replace()`; o `change`
nativo (seletor fechou) ou o `blur` fecha com UM `commitGesture`.
- `partOps.ts`: `updateExtraColor(model, index, hex)` (no-op se índice não é extra, hex igual, ou hex
  já existe em qualquer índice: o sanitize deduplica e DESLOCARIA índices). `texture/ops.ts`:
  `updateTextureColor`. `addExtraColor`/`addTextureColor` normalizam o hex na entrada.
- `ColorsPanel.tsx`: props `onAddColorInput(hex)` + `onAddColorEnd()`; listener nativo `change` no
  elemento (`useEffect`, `queueMicrotask(onAddColorEnd)`: o nativo roda ANTES do React), `onBlur`
  como rede; o "+" faz `focus()` + `click()` no input (o blur vira rede real). Cabeçalho atualizado.
- `ModelEditor.tsx`: `colorGesture = useRef<{before, index|null, full?}>` PRÓPRIO (o `gestureBefore`
  do palco não pode ser compartilhado: o `pointerdown` no canvas roda antes do `blur`); 1º passo:
  `addExtraColor` + `setPaintColor(index)` (Pintar) ou `updatePart(color)` (Montar) uma vez; passos
  seguintes `updateExtraColor`; `end`: `commitGesture(before, after)` se mudou. Teto no meio do gesto:
  toast uma vez. `TextureEditor.tsx`: idêntico com `updateTextureColor` + `setColor`.
- Esc no seletor (sem `change`): a extra intermediária fica e o commit sai no `blur`; sem nenhum
  `input` nada é adicionado. Documentar.

**Testes**: `partOps.test.ts` `updateExtraColor` (índice estável, mesma referência sem mudança,
nunca duplica); `texture/ops.test.ts` idem; `ModelEditor.test.tsx` "N passos do seletor viram UMA
extra e UM desfazer" (`fireEvent.input` ×2 + `change` → `extraColors` de 1, `parts[0].color === 16`,
um Desfazer zera); `ModelEditor.paint.test.tsx` (undo habilitado após o gesto);
`TextureEditor.test.tsx` (um gesto → uma extra, lápis a escolhe, um desfazer apaga).

---

## F5. Pinta: arrastar uma forma no vetor seleciona o texto e trava

**Causas (com evidência em `packages/pinta/src/components/editor/vector/VectorStage.tsx`).**
- **Salto de layout DENTRO do gesto** (`EditorScreen.tsx:287-299` + `VectorSelectionBar.tsx:91-98`):
  a barra de seleção é irmã no FLUXO acima do palco e só existe com seleção (~54px). Em
  `handleShapePointerDown` (`VS:512-527`) o `start` é medido ANTES de `setSelectedIds` montar a barra;
  `svgPoint` relê o `getBoundingClientRect()` a cada evento → o 1º `pointermove` injeta um `dy` falso e
  a forma TELEPORTA; a criança pressiona onde a forma estava, acerta o fundo e vira LAÇO. Viola a
  regra da casa "nada que aparece/some com a seleção pode estar no fluxo do palco".
- **Laço guloso** (`VS:413-423`, `VS:789-809`): todo `pointerdown` no fundo com `select` é laço; caixa
  degenerada (`w < 2 && h < 2`, `&&`) ainda é laço; `boundsIntersect` com `<=`; `shapeBounds` do texto
  superestima (`geometry.ts:109-122`: 1 em acima da linha de base, largura por fator, giro ignorado);
  traço de pincel é `fill: 'none'` (`shapes.ts:108-112`) e só o fio é clicável; textos do mesmo
  `groupId` (`insertAsset.ts:126-129`) entram por `expandToGroups`.
- **Gesto que nunca termina = palco morto** (`VS:378,483,535,561,600,617` recusam com gesto vivo):
  `endGesture` só no `onPointerUp`/`onPointerCancel` do `<svg>` (`VS:955-956`), sem
  `onLostPointerCapture`, sem fallback no `document` (o helper `pointerDrag.ts addPointerDragListeners`
  existe e o `VectorLayerPanel` já usa); `safeSetPointerCapture` engole a falha (`core/pointer.ts`).
  Soltar fora do `<svg>` (alvo pequeno em zoom baixo) deixa `gestureRef` preso; um `vector-background`
  não tem `animationId/frameIndex` para o reset do `useEffect` (`VS:240-249`) → "trava" até recarregar.
- **Alças da união roubam o clique** (`VS:1244-1269`, sem `pointerEvents="none"`; `handleResizeDown`
  não checa `tool`; `stopPropagation` antes da checagem de trancada, `VS:536-542`).
- **Tempestade de render por movimento com texto** (`VectorLayerPanel` sem memo renderiza um `<svg>` +
  `<text>` por forma a cada `pointermove`; `useScrollMore.ts:24-32` `useLayoutEffect` sem deps força
  reflow; `doc` novo a cada render dispara o efeito de fontes `VectorEditorScope.tsx:501-504`).

**Desenho (tudo em `VectorStage.tsx` salvo indicação).**
1. Gesto sempre termina: `safeSetPointerCapture` devolve boolean; todo gesto instala
   `addPointerDragListeners(document, …)` (move/up/cancel) e `onLostPointerCapture` no `<svg>`; ao
   receber um `pointerdown` primário com gesto vivo cujo ponteiro já não está capturado, FINALIZA o
   gesto velho (commit do que já foi `replace`d) e começa o novo.
2. Deltas em coordenadas de CLIENTE: `gesture.startClient` e `dx = (clientX - startClient.x) / zoom`
   para mover/redimensionar/girar (o retângulo do `<svg>` pode mudar no meio do gesto). E a
   `VectorSelectionBar` sai do fluxo (overlay `absolute`, como as barras do pixel e do tilemap).
3. Hit-test ANTES do laço: no `select`, `hitShapeAt(visibleShapes(currentShapes()), at, 10 / zoom)`
   (`vector/pickColor.ts:52-65`, já infla pela espessura e desgira); acertou forma destrancada → gesto
   de MOVER (extrair `startMoveGesture(shape, event)` do `handleShapePointerDown`); senão laço.
4. Laço menos guloso: tap se `w < 2 || h < 2`; `boundsIntersect` estrito.
5. Caixa do texto mais justa: ascent/descent por família em `VECTOR_FONT_FAMILY_INFO` (`model.ts:137-143`),
   sem DOM.
6. Alças só com `tool === 'select'`; checagem de trancada ANTES do `stopPropagation`.
7. Perf barata: `memo` nas linhas/miniaturas do `VectorLayerPanel`; `useMemo(doc)` no
   `VectorEditorScope`; deps no `useLayoutEffect` do `useScrollMore`.

**Testes** (`vectorUi.test.tsx`, eventos em turnos separados, `getBoundingClientRect` re-stubado por
evento): "arrastar uma forma NÃO seleciona o texto"; "arrastar não teleporta quando a barra aparece"
(stub com `top` 54px maior a partir do 2º evento → move exatamente +10); "arrasto horizontal no fundo
não é laço"; "o gesto sempre termina" (up no `document` → novo gesto funciona); "soltar fora grava
UMA entrada de undo". `geometry.test.ts` (caixa do texto justa; laço degenerado; translate/scale de
texto); `pickColor.test.ts` (`hitShapeAt` pega forma vazada pela folga do traço); `vectorTools.test.ts`
(`expandToGroups` com texto do mesmo grupo continua junto, comportamento intencional).

---

## F2 + F3. Galeria do Molda: cabeçalho de seção (sem faixa branca) e hover sem corte

**Causa.** `packages/molda/src/components/gallery/GalleryScreen.tsx:150` `<header … border-b-2
bg-mld-surface>` (branco puro sobre o céu-suave) + faixa de busca separada + `<main … px-4 pb-6>`
SEM padding no topo (282) com a grade como 1º filho: o `.mld-pop:hover` (`molda.css:142-152`,
`translateY(-2px) scale(1.02)`) cresce ~4px acima da borda e o `overflow-y-auto` corta. Tokens,
barras do editor, wrappers do host e botões JÁ são espelhos exatos do Pinta (verificado).

**Desenho** (mesma receita do `pinta/GalleryScreen.tsx:364-376` e do `studio/ProjectList.tsx:321-341`):
- Raiz rolável `flex min-h-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6` contendo o cabeçalho de
  seção (`mb-5 flex flex-wrap items-end justify-between gap-3`, `h1 mld-display text-3xl md:text-4xl`,
  subtítulo `mt-1 text-sm md:text-base`, SEM fundo/borda), a linha de busca + chips (`mb-3`), o
  `role="status"` (sempre montado, único), os estados vazios e a grade
  `[grid-template-columns:repeat(auto-fill,minmax(164px,1fr))]` (regra de toque do Pinta). `<main>`
  vira `<div>` (o host já tem o `main`).
- `AssetCard.tsx`: `mld-gallery-card mld-panel mld-pop flex flex-col gap-1 p-2`, miniatura
  `aspect-[4/3] overflow-hidden rounded-lg bg-mld-bg` (sem `overflow-hidden` no `li`).
- Endurecimentos: `components/ui/Panel.tsx:31` ganha `shrink-0`; `.mld-scroll-y` (gêmeo do
  `.pin-scroll-y`) nas colunas direitas de `ModelEditor.tsx:488`, `TextureEditor.tsx:384`, `SkyEditor.tsx:442`.
- Contratos preservados: `h1` nível 1, `role="status"`, `searchbox`, filtros por `aria-label`, lista
  por `aria-label`, `getByLabelText(importJson)`; `e2e/model-editor.spec.ts:372` (`header` do editor)
  intacto. Teste novo em `MoldaApp.test.tsx`: cabeçalho dentro da raiz rolável e sem `bg-mld-surface`.

---

## F7. Admin: card do Molda em "Ferramentas e comunidades" (uso por aluno)

**Achado.** Zero menção a molda em `packages/admin`. Os cards são escolhidos por config
(`admin/src/lib/tool-usage.ts:43-77`: `ToolCardKind`, `SKU_TO_CARD`, `TOOL_CARD_ORDER`,
`ownedToolCards`) e desenhados um a um em `admin/src/components/members/usage-cards.tsx` (`ToolUsageGrid`
:185-206). O endpoint do members `GET /members/admin/members/:userId/tool-usage`
(`get-member-tool-usage.service.ts:42-50`) NÃO conta `molda`: o port
`domain/ports/tool-usage-repository.port.ts:31-34` tem `tool: 'studio' | 'pinta'` escrito à mão (um
7º espelho do union que ninguém guarda); o SQL (`tool-usage.repository.ts:55-88`) já é genérico.
Molda não tem bloco de aula → sem "entregas", só criações na nuvem.

**Desenho.**
- members: port `tool` = `CreationTool` (de `domain/creations/creation.ts`); serviço soma
  `moldaCreations` ao `Promise.all` e `molda: { creations, lastActivityAt }` ao DTO
  (`combineTool(created, undefined)`); fake `tests/fakes/tool-usage-in-memory.ts` idem.
- admin: `ToolCardKind` += `'molda'`; `SKU_TO_CARD.molda`; `TOOL_CARD_ORDER` = pensa, pinta, molda,
  estudio, clube, mural (ordem da jornada, como `kids/nav.ts`); `LearnerToolUsageView.molda?` OPCIONAL
  (members mais velho que o painel não pode derrubar o grid); `MoldaUsageCard` (ícone lucide `Box`,
  "N criação/criações na nuvem" + última atividade; `Unavailable` quando ausente); branch no
  `ToolUsageGrid`. BFF/gateway são pass-through: sem mudança.
- Conformidade: `community-kids/tests/molda-conformance.test.ts` passa a ler também
  `admin/src/lib/tool-usage.ts` (`SKU_TO_CARD` tem molda) e o port do members.
- Opcional (se ela quiser): contagem por tipo (modelos/texturas/céus) num método novo do repo.

**Testes**: `admin/tests/tool-usage.test.ts` (6 skus, ordem nova); novo `admin/tests/usage-cards.test.tsx`
(card do Molda; `usage.molda` ausente → "Indisponível agora"); members
`tests/integration/member-tool-usage.test.ts` (zeros com `molda`; caso com criações molda) e
`tests/db/tool-usage-sql.test.ts` (criação `tool: 'molda'` conta e não vaza).

---

## M. Malha no Molda (vértices, arestas e faces), M1 a M5

Referência de ideias: Blockbench (GPL: só ideias). Resumo do estudo: malha = `vertices` e `faces` em
mapas por chave (não índices), normais calculadas, quads e tris, ordem de desenho DERIVADA (sem
"gravata"), seleção FORA do elemento com `vertices` como lista mestra (um caminho só de
transformação), picking com pontos/linhas e viés de profundidade, alça no centro da seleção,
consertar DEPOIS e perguntar (côncavo/sobreposto) em vez de impedir, "Ajustar" depois da ação no
lugar de modal.

### Decisões
- **D1** `shape: 'mesh'` numa PEÇA (`MoldaPart.mesh?: MoldaMesh`; `from/to` DERIVADOS da caixa dos
  vértices por `meshBox`): `partMatrix`, `partBounds`, `findFreeSpot`, gêmeos, painéis, histórico e
  wire JSON (`{ ...part }`) valem sem mexer; asset antigo não muda um byte.
  ```ts
  export type MeshFaceKey = `f_${string}`
  export interface MeshFace { v: readonly string[] }        // 3 ou 4 chaves, CCW visto de fora
  export interface MoldaMesh { vertices: Record<string, Vec3>; faces: Record<MeshFaceKey, MeshFace> }
  export type FaceId = ShapeFaceId | MeshFaceKey              // a pele da face mora em part.faces['f_…']
  ```
- **D2** quads + tris, chaves curtas aleatórias, `orderQuad` (idempotente: round-trip dos templates),
  normal por Newell, sem aresta solta na v1.
- **D3** a face de malha vira "face de cubo" para atlas, pele, pintura e picking: `meshFaceFrame`
  (novo `model/meshFrame.ts`) devolve um `FaceFrame` plano (`s = p1 - p0`, normal de Newell,
  `t = cross(s, normal)`, invariante `cross(s,t) == -normal`); `planarFaceFrame` delega quando
  `shape === 'mesh'`; `faceSkinSize` = `skinDim(su) × skinDim(tv)`; `partFaces(part)` substitui
  `FACES_BY_SHAPE[part.shape]` em `sanitize.ts:294`, `pick.ts:272`, `texture/ops.ts:277`. Tri = o
  precedente da rampa (`px/nx` são triângulos numa pele retangular). Sem UV livre/ilhas.
- **D4** seleção no `sessionStore` (`meshEditId`, `meshSelectMode`, `meshSelection {vertices, edges,
  faces}`, `meshAdditive`), vértices como lista mestra, conversão entre modos (`selectionForMode`).
- **D5** sub-modo "Editar malha" dentro do Montar: Pontos / Arestas / Faces, "Somar à seleção",
  Puxar (extrude de faces e arestas), Cortar no meio (loop cut), Juntar pontos, Fechar face, Virar
  face, Apagar seleção, Pronto; alça = só mover. Fora: faca, proporcional, extrude de vértice, seams.
- **D6** vértices sempre no `snap` e na grade; delta arredondado em coordenadas da caixa; loop cut
  que cai fora do encaixe liga o meio bloco no MESMO commit (toast).
- **D7** "Transformar em malha" (`boxToMesh`: 8 vértices/6 quads com frames IDÊNTICOS aos da caixa,
  pele migra sem re-amostrar; rampa idem; cilindro/bola pela geometria, pele curva perdida com toast);
  5ª forma "Malha" = caixa 2×2×2 já convertida.
- **D8** `meshIssues` depois de cada commit (quad côncavo/não plano, vértices sobrepostos, face
  virada) → toast com AÇÕES (`Toast` ganha `actions`): Dividir / Juntar / Virar / Desfazer / Deixar.
- **D9** orçamento por TRIÂNGULOS: `maxTriangles 20_000`, `maxMeshVertices 1_024`, `maxMeshFaces 1_024`
  (20 000 × 136 chars + atlas < 7 M chars; 60 000 vértices < `MAX_UINT16_VERTICES`); `maxParts` fica;
  sanitize derruba a peça que estoura; operação acima do teto devolve `null` + toast.
- **D10** gêmeo de malha = `x → -x` + ciclo invertido começando em `p1` (o `flipU`/`flipSkinH`/
  `width-1-x` atuais valem sem mudança; `MIRRORED_FACE` identidade para `f_`).
- **D11** pintura: o gesto já é genérico sobre `TexelHit`; `faceContains` (plano + par-ímpar) para
  malha; espelho de pintura pelo PONTO espelhado (mais geral que normal+centro). Extra: "Girar pele
  da face" (`rotateSkin90`).
- **D12** `buildPartGeometry` produz o mesmo `PartGeometry`: `build.ts`, `glb.ts`, `isoThumb.ts`,
  `pickModelRay` intactos; `geometryHash` do palco enxerga o `mesh` por identidade (`WeakMap`).
- **D13** desfazer: clique = `commit`; arrasto = `replace` + `commitGesture`; painel "Ajustar"
  (distância do Puxar, posição do corte) reexecuta sobre o `before` via `editor.amend(next)` novo
  (aplica sem `history.record`, agenda autosave) = um passo só.
- **D14** copy em `COPY.editor.model.mesh` (Pontos/Arestas/Faces, Editar malha, Transformar em
  malha, Puxar, Cortar no meio, Juntar pontos, Fechar face, Virar face, Pronto, Somar à seleção,
  Ajustar, avisos), status com triângulos e teto acima de 50%.
- **Compat**: `sanitize` passa a PRESERVAR peça de forma desconhecida em vez de descartar (uma aba
  velha durante o deploy não pode regravar o asset sem a malha). Fazer ANTES de M1 chegar à nuvem.

### Lotes (cada um fecha com typecheck + testes + biome + QA no playground :5198)
- **M1 núcleo puro**: `core/model.ts`, `core/limits.ts`, `model/mesh.ts` (chaves, `boxMesh`, `meshBox`,
  `normalizeMesh` idempotente, `orderQuad`, `faceNormal`, `meshEdges`, `meshTriangleCount`,
  `meshIssues`), `model/meshFrame.ts`, `shapes.ts partFaces`, `geometry.ts` (quad = 2 tris,
  `partTriangleCount`), `pick.ts faceContains`, `twins.ts mirrorMesh`, `partOps.ts` (`setPartBox` para
  malha, `boxToMesh`), `sanitize.ts` (ramo mesh, teto de triângulos, forma desconhecida preservada),
  `bytes.ts`, `texture/ops.ts`, `templates/builders.ts` (`mesh?`), `assets/index.ts`, copy. Testes:
  `mesh.test.ts`, `meshFrame.test.ts` (cubo-malha ≡ caixa; Raycaster do three acerta), `twins`,
  `sanitize` (round-trip; face quebrada cai sem derrubar a peça; teto), `pick`, `assetJson`, `glb`
  (MEDIÇÃO 20 000 tris + atlas cheio ≤ 7 M chars), `isoThumb`, `catalog` intacto.
- **M2 palco**: `sessionStore` (seleção), `model/meshSelection.ts`, `model/meshOps.ts`
  (`moveMeshVertices`, `deleteMeshSelection`), `viewport/meshEditOverlay.ts` (`Points` + `LineSegments`
  filhos do mesh da peça; `pick(raycaster, tolPx)` com tolerância em MUNDO derivada de pixels, 8 px
  mouse / 14 px toque, vértice > aresta > face, nada atrás da superfície), `MoldaViewport.ts`
  (`setMeshEdit`, alça presa a um `Object3D` âncora no centro da seleção com o quaternion alinhado à
  normal média, `onGizmoObjectChange` ramo malha), `viewport/types.ts` + `fakeViewport`,
  `MeshToolbox.tsx`, `Toolbox.tsx` (5ª forma + Editar/Transformar), `PropertiesPanel.tsx` (contagens;
  steppers do ponto selecionado), `ModelEditor.tsx`, atalhos (1/2/3 modo, Esc = Pronto, Delete =
  seleção). Testes: `meshSelection`, `meshOps`, `meshEditOverlay` (Raycaster real), `ModelEditor.mesh.test.tsx`
  (palco falso); e2e novo em `e2e/model-editor.spec.ts` (projeta o vértice pela câmera e arrasta).
- **M3 ferramentas**: `meshOps.ts` `extrudeFaces`/`extrudeEdges` (clona ao longo da normal média,
  faces sobem, laterais só nas arestas de BORDA, seleção vira as novas), `loopCut` (vértice central
  memoizado por aresta, pele dividida por `reprojectSkin`), `mergeVertices`, `createFace`, `flipFaces`,
  `splitQuad`; `skinOps.ts reprojectSkin/rotateSkin90`; `meshIssues` + `applyFix`; `Toast` com
  ações; `editorStore.amend`; `AmendPanel` inline. Testes de invariantes (malha fechada continua
  fechada; laterais só na borda; cubo cortado = 10 faces; merge derruba degeneradas; flip espelha a
  pele; cada `applyFix` zera o problema; amend = uma entrada). QA "casa de uma malha só".
- **M4 pintar na malha**: `faceContains` côncavo, "Girar pele da face", espelho; testes `stroke`
  (face girada; espelho na face espelhada e no gêmeo), `atlas` (500 faces empacotam ou `atlas-full`
  sem sumir peça), `texture/ops` (Vestir veste todas as faces); e2e toque em face de malha.
- **M5 polimento**: "Ver arestas" em todo o modelo, peça em edição `DoubleSide` (face virada aparece
  escura), template pronto com malha (cristal), e2e de toque (14 px), perf 128 peças + malha de 1 000
  faces, `packages/molda/CLAUDE.md` + adendo em `docs/plans/2026-09-04-molda-design.md`, status com
  teto de triângulos.

### Extras (decisão dela: baratos + seleção múltipla), depois de M5
1. **Setas do teclado** empurram a peça um encaixe (Shift = 5). 2. **Trancar/esconder peça**
   (`locked?`/`hidden?` sanitizados; raycast, pintura e alça respeitam; cadeado/olho no `PartsPanel`;
   export inclui tudo). 3. **Ver arestas** (wireframe) em todo o modelo (se não entrou no M5).
   4. **Pivô ajustável** (`origin` já existe em `model.ts:74`, sem UI): steppers em Propriedades + alça.
   5. **Seleção múltipla de peças**: "Somar à seleção" (Shift no desktop), alça no centro do grupo,
   duplicar/apagar/mover em grupo (`selectedIds` no `sessionStore`, `PartsPanel` com multi).
   Registrados para depois: pintar a face de perto (PixelStage), pele lisa vira swatch, foto do palco,
   desenho de referência, snap de vértice entre peças, duplicar em linha, alinhar ao chão.

### Riscos
Picking com 128 peças (overlay só na peça em edição); atlas crescendo (fallback `atlas-full`);
toque no tablet (validar cedo, 14 px + Somar à seleção); tetos do Estúdio (medidos em teste);
round-trip byte-a-byte dos templates (`normalizeMesh` = a MESMA função no builder); compat de aba
velha (sanitize preserva forma desconhecida); face virada (issues + Virar + `DoubleSide`); frames
degenerados no arrasto (`meshFaceFrame` null → face pulada ao vivo, removida no commit); orçamento
de desfazer (`assetBytes` conta a malha).

---

## Verificação

- **Por pacote**: `bun run typecheck && bun test src|tests && bun run check` em molda, pinta, studio,
  community-kids (`bun test tests`), members (+ `tests/db` se houver `TEST_DATABASE_URL`), member-shell,
  admin. Rodar pacote SOZINHO antes de investigar flake de contenção.
- **F4 (Estúdio na nuvem)**: kids `:3008` com members no ar: criar jogo, esperar "Guardado na sua
  conta", apagar; DevTools: `DELETE /api/creations/studio/<id>` com `baseRevision` > 0 → 200; voltar
  à lista e F5: o card NÃO volta. Conflito real (2 perfis/aparelhos): editar no B depois do último
  sync do A, apagar no A → volta no A com o aviso no console.
- **F6**: kids `:3008`: Trazer do Pinta → "✏️ Editar" abre `/pinta?desenho=`; salvar no Pinta → o
  jogo atualiza sozinho; Trazer do Molda (modelo, céu, textura) → "Editar" abre `/molda?criacao=`;
  salvar no Molda → o `.glb`/`.hdr`/`.png` do projeto atualiza (bytes novos, nome intacto);
  limpar a biblioteca pessoal (IndexedDB) e clicar "Editar" → repara e abre.
- **F1/F2/F3**: playground do Molda `:5198` (Chrome): Pintar → "+" → arrastar no seletor → fechar:
  UM swatch, "Salvo", Ctrl+Z tira de uma vez; Esc: swatch fica, commit ao clicar fora; textura idem;
  galeria sem faixa branca, hover do 1º card inteiro, tema escuro, colunas direitas sem barra clássica.
- **F5**: playground do Pinta `:5199`: vetor com retângulo + texto: arrastar o retângulo não
  seleciona o texto; soltar fora do palco e voltar a arrastar; arrastar horizontal no fundo não seleciona.
- **F7**: admin `:3005` (members local): ficha de aluno com o produto `molda` mostra o card com
  "N criações na nuvem"; sem o produto, sem card.
- **M/extras**: QA no playground a cada lote (roteiro nos lotes) + e2e Playwright do molda.
- Nada é commitado sem pedido; ao pedir, `git add` por caminho (árvore tem WIP concorrente).
