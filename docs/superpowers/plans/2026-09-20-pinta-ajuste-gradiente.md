# Ajuste visual do degradê no Pinta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir arrastar na forma o brilho e alcance do degradê redondo e as pontas do degradê linear, com mouse e toque.

**Architecture:** Campos opcionais de geometria normalizada preservam os desenhos existentes. Um helper puro fornece a geometria efetiva ao SVG React, ao exportador e ao conta-gotas. O palco entra num modo temporário próprio, reutilizando a transação de gesto para prévia contínua e uma entrada de Desfazer por arraste.

**Tech Stack:** TypeScript, React, SVG, Bun Test, happy-dom, Biome.

**Spec:** `docs/plans/2026-09-20-pinta-ajuste-gradiente-design.md`

## Global Constraints

- Degradês antigos sem coordenadas novas devem renderizar exatamente como hoje.
- Somente uma forma livre, visível e com preenchimento em degradê recebe alças no palco.
- As alças funcionam com mouse e toque, têm tamanho constante na tela e respeitam a rotação da forma.
- Um gesto cria no máximo uma entrada no Desfazer; gesto sem movimento não cria entrada.
- A prévia React e o SVG exportado usam a mesma geometria.
- Nenhuma nova dependência ou cor intermediária nesta entrega.

---

## File map

- `src/vector/model.ts`: tipo e validação/persistência dos campos opcionais.
- `src/vector/gradient.ts` (novo): geometria padrão, atualização de alças e conversão de ponto da forma.
- `src/vector/svg.ts`, `src/vector/VectorFrameSvg.tsx`, `src/vector/pickColor.ts`: consumidores da geometria única.
- `src/components/editor/vector/VectorGradientDialog.tsx`: entrada do modo e predefinições.
- `src/components/editor/vector/VectorStage.tsx`: alças, captura do ponteiro, prévia e commit do gesto.
- `src/components/editor/vector/VectorEditorScope.tsx`: comparação de degradês e predefinições sem geometria anterior sobrando.
- `src/core/copy.ts`: rótulos do modo e das alças.
- Testes próximos aos respectivos módulos, principalmente `vectorUi.test.tsx`.

### Task 1: Geometria persistida e paridade de renderização

**Files:**
- Create: `packages/pinta/src/vector/gradient.ts`, `packages/pinta/src/vector/gradient.test.ts`
- Modify: `packages/pinta/src/vector/model.ts`, `packages/pinta/src/vector/model.test.ts`, `packages/pinta/src/vector/svg.ts`, `packages/pinta/src/vector/VectorFrameSvg.tsx`, `packages/pinta/src/vector/pickColor.ts`, `packages/pinta/src/vector/pickColor.test.ts`

**Interfaces:**
- Produces: `gradientGeometry(g: VectorGradient): {type:'linear'; start:Vec2; end:Vec2} | {type:'radial'; center:Vec2; radius:number}`.
- Produces: `moveGradientHandle(g: VectorGradient, handle: 'start'|'end'|'center'|'radius', point: Vec2): VectorGradient`.
- Produces: `gradientPointForShape(shape: VectorShape, documentPoint: Vec2): Vec2`, normalized to the shape's unrotated bounds.

- [ ] **Step 1: Write failing pure tests.** Test an old `{type:'radial',from:'#ffffff',to:'#000000',angle:0}` resolves to center `{x:.5,y:.5}`, radius `.5`; old linear angle `0` resolves to `{x:0,y:.5}`→`{x:1,y:.5}`. Test moving radial center to `{x:.25,y:.2}` and radius to `.8`; linear endpoints to `{x:.2,y:.1}` and `{x:.9,y:.8}`. Test NaN/out-of-range sanitization and rotated-shape coordinate inversion.

```ts
expect(gradientGeometry(oldRadial)).toEqual({ type: 'radial', center: { x: 0.5, y: 0.5 }, radius: 0.5 })
expect(moveGradientHandle(oldRadial, 'center', { x: 0.25, y: 0.2 }).center).toEqual({ x: 0.25, y: 0.2 })
```

