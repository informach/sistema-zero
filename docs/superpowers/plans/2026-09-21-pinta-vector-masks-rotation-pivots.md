# Máscaras e âncoras de rotação no Pinta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar máscaras geométricas não destrutivas e âncoras de rotação livres ao editor
vetorial do Pinta, com paridade entre edição, animação e exportação.

**Architecture:** Dois campos opcionais ampliam o modelo plano atual: `rotationPivot` guarda o
pivô absoluto, e `maskId` liga cada conteúdo à forma que o recorta. Helpers puros resolvem relações,
geometria e cena; o palco React e o exportador textual consomem a mesma resolução SVG. Máscaras não
substituem `groupId`, portanto grupos existentes continuam intactos.

**Tech Stack:** TypeScript estrito, React, SVG `clipPath`, Bun Test, Testing Library, happy-dom,
Biome.

**Spec:** `docs/plans/2026-09-21-pinta-vector-masks-rotation-pivots-design.md`

## Global Constraints

- Máscaras são não destrutivas, removíveis, geométricas e limitadas a uma relação por forma.
- Retângulo, elipse, polígono e caminho fechado podem servir como máscara; linha, texto, imagem e
  caminho aberto não podem.
- Máscaras aninhadas e transparência suave ficam fora desta entrega.
- Mover a âncora preserva a pose visível; mover, redimensionar e espelhar o objeto transforma também
  a âncora.
- Campos ausentes preservam byte a byte a semântica dos projetos antigos.
- Um gesto gera no máximo uma entrada no histórico; gesto sem mudança não gera entrada.
- Forma bloqueada nunca muda nem sai do documento. Uma máscara com membro bloqueado não pode sofrer
  transformação parcial.
- Editor, miniaturas, SVG, PNG, GIF, spritesheet, ZIP e Studio devem usar a mesma cena resolvida.
- Nenhuma dependência nova.
- Trabalhar no branch local `staging`. Não fazer push nem deploy.

---

## File map

- `packages/pinta/src/vector/model.ts`: campos opcionais e sanitização individual.
- `packages/pinta/src/vector/mask.ts` (novo): validade, relações, mutações e resolução da cena
  mascarada.
- `packages/pinta/src/vector/geometry.ts`: pivô efetivo e transformações que preservam a pose.
- `packages/pinta/src/vector/svg.ts`, `packages/pinta/src/vector/VectorFrameSvg.tsx`: `clipPath` e
  paridade entre SVG textual e React.
- `packages/pinta/src/vector/{hitTest,pickColor,gradient,flatten}.ts`: consumidores do pivô e do
  recorte.
- `packages/pinta/src/core/project.ts`: validação das relações depois de garantir IDs únicos.
- `packages/pinta/src/animation/frames.ts`: remapeamento de `maskId` ao duplicar quadros e animações.
- `packages/pinta/src/export/{animatedSvg,vectorSheet}.ts`: exportação fiel das novas propriedades.
- `packages/pinta/src/components/editor/vector/vectorTools.ts`: fechamento de seleção e clonagem.
- `packages/pinta/src/components/editor/vector/VectorEditorScope.tsx`: comandos e modo de edição da
  máscara.
- `packages/pinta/src/components/editor/vector/{VectorStage,VectorSelectionBar,VectorLayerPanel}.tsx`:
  interação, alvos e ações.
- `packages/pinta/src/core/copy.ts`, `packages/pinta/src/components/ui/icons.ts`: rótulos e ícones.
- Testes ficam ao lado dos módulos; o fluxo integrado permanece em
  `packages/pinta/src/components/editor/vectorUi.test.tsx`.

### Task 1: Contrato persistido e domínio puro da máscara

**Files:**
- Create: `packages/pinta/src/vector/mask.ts`
- Create: `packages/pinta/src/vector/mask.test.ts`
- Modify: `packages/pinta/src/vector/model.ts`
- Modify: `packages/pinta/src/vector/model.test.ts`
- Modify: `packages/pinta/src/core/project.ts`
- Test: `packages/pinta/src/core/project.test.ts`

