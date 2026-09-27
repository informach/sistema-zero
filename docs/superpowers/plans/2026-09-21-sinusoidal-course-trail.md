# Sinusoidal Course Trail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Arrange Kids lesson and chest nodes on a continuous sampled sine wave while preserving the existing responsive amplitude and all course behavior.

**Architecture:** Replace the fixed triangular offset array in `trail-layout.ts` with a pure sine-sampling function that has amplitude `2`, period `12`, and two-decimal output. `buildTrail` keeps its existing global counter, so lessons and chests across module boundaries consume one continuous curve.

**Tech Stack:** TypeScript, React 19, Next.js 16, Bun test, Biome.

**Spec:** `docs/plans/2026-09-21-sinusoidal-course-trail-design.md`

## Global Constraints

- Keep all offsets inside `-2..2` so desktop and mobile use the existing horizontal envelope.
- Keep the sequence global across visible modules, including each unit chest.
- Round offsets to two decimal places and normalize zero so inline styles are deterministic.
- Do not add connector markup, SVG paths, animations, dependencies, or CSS layout changes.

---

## File Structure

- `packages/community-kids/src/components/kids/trail-layout.ts`: calculates the global horizontal wave and assigns offsets to lessons and chests.
- `packages/community-kids/tests/trail-layout.test.ts`: verifies the sampled curve, continuity, and existing layout behavior.

### Task 1: Replace straight diagonals with a sampled sine wave

**Files:**
- Modify: `packages/community-kids/tests/trail-layout.test.ts`
- Modify: `packages/community-kids/src/components/kids/trail-layout.ts`

**Interfaces:**
- Consumes: the existing `buildTrail(course: CourseDetailView): TrailUnit[]` contract.
- Produces: the same `TrailUnit[]` shape with two-decimal sinusoidal `offset` values in `-2..2`.

- [ ] **Step 1: Change the sequence test to describe the approved curve**

Extend the second module fixture until lessons plus chests provide 13 global positions, then assert:

```ts
expect(offsets).toEqual([0, 1, 1.73, 2, 1.73, 1, 0, -1, -1.73, -2, -1.73, -1, 0])
expect(offsets.every((offset) => Math.abs(offset) <= 2)).toBe(true)
```

Rename the test to `offsets formam uma senoide contínua com índice GLOBAL (aulas E baús)` and remove the old assertion that every consecutive delta equals `1`, because varying deltas create the visible curvature.

Update the empty-module continuity expectation from:

```ts
[0, 1, 2, 1, 0]
```

to:

```ts
[0, 1, 1.73, 2, 1.73]
```

- [ ] **Step 2: Run the layout test and verify it fails on the triangular sequence**

Run from `packages/community-kids`:

```bash
bun test tests/trail-layout.test.ts -t "senoide contínua|unidade vazia"
```

Expected: FAIL because `buildTrail` still returns `0, 1, 2, 1...`.

- [ ] **Step 3: Implement the pure sampled sine function**

Replace `OFFSETS` in `trail-layout.ts` with:

```ts
const TRAIL_AMPLITUDE = 2
const TRAIL_PERIOD = 12

function trailOffsetAt(index: number): number {
  const radians = (index / TRAIL_PERIOD) * Math.PI * 2
  const rounded = Math.round(Math.sin(radians) * TRAIL_AMPLITUDE * 100) / 100
  return rounded === 0 ? 0 : rounded
}
```

Update the surrounding comment to explain that the varying horizontal deltas slow near each edge and accelerate near the center. In `buildTrail`, replace the array lookup with:

```ts
const offset = trailOffsetAt(globalIndex)
```

Keep incrementing `globalIndex` exactly once for every lesson and chest.

- [ ] **Step 4: Run the focused layout tests**

Run from `packages/community-kids`:

```bash
bun test tests/trail-layout.test.ts
```

Expected: all trail-layout tests PASS.

- [ ] **Step 5: Commit the curve implementation**

```bash
git add packages/community-kids/src/components/kids/trail-layout.ts packages/community-kids/tests/trail-layout.test.ts
git commit --only -m "feat(kids): curve the course trail" -- packages/community-kids/src/components/kids/trail-layout.ts packages/community-kids/tests/trail-layout.test.ts
```

### Task 2: Verify the course trail as a whole

**Files:**
- Verify: `packages/community-kids/src/components/kids/trail-layout.ts`
- Verify: `packages/community-kids/src/components/kids/course-trail.tsx`
- Verify: `packages/community-kids/src/components/kids/trail-chest.tsx`
- Verify: `packages/community-kids/tests/trail-layout.test.ts`
- Verify: `packages/community-kids/tests/course-trail.test.tsx`
- Verify: `packages/community-kids/tests/trail-chest.test.tsx`

**Interfaces:**
- Consumes: the sinusoidal offsets and the connector-free, shared-3D trail presentation.
- Produces: fresh evidence that layout, rendering, chest behavior, types, and formatting remain valid.

- [ ] **Step 1: Run the complete trail regression set**

Run from `packages/community-kids`:

```bash
bun test tests/trail-layout.test.ts tests/course-trail.test.tsx tests/trail-chest.test.tsx
```

Expected: all tests PASS.

- [ ] **Step 2: Run static checks**

Run from `packages/community-kids`:

```bash
bun run typecheck
bunx biome check src/components/kids/trail-layout.ts src/components/kids/course-trail.tsx src/components/kids/trail-chest.tsx src/app/globals.css tests/trail-layout.test.ts tests/course-trail.test.tsx tests/trail-chest.test.tsx
```

Expected: both commands exit `0` with no fixes required.

- [ ] **Step 3: Run the package test suite**

Run from `packages/community-kids`:

```bash
bun test tests
```

Expected: all Community Kids tests PASS. Record any unrelated concurrent-work failure separately instead of changing files outside this plan.

- [ ] **Step 4: Review repository integrity**

Run from the repository root:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors. Stage and commit only the files owned by this plan and the previously reviewed Pinta/trail work; preserve every unrelated working-tree change.
