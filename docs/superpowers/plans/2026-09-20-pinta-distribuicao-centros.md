# Pinta Vector Center Distribution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add horizontal and vertical center distribution for three or more selected vector objects, keeping the outer objects fixed.

**Architecture:** A pure geometry operation groups selected shapes, excludes locked groups, sorts group centers on the requested axis, and translates only intermediate groups. The vector editor invokes it through the existing single-commit undo path; desktop and touch selection bars expose the same action and availability rule.

**Tech Stack:** TypeScript, React 19, Bun test, Testing Library, Lucide icons, Biome.

**Spec:** `docs/plans/2026-09-20-pinta-distribuicao-centros-design.md`

## Global Constraints

- The two outer centers do not move; only the selected axis changes.
- A group counts as one object and moves intact. A group with a locked member does not move or determine spacing.
- Fewer than three movable objects means no edit. An already distributed selection adds no undo step.
- Keep persisted asset types and visual tokens unchanged; use existing `ToolButton` and selection bars.
- Do not push until the in-progress all-services staging deployment has finished.

---

### Task 1: Pure geometry and eligibility

**Files:**
- Modify: `packages/pinta/src/vector/geometry.ts`
- Test: `packages/pinta/src/vector/geometry.test.ts`

**Interfaces:**
- Produces: `DistributionAxis = 'horizontal' | 'vertical'`.
- Produces: `canDistributeShapes(shapes: VectorShape[], ids: string[]): boolean`.
- Produces: `distributeShapes(shapes: VectorShape[], ids: string[], axis: DistributionAxis): VectorShape[]`.

- [ ] **Step 1: Write failing geometry tests.** Add cases near `alignShapes` using the existing `base` rectangle fixture. For horizontal centers 5, 45, 105, expect 5, 55, 105 and unchanged `y`; for vertical centers 5, 45, 105, expect 5, 55, 105 and unchanged `x`. Assert endpoint references are unchanged. Add cases where two members of one group translate by the same delta, where an unselected shape and a locked group retain their references, where fewer than three eligible groups return the original array, and where repeating a distribution returns the original array. Example:

```ts
const shapes = [
  { ...base, id: 'a', type: 'rect', x: 0, y: 0, w: 10, h: 10, rx: 0 },
  { ...base, id: 'b', type: 'rect', x: 40, y: 0, w: 10, h: 10, rx: 0 },
  { ...base, id: 'c', type: 'rect', x: 100, y: 0, w: 10, h: 10, rx: 0 },
] satisfies VectorShape[]
const result = distributeShapes(shapes, ['c', 'a', 'b'], 'horizontal')
expect(result.map((shape) => shapeBounds(shape).x + shapeBounds(shape).width / 2))
  .toEqual([5, 55, 105])
expect(result[0]).toBe(shapes[0])
expect(result[2]).toBe(shapes[2])
```

- [ ] **Step 2: Verify red.** Run `bun test src/vector/geometry.test.ts` from `packages/pinta`; expect missing exports or failing assertions.

- [ ] **Step 3: Implement pure geometry.** Reuse `shapeBounds`, `boundsUnion`, and `translateShape`. Collect complete selected clusters by `groupId ?? id`; omit a cluster if any member is unselected or locked. Sort by axis center and source index for stable ties. Keep first and last centers, compute `step = (last - first) / (count - 1)`, then translate only intermediate clusters on the chosen axis. Return the original array when there are fewer than three eligible clusters or all deltas are effectively zero (`Math.abs(delta) < 1e-9`). Make `canDistributeShapes` reuse the same cluster collection, rather than duplicate the eligibility rule.

```ts
export type DistributionAxis = 'horizontal' | 'vertical'
export function canDistributeShapes(shapes: VectorShape[], ids: string[]): boolean {
  return selectedMovableClusters(shapes, ids).length >= 3
}
export function distributeShapes(
  shapes: VectorShape[], ids: string[], axis: DistributionAxis,
): VectorShape[] {
  const clusters = selectedMovableClusters(shapes, ids)
  if (clusters.length < 3) return shapes
  const center = (bounds: Bounds) => axis === 'horizontal'
    ? bounds.x + bounds.width / 2
    : bounds.y + bounds.height / 2
  const ordered = clusters.map((cluster) => ({ ...cluster, center: center(cluster.bounds) }))
    .sort((a, b) => a.center - b.center || a.index - b.index)
  const firstCluster = ordered[0]
  const lastCluster = ordered[ordered.length - 1]
  if (!firstCluster || !lastCluster) return shapes
  const first = firstCluster.center
  const step = (lastCluster.center - first) / (ordered.length - 1)
  const deltas = new Map<string, number>()
  for (let i = 1; i < ordered.length - 1; i++) {
    const cluster = ordered[i]
    if (!cluster) continue
    const delta = first + step * i - cluster.center
    if (Math.abs(delta) >= 1e-9) deltas.set(cluster.key, delta)
  }
  if (deltas.size === 0) return shapes
  return shapes.map((shape) => {
    const delta = deltas.get(shape.groupId ? `g:${shape.groupId}` : `s:${shape.id}`)
    return delta === undefined ? shape : translateShape(
      shape, axis === 'horizontal' ? delta : 0, axis === 'vertical' ? delta : 0,
    )
  })
}
```

`selectedMovableClusters` returns `{ key: string; index: number; bounds: Bounds }[]`. Build it from all document shapes so that a partially selected or partially locked group cannot split:

