# Trail Depth and Adaptive Art Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the unlocked chest visibly three-dimensional and place each module's Rive art in the side/row pair with the most horizontal room.

**Architecture:** Keep placement as a pure server-side calculation in `trail-layout.ts`, then let `CourseTrail` render the returned side and row. Override the shared node-depth CSS only for the actionable gold chest so locked and claimed states remain flat.

**Tech Stack:** React 19, Next.js 16 Server Components, TypeScript, CSS, Bun test, Testing Library.

**Spec:** `docs/plans/2026-09-21-trail-depth-and-adaptive-art-design.md`

## Global Constraints

- Preserve `CourseTrail` as a Server Component.
- Add no runtime DOM measurement, observer, or layout shift.
- Keep Rive art non-interactive and behind the lesson nodes.
- Use alternation only to resolve equal placement scores.
- Keep closed and claimed chests flat because they are not actionable.

---

### Task 1: Choose the Rive side and row together

**Files:**
- Modify: `packages/community-kids/src/components/kids/trail-layout.ts`
- Modify: `packages/community-kids/src/components/kids/course-trail.tsx`
- Test: `packages/community-kids/tests/trail-layout.test.ts`
- Test: `packages/community-kids/tests/course-trail.test.tsx`

**Interfaces:**
- Produces: `trailArtPlacement(unit: TrailUnit, preferredSide: TrailArtSide): { side: TrailArtSide; row: number }`.
- Consumes: ordered lesson offsets followed by `unit.chest.offset`.

- [x] **Step 1: Write failing placement tests**

Import `trailArtPlacement`. Assert that `[0, 1, 1.73]` selects `{ side: 'left', row: 1 }`, `[2, 1.73, 1]` selects `{ side: 'left', row: 0 }`, and `[0, -1, -1.73, -2]` selects `{ side: 'right', row: 2 }`. Add a symmetric fixture that proves `preferredSide` breaks ties.

- [x] **Step 2: Run the focused tests and confirm failure**

Run: `bun test tests/trail-layout.test.ts tests/course-trail.test.tsx`

Expected: failure because `trailArtPlacement` does not exist and the component still alternates sides before scoring rows.

- [x] **Step 3: Implement the pure scorer**

Add these public types and function to `trail-layout.ts`:

```ts
export type TrailArtSide = 'left' | 'right'

export interface TrailArtPlacement {
  side: TrailArtSide
  row: number
}

export function trailArtPlacement(
  unit: TrailUnit,
  preferredSide: TrailArtSide,
): TrailArtPlacement {
  const offsets = [...unit.nodes.map((node) => node.offset), unit.chest.offset]
  const sides: TrailArtSide[] =
    preferredSide === 'left' ? ['left', 'right'] : ['right', 'left']
  let best: TrailArtPlacement & { score: number } = {
    side: preferredSide,
    row: 0,
    score: Number.NEGATIVE_INFINITY,
  }

  for (const side of sides) {
    const direction = side === 'left' ? 1 : -1
    for (let row = 0; row < offsets.length - 1; row += 1) {
      const score = direction * ((offsets[row] ?? 0) + (offsets[row + 1] ?? 0))
      if (score > best.score) best = { side, row, score }
    }
  }

  return { side: best.side, row: best.row }
}
```

Replace the private `trailArtRow` in `course-trail.tsx` with this function. Continue deriving the preferred side from the unit index only for ties.

- [x] **Step 4: Update the component expectation**

Change the three-module fixture expectation from alternating `left/right/left` to the score-driven `left/left/right`, with tops `55%`, `21.67%`, and `66.25%`.

- [x] **Step 5: Run the focused tests**

Run: `bun test tests/trail-layout.test.ts tests/course-trail.test.tsx`

Expected: all tests pass.

### Task 2: Give the unlocked chest a distinct 3D base

**Files:**
- Modify: `packages/community-kids/src/app/globals.css`
- Test: `packages/community-kids/tests/trail-chest.test.tsx`

**Interfaces:**
- Consumes: `.kids-node-link .kids-node--chest-ready` from `TrailChest`.
- Produces: an 8 px resting base, 9 px hover base, and 2 px pressed base.

- [x] **Step 1: Write a failing CSS contract test**

Read `src/app/globals.css` in `trail-chest.test.tsx`. Assert that the specific ready-chest rule contains `--k3d-altura: 8px`, a dark gold `--k3d-degrau`, and an inset highlight. Assert the hover and active rules contain `9px` and `2px` respectively.

- [x] **Step 2: Run the focused test and confirm failure**

Run: `bun test tests/trail-chest.test.tsx`

Expected: failure because the chest still inherits the generic 5 px node depth.

- [x] **Step 3: Add the specific chest depth**

After the generic lesson-node depth rules in `globals.css`, add:

```css
.kids-node-link .kids-node.kids-node--chest-ready {
  --k3d-altura: 8px;
  --k3d-degrau: color-mix(in oklab, var(--kids-ouro) 58%, var(--pen-tinta));
  box-shadow:
    inset 0 3px 0 color-mix(in oklab, white 34%, transparent),
    0 var(--k3d-altura) 0 var(--k3d-degrau);
  transition: translate 0.12s ease;
}
.kids-node-link:hover .kids-node.kids-node--chest-ready {
  --k3d-altura: 9px;
}
.kids-node-link:active .kids-node.kids-node--chest-ready {
  --k3d-altura: 2px;
  translate: 0 6px;
}
```

- [x] **Step 4: Run the focused test**

Run: `bun test tests/trail-chest.test.tsx`

Expected: all tests pass.

### Task 3: Verify the integrated trail

**Files:**
- Review all files changed by Tasks 1 and 2.

**Interfaces:**
- Consumes: Tasks 1 and 2.
- Produces: a release-ready Community Kids package.

- [x] **Step 1: Run focused regression tests**

Run: `bun test tests/trail-layout.test.ts tests/course-trail.test.tsx tests/trail-chest.test.tsx tests/trail-rive.test.tsx`

Expected: all tests pass.

- [x] **Step 2: Run package verification**

Run: `bun run typecheck && bun run check && bun run build`

Expected: all commands exit successfully.

- [x] **Step 3: Review the final diff**

Run: `git diff --check` and inspect the UI, CORS-gate, tests, and workflow changes for correctness and unrelated edits.