**Interfaces:**
- Produces: `rotationPivot?: Vec2` and `maskId?: string` on `VectorShapeBase`.
- Produces: `type MaskRefusal = 'needs-two' | 'locked' | 'unsupported-source' |
  'already-masked' | 'nested-mask'`.
- Produces: `isMaskCapable(shape: VectorShape): boolean`.
- Produces: `applyMask(shapes: readonly VectorShape[], ids: readonly string[]):
  {ok:true; shapes:VectorShape[]; maskId:string} | {ok:false; reason:MaskRefusal}`.
- Produces: `releaseMasks(shapes: readonly VectorShape[], ids: readonly string[]):
  VectorShape[] | null`.
- Produces: `sanitizeMaskReferences(shapes: VectorShape[]): VectorShape[]`.
- Produces: `maskSourceIds`, `maskMembers`, `resolveMaskScene` and `clipPathId` for later tasks.

- [ ] **Step 1: Write failing model and mask tests.** Cover finite `rotationPivot`, safe `maskId`,
  invalid values omitted, eligible closed shapes, topmost selected source, retained `groupId`, release,
  locked selection, existing relation, unsupported source, self-reference, missing source, cycles and
  nested masks.

```ts
const applied = applyMask([firefly, circle], ['firefly', 'circle'])
expect(applied).toMatchObject({ ok: true, maskId: 'circle' })
if (applied.ok) {
  expect(applied.shapes[0]).toMatchObject({ id: 'firefly', maskId: 'circle' })
  expect(applied.shapes[1]).not.toHaveProperty('maskId')
}
expect(sanitizeVectorShape({ ...rectRaw, rotationPivot: { x: 12, y: -4 } }))
  .toMatchObject({ rotationPivot: { x: 12, y: -4 } })
```

- [ ] **Step 2: Run the tests red.** From `packages/pinta`, run
  `bun test src/vector/model.test.ts src/vector/mask.test.ts src/core/project.test.ts`. Expect missing
  fields/functions and unsanitized references to fail.
- [ ] **Step 3: Add optional fields to the model.** Validate finite pivot coordinates with `isVec2`
  and safe mask IDs with `isSafeVectorId`. Emit neither key for invalid or absent input. Update the
  `rotation` comment to refer to `rotationPivot ?? boundsCenter(shapeBounds(shape))`.
- [ ] **Step 4: Implement mask eligibility and mutations.** Use `flattenPathD` to require every
  subpath of a path to end in `Z`. `applyMask` chooses the selected shape with the greatest document
  index, rejects every unsupported state before changing data, and adds `maskId` only to the other
  selected shapes. `releaseMasks` removes references for any selected source or member and returns
  `null` on no-op.

```ts
export function isMaskCapable(shape: VectorShape): boolean {
  if (shape.type === 'rect' || shape.type === 'ellipse' || shape.type === 'polygon') return true
  if (shape.type !== 'path') return false
  const paths = flattenPathD(shape.d)
  return Boolean(paths?.length && paths.every((path) => path.closed))
}
```

- [ ] **Step 5: Implement frame-level recovery.** Build the ID map after `ensureUniqueIds`, then
  remove `maskId` when the source is absent, unsupported, the same shape, itself masked, or part of a
  cycle. Preserve valid one-source-to-many-content relations. Call this normalizer from
  `sanitizeVectorFrame`.
- [ ] **Step 6: Run green and commit.** Run the targeted tests, `bun run typecheck`, and
  `git diff --check`. Commit with
  `git commit -m "feat(pinta): persist non-destructive vector masks"`.

### Task 2: Geometria correta da âncora de rotação

**Files:**
- Modify: `packages/pinta/src/vector/geometry.ts`
- Modify: `packages/pinta/src/vector/geometry.test.ts`
- Modify: `packages/pinta/src/vector/svg.ts`
- Modify: `packages/pinta/src/vector/svg.test.ts`
- Modify: `packages/pinta/src/vector/pickColor.ts`
- Modify: `packages/pinta/src/vector/pickColor.test.ts`
- Modify: `packages/pinta/src/vector/gradient.ts`
- Modify: `packages/pinta/src/vector/gradient.test.ts`
- Modify: `packages/pinta/src/vector/flatten.ts`
- Modify: `packages/pinta/src/vector/flatten.test.ts`
- Modify: `packages/pinta/src/vector/pathNodes.ts`
- Modify: `packages/pinta/src/vector/pathNodes.test.ts`