- [ ] **Step 2: Run red.** `bun test src/vector/gradient.test.ts src/vector/model.test.ts src/vector/pickColor.test.ts` from `packages/pinta`; missing API/new expectations must fail.
- [ ] **Step 3: Implement pure geometry and model.** Add optional `start`, `end`, `center`, `radius` to `VectorGradient`; sanitize finite normalized points and a positive bounded radius, omitting invalid fields. Move `linearGradientVector` to `gradient.ts`, deriving defaults from `angle`. Normalize handle positions in object-bounding-box space. Convert document points through inverse shape rotation around the bounds center before normalizing. Preserve old defaults when optional fields are absent.

```ts
export type GradientHandle = 'start' | 'end' | 'center' | 'radius'
export function gradientGeometry(g: VectorGradient): GradientGeometry {
  if (g.type === 'radial')
    return { type: 'radial', center: g.center ?? { x: 0.5, y: 0.5 }, radius: g.radius ?? 0.5 }
  const axis = linearGradientVector(g.angle)
  return {
    type: 'linear',
    start: g.start ?? { x: axis.x1, y: axis.y1 },
    end: g.end ?? { x: axis.x2, y: axis.y2 },
  }
}
export function moveGradientHandle(g: VectorGradient, handle: GradientHandle, point: Vec2): VectorGradient {
  const p = { x: Math.min(1, Math.max(0, point.x)), y: Math.min(1, Math.max(0, point.y)) }
  if (g.type === 'linear' && handle === 'start') return { ...g, start: p }
  if (g.type === 'linear' && handle === 'end') return { ...g, end: p }
  if (g.type === 'radial' && handle === 'center') return { ...g, center: p }
  if (g.type === 'radial' && handle === 'radius') {
    const center = gradientGeometry(g)
    if (center.type === 'radial')
      return { ...g, radius: Math.min(1.5, Math.max(0.05, Math.hypot(point.x - center.center.x, point.y - center.center.y))) }
  }
  return g
}
```

- [ ] **Step 4: Wire all readers.** Render `cx/cy/r` or `x1/y1/x2/y2` from `gradientGeometry` in both React and SVG string. Make `pickColor` compare the point against those same endpoints/center and radius. Keep the SVG defaults for old data visually unchanged.
- [ ] **Step 5: Run green and review.** `bun test src/vector/gradient.test.ts src/vector/model.test.ts src/vector/pickColor.test.ts src/vector/svg.test.ts`; inspect a generated old and new SVG for equal React/export attributes.
- [ ] **Step 6: Commit.** `git add packages/pinta/src/vector` and `git commit -m "feat(pinta): persist and render adjustable gradient geometry"`.

### Task 2: Entry into the on-canvas mode

**Files:**
- Modify: `packages/pinta/src/components/editor/vector/VectorGradientDialog.tsx`, `packages/pinta/src/components/editor/vector/VectorEditorScope.tsx`, `packages/pinta/src/components/editor/vector/VectorStage.tsx`, `packages/pinta/src/core/copy.ts`
- Test: `packages/pinta/src/components/editor/vectorUi.test.tsx`

**Interfaces:**
- Consumes: `gradientGeometry` and optional coordinates from Task 1.
- Produces: `VectorGradientDialog({onAdjust}: {onAdjust: () => void})` and a local mode in `VectorStage` tied to the selected shape id.

- [ ] **Step 1: Write failing UI tests.** Select one unlocked gradient-filled shape: button `Ajustar no desenho` exists, closes the modal and reveals mode banner; Esc and `Concluir` leave mode. With multiple selection, locked/hidden/solid/line/image, the button does not enter mode and the dialog explains why. Switching document/selection exits mode.

```tsx
await user.click(screen.getByRole('button', { name: 'Ajustar no desenho' }))
expect(screen.getByRole('status', { name: /Ajustando o degradê/ })).toBeVisible()
```