```ts
function selectedMovableClusters(shapes: VectorShape[], ids: string[]) {
  const selected = new Set(ids)
  const all = new Map<string, { key: string; index: number; members: VectorShape[] }>()
  shapes.forEach((shape, index) => {
    const key = shape.groupId ? `g:${shape.groupId}` : `s:${shape.id}`
    const cluster = all.get(key)
    if (cluster) cluster.members.push(shape)
    else all.set(key, { key, index, members: [shape] })
  })
  return [...all.values()]
    .filter(({ members }) => members.every((shape) => selected.has(shape.id) && !shape.locked))
    .map(({ key, index, members }) => ({
      key, index, bounds: boundsUnion(members.map(shapeBounds)),
    }))
}
```

- [ ] **Step 4: Verify green and review.** Run `bun test src/vector/geometry.test.ts` and `bun run typecheck` from `packages/pinta`. Review group completeness, locked members, ties, mixed sizes, no-op references, and the unchanged perpendicular axis.

- [ ] **Step 5: Commit.** `git add packages/pinta/src/vector/geometry.ts packages/pinta/src/vector/geometry.test.ts` then `git commit -m "feat(pinta): distribute vector object centers"`.

### Task 2: Selection-bar actions on desktop and touch

**Files:**
- Modify: `packages/pinta/src/components/editor/vector/VectorEditorScope.tsx`
- Modify: `packages/pinta/src/components/editor/vector/VectorSelectionBar.tsx`
- Modify: `packages/pinta/src/components/editor/vector/VectorStage.tsx`
- Modify: `packages/pinta/src/components/ui/icons.ts`
- Modify: `packages/pinta/src/core/copy.ts`
- Test: `packages/pinta/src/components/editor/vectorUi.test.tsx`

**Interfaces:**
- Consumes: `DistributionAxis`, `canDistributeShapes`, `distributeShapes` from Task 1.
- Produces on vector editor context: `canDistributeSelected: boolean` and `distributeSelected(axis: DistributionAxis): void`.

- [ ] **Step 1: Write failing UI tests.** In `vectorUi.test.tsx`, create three rectangles with `drawRect`, select all via the existing stage selection gesture, verify both named buttons are enabled on desktop, click the horizontal command, verify the middle SVG rectangle moves to the average of the outer centers, then click Undo and confirm its old position. Add a one-object case asserting both commands are disabled. In the narrow layout test (`wide` false), verify the same two named buttons exist in the floating selection toolbar and remain keyboard accessible.

```ts
const horizontal = screen.getByRole('button', { name: COPY.vector.distributeCentersH })
const vertical = screen.getByRole('button', { name: COPY.vector.distributeCentersV })
expect((horizontal as HTMLButtonElement).disabled).toBe(false)
fireEvent.click(horizontal)
await waitFor(() => {
  const xs = [...stage.querySelectorAll('rect[fill="#78dc52"]')]
    .map((rect) => rect.getAttribute('x'))
  expect(xs).toEqual(['16', '168', '320'])
})
```

- [ ] **Step 2: Verify red.** Run `bun test src/components/editor/vectorUi.test.tsx -t "distribuir"` from `packages/pinta`; expect missing copy/action or unavailable buttons.

- [ ] **Step 3: Wire the scope.** Import the Task 1 interfaces into `VectorEditorScope.tsx`. Derive `canDistributeSelected` from `canDistributeShapes(currentShapes(), selectedIds)` and expose it in the context. Compare the pure operation's returned array with the current array before calling `commitShapes`: `withActiveShapes` always creates a new asset, so returning the original array alone would still add an empty undo entry.

```ts
function distributeSelected(axis: DistributionAxis): void {
  if (!doc) return
  const current = currentShapes()
  const next = distributeShapes(current, selectedIds, axis)
  if (next === current) return
  commitShapes(next)
}
```

- [ ] **Step 4: Add accessible controls.** Export Lucide `AlignHorizontalDistributeCenter` and `AlignVerticalDistributeCenter` through `icons.ts`. Add Portuguese copy keys `distributeCentersH` and `distributeCentersV`. Put the two `ToolButton`s after the six alignment buttons in `VectorSelectionBar.tsx`, with `disabled={!canDistributeSelected}`. Add them to the existing horizontally scrollable touch selection bar in `VectorStage.tsx`, also disabled until eligible. Keep each existing toolbar's name and height unchanged.

```tsx
<ToolButton
  icon={AlignHorizontalDistributeCenter}
  label={COPY.vector.distributeCentersH}
  disabled={!canDistributeSelected}
  onClick={() => distributeSelected('horizontal')}
/>
```

- [ ] **Step 5: Verify green and review.** Run `bun test src/components/editor/vectorUi.test.tsx`, `bun test` (entire Pinta package), `bun run typecheck`, `bun run check`, and `git diff --check`. Review the desktop and touch toolbar at narrow width, locked selection behavior, undo/redo, and no new persisted fields.

- [ ] **Step 6: Commit.** Stage only the Pinta files listed above and commit with `git commit -m "feat(pinta): expose center distribution in vector editor"`. Keep unrelated in-progress edits from other sessions out of this commit.

## Final review and deployment

After both task commits, inspect the whole worktree and other-session changes before deciding what belongs in the next staging push. Wait for the already-running all-services deploy to finish, then push the final reviewed staging commits. Follow the new CI through tests and the Pinta-dependent services (`members`, `admin`, `community`, `community-kids`), and confirm Railway reports terminal success for each.