**Interfaces:**
- Produces: `rotationPivotOf(shape: VectorShape): Vec2`.
- Produces: `selectionRotationPivot(shapes: readonly VectorShape[]): Vec2`.
- Produces: `setRotationPivotPreservingAppearance(shape: VectorShape, pivot: Vec2): VectorShape`.
- Produces: `resetRotationPivotPreservingAppearance(shape: VectorShape): VectorShape`.
- Updates: `translateShape`, `scaleShape`, `flipShape`, `rotateShapesAround`.

- [ ] **Step 1: Write failing pivot tests.** Assert default center compatibility, a pivot outside the
  bounds, no visual jump while moving the pivot at rotations `0`, `45` and `90`, a common group
  pivot, reset to center, translation, resize, flip and group rotation. Compare transformed sample
  points before and after moving/resetting the pivot.

```ts
const rotated = { ...box('a', 20, 10), rotation: 90 }
const anchored = setRotationPivotPreservingAppearance(rotated, { x: 20, y: 10 })
expect(renderedPoint(anchored, { x: 25, y: 15 }))
  .toEqual(renderedPoint(rotated, { x: 25, y: 15 }))
expect(rotationPivotOf(anchored)).toEqual({ x: 20, y: 10 })
```

- [ ] **Step 2: Run red.** Run
  `bun test src/vector/geometry.test.ts src/vector/svg.test.ts src/vector/pickColor.test.ts src/vector/gradient.test.ts src/vector/flatten.test.ts src/vector/pathNodes.test.ts`.
- [ ] **Step 3: Implement the pivot helpers.** `rotationPivotOf` returns the explicit point or bounds
  center. For a new pivot `n`, old pivot `o`, angle `r`, translate the stored geometry by
  `(I - R(-r)) · (n - o)`, then write `rotationPivot: n`. Resetting solves the moving-center case with
  translation `(R(r) - I) · (center - o)` before dropping the field.
- [ ] **Step 4: Carry the pivot through transformations.** Make `translateShape` translate an
  explicit pivot, `scaleShape` scale it around the resize anchor, and `flipShape` mirror it. Make
  `rotateShapesAround` orbit `rotationPivotOf(shape)` around the common pivot before adding degrees.
  Preserve the existing no-op/identity fast paths.
- [ ] **Step 5: Replace every center-only rotation consumer.** Use `rotationPivotOf` in
  `shapeCommonAttrs`, `localPoint`, gradient document/local conversion and `shapeToPoly`. Preserve
  `rotationPivot`, `maskId` and `locked` when `pathNodes` rebuilds a shape.
- [ ] **Step 6: Run green and commit.** Run the targeted tests plus `bun run typecheck` and
  `git diff --check`. Commit with
  `git commit -m "feat(pinta): support custom vector rotation pivots"`.

### Task 3: Seleção relacional, cópia e animação

**Files:**
- Modify: `packages/pinta/src/components/editor/vector/vectorTools.ts`
- Modify: `packages/pinta/src/components/editor/vector/vectorTools.test.ts`
- Modify: `packages/pinta/src/animation/frames.ts`
- Modify: `packages/pinta/src/animation/framesVector.test.ts`

**Interfaces:**
- Consumes: mask relation helpers from Task 1 and pivot-aware transforms from Task 2.
- Produces: `expandToSelectionUnits(shapes: readonly VectorShape[], ids: readonly string[]):
  string[]`.
- Produces: `remapMaskIds(shapes: readonly VectorShape[], ids: ReadonlyMap<string,string>):
  VectorShape[]` in `mask.ts`.
- Updates: `cloneShapesWithNewIds`, `fitPastedShapes`, `duplicateFrame`, `duplicateAnimation`.