- [ ] **Step 2: Run red.** `bun test src/components/editor/vectorUi.test.tsx -t 'ajustar degradê no desenho'`.
- [ ] **Step 3: Implement mode entry.** The modal `Dialog` blocks canvas pointer events, so its button calls `onAdjust`, closes the dialog and activates a local mode bound to the single shape. Show a compact in-stage banner with `Concluir`. Suppress normal select/draw/resize gestures and selection toolbars while active. Exit on Esc, selection/frame/tool change or lost eligibility. Keep color editing for multiple shapes in the dialog.
- [ ] **Step 4: Fix preset semantics and equality.** When `Degradê deitado`/`em pé` is chosen, clear custom linear endpoints; when `Degradê redondo` is chosen, reset center/radius to defaults. Include geometry in `sameGradient` so a geometry change is neither dropped nor duplicated.

```ts
// A preset is an explicit reset, not a spread that leaves hidden custom geometry.
function presetGradient(g: VectorGradient, type: 'horizontal' | 'vertical' | 'radial'): VectorGradient {
  const { start: _start, end: _end, center: _center, radius: _radius, ...base } = g
  return type === 'radial'
    ? { ...base, type: 'radial' }
    : { ...base, type: 'linear', angle: type === 'horizontal' ? 0 : 90 }
}
```

- [ ] **Step 5: Run green and review.** Targeted UI tests, typecheck, inspect focus return and touch-sized button.
- [ ] **Step 6: Commit.** `git add packages/pinta/src/components/editor/vector packages/pinta/src/core/copy.ts` and `git commit -m "feat(pinta): enter gradient adjustment mode"`.

### Task 3: Drag handles, gesture transaction and regression

**Files:**
- Modify: `packages/pinta/src/components/editor/vector/VectorStage.tsx`, `packages/pinta/src/components/editor/vectorUi.test.tsx`
- Test: `packages/pinta/src/vector/gradient.test.ts`, `packages/pinta/src/vector/svg.test.ts`

**Interfaces:**
- Consumes: `moveGradientHandle`, `gradientPointForShape`, and stage mode from Tasks 1–2.
- Produces: handles at effective geometry points, `replace` during drag, `commitGesture` once on pointer-up.

- [ ] **Step 1: Write failing gesture tests.** Drag radial center up-left and radius outward; drag each linear endpoint; assert SVG attributes update, exported SVG matches, one Undo restores pre-drag geometry and Redo restores it. Click without moving makes no Undo step; pointer cancel restores the gesture base. Cover a rotated shape and touch pointer id isolation.

```tsx
fireEvent.pointerDown(handle, { pointerId: 11, pointerType: 'touch', clientX: 100, clientY: 100 })
fireEvent.pointerMove(stage, { pointerId: 11, pointerType: 'touch', clientX: 120, clientY: 90 })
fireEvent.pointerUp(stage, { pointerId: 11, pointerType: 'touch', clientX: 120, clientY: 90 })
```

- [ ] **Step 2: Run red.** `bun test src/components/editor/vectorUi.test.tsx -t 'arrastar alças do degradê'`.
- [ ] **Step 3: Render handles and implement gesture.** Draw only the two handles of the active gradient in a rotated SVG overlay. Use fixed-screen hit targets (`size / zoom`), accessible names and clear beginning/end colors. Start a gesture from the selected shape's current asset, call `editor.replace` with a new shape fill on move, and `editor.commitGesture(base)` once at pointer-up. Use existing `beginGesture`/document pointer fallback; reject other pointer ids. Pointer cancel restores `base`; if the effective geometry is unchanged, no commit.
- [ ] **Step 4: Review interactions.** Confirm the mode cannot move the form accidentally, selection changes cleanly terminate, capture loss cannot leave a live gesture, shape rotation is respected, and returning to the dialog retains adjusted geometry until a preset is deliberately selected.
- [ ] **Step 5: Run full verification.** In `packages/pinta`: `bun test src`, `bun run typecheck`, `bun run check`; in repo root: `bun run ci` and `git diff --check`. Review all changes against the design doc and existing lock/undo rules.
- [ ] **Step 6: Commit.** `git add packages/pinta/src/components/editor/vector packages/pinta/src/vector` and `git commit -m "feat(pinta): drag gradient controls on canvas"`.

## Final review and publication

- [ ] Check every design requirement against tests and code; inspect `git status --short --branch` and other linked worktrees before publication.
- [ ] Push `staging`, await all GitHub CI/E2E jobs and verify the Railway deploy log confirms `members`, `admin`, `community`, `community-kids` at the pushed SHA.