- [ ] **Step 1: Write failing relation and clone tests.** Cover selecting a mask source/member,
  transitive group-plus-mask closure, locked mask member retained for the guard, copied relation
  pointing only to copied IDs, orphan relation removed, translated pivot, frame duplication preserving
  `motionId`, and animation duplication replacing `motionId` consistently across frames.

```ts
const copies = cloneShapesWithNewIds([content, source], 12, 8)
const copiedSource = copies.find((shape) => shape.id === copies[0]?.maskId)
expect(copiedSource).toBeTruthy()
expect(copies[0]?.maskId).not.toBe(source.id)
```

- [ ] **Step 2: Run red.** Run
  `bun test src/components/editor/vector/vectorTools.test.ts src/animation/framesVector.test.ts`.
- [ ] **Step 3: Implement fixed-point selection expansion.** Alternate existing group expansion and
  mask forward/reverse expansion until the ID set stops growing. Preserve the current rule that an
  implicit group expansion skips locked members, but always include every member of a masked unit so
  the editor can block partial transformations.
- [ ] **Step 4: Remap relations in two passes.** Allocate every new shape ID first. Clone shapes in a
  second pass, replacing `maskId` only when its source exists in the same cloned set; otherwise omit
  it. Continue to remap `groupId` per clone set and `motionId` according to the caller's existing
  contract.

```ts
const ids = new Map(frame.map((shape) => [shape.id, newId()]))
const copy = frame.map((shape) => {
  const { maskId: oldMaskId, ...base } = shape
  return {
    ...base,
    id: ids.get(shape.id) as string,
    ...(oldMaskId && ids.has(oldMaskId) ? { maskId: ids.get(oldMaskId) as string } : {}),
  } as VectorShape
})
```

- [ ] **Step 5: Run green and commit.** Run targeted tests, `bun run typecheck`, and
  `git diff --check`. Commit with
  `git commit -m "fix(pinta): preserve masks across selection and cloning"`.

### Task 4: Cena SVG única, hit-test e exportações estáticas

**Files:**
- Modify: `packages/pinta/src/vector/mask.ts`
- Modify: `packages/pinta/src/vector/mask.test.ts`
- Modify: `packages/pinta/src/vector/svg.ts`
- Modify: `packages/pinta/src/vector/svg.test.ts`
- Modify: `packages/pinta/src/vector/VectorFrameSvg.tsx`
- Modify: `packages/pinta/src/vector/hitTest.ts`
- Modify: `packages/pinta/src/vector/hitTest.test.ts`
- Modify: `packages/pinta/src/vector/pickColor.ts`
- Modify: `packages/pinta/src/vector/pickColor.test.ts`
- Modify: `packages/pinta/src/export/vectorSheet.ts`
- Modify: `packages/pinta/src/export/vectorSheet.test.ts`

**Interfaces:**
- Consumes: `resolveMaskScene`, `clipPathId`, `rotationPivotOf`.
- Produces: `sceneDefsMarkup(shapes: VectorShape[], idPrefix?: string): string`.
- Produces: React `SceneDefs({shapes})` next to `ShapeElement`.
- Updates: `shapesToMarkup` to emit only `scene.painted` and apply `clip-path`.
- Produces: `pointPassesMask(scene, shape, point): boolean` for hit and color picking.

- [ ] **Step 1: Write failing scene tests.** Verify one `<clipPath>` per used source, source omitted
  from paint, content retains its Z position, prefix safety, custom source pivot, a hidden source still
  available to visible content, hidden content omitted, and no mask defs when every member is hidden.
  Verify React and string attributes match.

```ts
const svg = vectorToSvg({ width: 100, height: 100, shapes: masked })
expect(svg).toContain('<clipPath id="pin-mask-window">')
expect(svg).toContain('clip-path="url(#pin-mask-window)"')
expect(svg.match(/<ellipse/g)).toHaveLength(1) // definição, não pintura normal
```

- [ ] **Step 2: Run red.** Run
  `bun test src/vector/mask.test.ts src/vector/svg.test.ts src/vector/hitTest.test.ts src/vector/pickColor.test.ts src/export/vectorSheet.test.ts`.
- [ ] **Step 3: Implement scene resolution.** Resolve visible painted shapes separately from required
  mask sources. Build clip geometry from `shapeGeometryAttrs` plus only the rotation transform; force
  a solid clip fill and omit source fill, stroke, opacity and its own mask link. Prefix clip IDs like
  gradient IDs.
- [ ] **Step 4: Share the scene with React.** Add `SceneDefs` for gradients and masks, convert
  `clip-path` to React's `clipPath`, and render `scene.painted` in `VectorFrameSvg` and `VectorStage`.
  Keep `ShapeElement` usable for a standalone layer thumbnail.
- [ ] **Step 5: Respect clipping in picking.** Flatten the source with `shapeToPoly`, then call
  `pointInPoly`. `hitMovableShapeAt` and `hitShapeAt` skip source shapes and reject content outside
  the clip. A missing invalid source falls back to unmasked content, matching sanitizer recovery.
- [ ] **Step 6: Wire static export funnels.** Replace top-level gradient-only defs in vector sheets
  with `sceneDefsMarkup`; keep shape IDs unique across cells. Static SVG, portable SVG, raster, ZIP and
  Studio then inherit the same markup without separate implementations.
- [ ] **Step 7: Run green and commit.** Run targeted tests, `bun run typecheck`, and
  `git diff --check`. Commit with
  `git commit -m "feat(pinta): render vector masks across previews and exports"`.

### Task 5: Comandos, barras e painel de camadas

**Files:**
- Modify: `packages/pinta/src/components/editor/vector/VectorEditorScope.tsx`
- Modify: `packages/pinta/src/components/editor/vector/VectorSelectionBar.tsx`
- Modify: `packages/pinta/src/components/editor/vector/VectorLayerPanel.tsx`
- Modify: `packages/pinta/src/components/editor/vector/VectorStage.tsx`
- Modify: `packages/pinta/src/core/copy.ts`
- Modify: `packages/pinta/src/components/ui/icons.ts`
- Test: `packages/pinta/src/components/editor/vectorUi.test.tsx`

**Interfaces:**
- Consumes: `applyMask`, `releaseMasks`, `expandToSelectionUnits`, mask query helpers.
- Produces in `VectorEditorContextValue`: `maskEditId`, `createMaskSelected()`, `beginMaskEdit()`,
  `endMaskEdit()`, `releaseMaskSelected()` and `centerSelectionPivot()`.
- Produces copy: `selCreateMask`, `selEditMask`, `selReleaseMask`, `selCenterPivot`,
  `maskEditMode`, `maskEditDone`, `rotationPivot`, `rotationPivotKeyboard`, refusal messages and
  `maskLayer`.

- [ ] **Step 1: Write failing UI command tests.** Select firefly plus front ellipse, click **Criar
  máscara**, assert the content gets `maskId`, one undo restores both, and redo reapplies. Cover every
  refusal, **Soltar máscara**, locked members, pathfinder refusal until release, and the same actions in
  desktop and narrow layouts.
- [ ] **Step 2: Run red.** Run
  `bun test src/components/editor/vectorUi.test.tsx -t 'máscara vetorial'`.
- [ ] **Step 3: Add scope state and commands.** Map every `MaskRefusal` exhaustively to copy. Keep
  `maskEditId` only while its source and at least one member exist. Apply/release through one
  `commitShapes` call. Make `freeSelectedIds` reject a masked unit containing any locked member so
  style, delete and transform cannot split it.
- [ ] **Step 4: Replace selection entry points.** Canvas click, marquee and layer click use
  `expandToSelectionUnits`. Ordering from a layer handle passes the expanded unit to `dropShapesOrder`.
  Eye and lock actions update the complete masked unit; hiding deselects it, and locking removes it
  from action selection.
- [ ] **Step 5: Add desktop and touch actions.** Use `SquareDashed` for create, `SquarePen` for edit,
  `Unlink2` for release and `CircleDot` for centralize. Show only actions valid for the current state,
  but keep refusal-capable **Criar máscara** enabled when two shapes are selected so its toast teaches
  the correction.
- [ ] **Step 6: Mark mask sources in layers.** Append `— Máscara` to the source label, add a visual
  accent independent of `groupId`, and keep its standalone thumbnail visible even though the source
  is absent from the composed art.
- [ ] **Step 7: Run green and commit.** Run the targeted UI tests, `bun run typecheck`, and
  `git diff --check`. Commit with
  `git commit -m "feat(pinta): add mask controls to the vector editor"`.

### Task 6: Edição da máscara e alvo arrastável da âncora

**Files:**
- Modify: `packages/pinta/src/components/editor/vector/VectorStage.tsx`
- Modify: `packages/pinta/src/components/editor/vector/VectorEditorScope.tsx`
- Test: `packages/pinta/src/components/editor/vectorUi.test.tsx`
- Test: `packages/pinta/src/vector/geometry.test.ts`

**Interfaces:**
- Consumes: scope mode from Task 5 and pivot helpers from Task 2.
- Adds gesture: `{kind:'pivot'; pointerId; startClient; docPerPx; base; baseShapes}`.
- Uses `maskEditId` to replace the normal transform selection with only the source shape.

- [ ] **Step 1: Write failing interaction tests.** Cover entering mask edit mode, dashed source guide,
  content staying fixed while source moves/resizes/rotates, **Concluir**, Esc, selection/frame change,
  and undo/release while editing. Cover dragging the pivot to a corner and outside the object, one
  undo, no-op click, pointer cancel, locked selection, group/common pivot, touch pointer isolation and
  **Centralizar âncora**.

```tsx
fireEvent.pointerDown(screen.getByLabelText(COPY.vector.rotationPivot), {
  pointerId: 7, pointerType: 'touch', clientX: 100, clientY: 100,
})
fireEvent.pointerMove(stage, {
  pointerId: 7, pointerType: 'touch', clientX: 140, clientY: 80,
})
fireEvent.pointerUp(stage, { pointerId: 7, pointerType: 'touch' })
expect(currentShape().rotationPivot).toEqual(expectedDocumentPoint)
```

- [ ] **Step 2: Run red.** Run
  `bun test src/components/editor/vectorUi.test.tsx -t 'editar máscara|âncora de rotação'`.
- [ ] **Step 3: Render mask edit mode.** Draw the source as a cyan dashed, unfilled, pointer-neutral
  guide above the composed scene. Display a compact **Editando a máscara / Concluir** banner. While
  active, compute bounds and gestures from `[maskSource]`; suppress normal selection/drawing and keep
  the content untouched.
- [ ] **Step 4: Render and drag the pivot target.** Use `selectionRotationPivot` for one or many
  transform shapes. Draw a fixed-screen `CircleDot`-style SVG target and a line to the selection
  center. Start from the asset and base shapes, apply
  `setRotationPivotPreservingAppearance(baseShape, pointerPoint)` on every move with `recordUndo=false`,
  then call `commitGesture(base)` once on pointer-up. Pointer cancel restores `base`.
- [ ] **Step 5: Make rotation and outlines use the chosen point.** Pass the effective pivot to
  `handleRotateDown`. Rotate a single selection outline around `rotationPivotOf(single)`; keep the
  existing axis-aligned multi-selection box. Hide the target during drawing, node editing, gradient
  editing and incompatible gestures.
- [ ] **Step 6: Add keyboard access.** Give the SVG pivot target `role="button"`, an accessible
  description, and arrow-key movement of one document unit (`Shift` = ten). Each key press commits one
  undoable change; Enter is a no-op and Escape leaves mask editing.
- [ ] **Step 7: Run green and commit.** Run targeted UI and geometry tests, `bun run typecheck`, and
  `git diff --check`. Commit with
  `git commit -m "feat(pinta): edit masks and drag rotation pivots"`.

### Task 7: SVG animado e regressão dos exportadores

**Files:**
- Modify: `packages/pinta/src/export/animatedSvg.ts`
- Modify: `packages/pinta/src/export/animatedSvg.test.ts`
- Modify: `packages/pinta/src/export/animationGif.test.ts`
- Modify: `packages/pinta/src/export/studioLibrary.test.ts`
- Modify: `packages/pinta/src/export/vectorSheet.test.ts`

**Interfaces:**
- Consumes: `sceneDefsMarkup`, `shapesToMarkup`, `rotationPivotOf`, mask scene queries.
- Produces: a frame-level discrete branch in `buildAnimatedVectorSvg` whenever one pose contains a
  mask.

- [ ] **Step 1: Write failing export tests.** Assert smooth unmasked rotation emits custom pivot
  values, a masked animation emits one complete discrete scene per compacted pose, mask/source IDs are
  prefixed without collision, reduced motion contains the exact first frame, and the existing 2 MiB
  guard counts the final output. Inject the GIF rasterizer and inspect that its SVG strip contains the
  expected `clipPath`.
- [ ] **Step 2: Run red.** Run
  `bun test src/export/animatedSvg.test.ts src/export/animationGif.test.ts src/export/vectorSheet.test.ts src/export/studioLibrary.test.ts`.
- [ ] **Step 3: Use effective pivots in smooth tracks.** Replace bounds-center rotation values with
  `rotationPivotOf(shape)`. Keep `rotationPivot` in visual signatures because it changes rendered
  output; keep `maskId` out of the normal smooth path by branching earlier.
- [ ] **Step 4: Emit masked poses discretely.** For every compacted pose, create prefixed scene defs
  and full shape markup inside one visibility-animated `<g>`. Count the masked animation as a discrete
  track, preserve timing/loop/easing boundaries, and use the same complete scene for reduced motion.
- [ ] **Step 5: Prove inherited export paths.** Keep Studio and GIF production code unchanged when
  they already consume portable SVG or vector sheets; add tests at those boundaries instead of a
  second mask implementation.
- [ ] **Step 6: Run green and commit.** Run all export tests, `bun run typecheck`, and
  `git diff --check`. Commit with
  `git commit -m "feat(pinta): preserve masks and pivots in animation exports"`.

### Task 8: Documentação, full review e verificação final

**Files:**
- Modify: `packages/pinta/CLAUDE.md`
- Modify only if review finds defects: files changed in Tasks 1–7 and their adjacent tests.

**Interfaces:**
- Consumes: every contract above.
- Produces: fresh verification evidence and a clean local `staging` branch, without push.

- [ ] **Step 1: Update the project guide.** Replace the backlog entry that lists masks as unsupported.
  Document `rotationPivot`, `maskId`, selection closure, mask edit mode, `clipPath` rendering, discrete
  animated-SVG fallback and the rule that geometry-replacing operations require release first.
- [ ] **Step 2: Run focused regression.** From `packages/pinta`, run
  `bun test src/vector src/animation/framesVector.test.ts src/export src/components/editor/vectorUi.test.tsx`.
  Every test must pass from a fresh invocation.
- [ ] **Step 3: Run package gates.** From `packages/pinta`, run `bun test src`,
  `bun run typecheck`, and `bun run check`. Run `git diff --check` from the repository root.
- [ ] **Step 4: Perform the full review.** Compare every section of the spec to code and tests. Audit
  ID remapping, sanitizer recovery, lock/undo invariants, source omission, Z-order, pointer cleanup,
  keyboard names, React/string SVG parity, old-document snapshots and animated export size. Inspect
  `git diff f5c7de2b..HEAD -- packages/pinta docs` and fix every concrete finding with a regression
  test.
- [ ] **Step 5: Execute browser QA.** Create or load a vector firefly, put a circular window above it,
  create the mask, edit the circle, move the common pivot to the ship's tip, rotate, undo/redo,
  duplicate the frame, play the animation, and generate static SVG, GIF/spritesheet and animated SVG.
  Confirm only the face appears in the window and every output matches the preview.
- [ ] **Step 6: Commit review fixes and docs.** Stage only this feature's files and commit with
  `git commit -m "docs(pinta): document masks and rotation pivots"`. If the review required code
  fixes, commit them first as `fix(pinta): address mask and pivot review findings`.
- [ ] **Step 7: Verify handoff state.** Run `git status --short --branch` and `git log -8 --oneline`.
  Report the verification commands, browser QA result and local commit hashes. Do not run `git push`
  or any deployment command.
