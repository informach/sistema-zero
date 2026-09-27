# Course Trail Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove every decorative dot from the Kids course trail and give the ready chest exactly the same 3D interaction treatment as clickable lesson nodes.

**Architecture:** Keep the change inside the existing trail presentation layer. `CourseTrail` stops producing connector markup, while `TrailChest` opts into the existing shared interactive-node contract and `globals.css` reduces that contract to one element-agnostic selector.

**Tech Stack:** React 19, Next.js 16, TypeScript, Tailwind CSS 4, Bun test, Testing Library, Biome.

**Spec:** `docs/plans/2026-09-21-course-trail-cleanup-design.md`

## Global Constraints

- Remove all decorative connector dots, including the final lesson-to-chest connector.
- Preserve lesson links, chest button semantics, labels, state transitions, course data, and server behavior.
- Apply the 3D treatment only to clickable lesson nodes and the ready chest; locked lessons and closed/open decorative chests remain flat.
- Do not add dependencies or change the trail layout.

---

## File Structure

- `packages/community-kids/src/components/kids/course-trail.tsx`: renders lesson nodes and removes connector production.
- `packages/community-kids/src/components/kids/trail-chest.tsx`: marks the ready chest as a shared interactive trail node.
- `packages/community-kids/src/app/globals.css`: owns the shared 3D interaction styles and removes obsolete dot styles.
- `packages/community-kids/tests/course-trail.test.tsx`: protects the absence of connector markup.
- `packages/community-kids/tests/trail-chest.test.tsx`: protects the ready chest's shared style contract.

### Task 1: Remove connector dots from the course trail

**Files:**
- Modify: `packages/community-kids/tests/course-trail.test.tsx`
- Modify: `packages/community-kids/src/components/kids/course-trail.tsx`
- Modify: `packages/community-kids/src/app/globals.css`

**Interfaces:**
- Consumes: `CourseTrail({ course }: { course: CourseDetailView })`.
- Produces: the same course-trail DOM without any `.kids-trail-dot` elements.

- [ ] **Step 1: Write the failing regression test**

Add this test inside `describe('CourseTrail', ...)`:

```tsx
test('não desenha bolinhas entre aulas nem antes do baú', () => {
  const { container } = render(
    <CourseTrail course={course([moduleOf('m1', [lesson('a'), lesson('b')])])} />,
  )
  expect(container.querySelector('.kids-trail-dot')).toBeNull()
})
```

- [ ] **Step 2: Run the regression test and verify the current implementation fails**

Run from `packages/community-kids`:

```bash
bun test tests/course-trail.test.tsx -t "não desenha bolinhas"
```

Expected: FAIL because `.kids-trail-dot` is still rendered.

- [ ] **Step 3: Remove connector production from the component**

Delete `DOT_STEPS` and `TrailDots` from `course-trail.tsx`. Change the node map from:

```tsx
{unit.nodes.map((node, nodeIndex) => {
  const next = unit.nodes[nodeIndex + 1]
  const nextOffset = next?.offset ?? unit.chest.offset
  return (
```

to:

```tsx
{unit.nodes.map((node) => {
  return (
```

Delete the conditional `<TrailDots ... />` block inside each lesson `<li>`. Keep `cn` because the file still uses it for node, label, and artwork classes.

- [ ] **Step 4: Remove obsolete connector styles**

Delete these rules from `globals.css`:

```css
.kids-trail-dot {
  position: absolute;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 9999px;
  background: var(--border);
}
.kids-trail-dot--done {
  background: color-mix(in oklch, var(--unit) 55%, transparent);
}
```

- [ ] **Step 5: Run the focused test**

Run from `packages/community-kids`:

```bash
bun test tests/course-trail.test.tsx -t "não desenha bolinhas"
```

Expected: PASS.

- [ ] **Step 6: Commit the connector removal**

```bash
git add packages/community-kids/src/components/kids/course-trail.tsx packages/community-kids/src/app/globals.css packages/community-kids/tests/course-trail.test.tsx
git commit -m "fix(kids): remove course trail connector dots"
```

### Task 2: Share the lesson-node 3D treatment with the ready chest

**Files:**
- Modify: `packages/community-kids/tests/trail-chest.test.tsx`
- Modify: `packages/community-kids/src/components/kids/trail-chest.tsx`
- Modify: `packages/community-kids/src/app/globals.css`

**Interfaces:**
- Consumes: the `.kids-node-link .kids-node:not(.kids-node--locked)` CSS contract.
- Produces: a ready native `<button>` with class `kids-node-link`; no class or behavior change for closed and open chest containers.

- [ ] **Step 1: Write the failing style-contract test**

Extend the existing `liberado é botão...` test with:

```tsx
expect(botao.classList.contains('kids-node-link')).toBe(true)
```

- [ ] **Step 2: Run the regression test and verify the current implementation fails**

Run from `packages/community-kids`:

```bash
bun test tests/trail-chest.test.tsx -t "liberado é botão"
```

Expected: FAIL because the ready button does not yet have `kids-node-link`.

- [ ] **Step 3: Put the ready chest on the shared interaction contract**

Change the ready button class in `trail-chest.tsx` to:

```tsx
className="kids-node-link -ml-14 absolute top-0 flex min-h-11 w-28 flex-col items-center gap-1.5"
```

Do not add the class to closed or opened chest containers because those states are not clickable.

- [ ] **Step 4: Collapse the 3D CSS to one element-agnostic path**

Keep the base selector as:

```css
.kids-node-link .kids-node:not(.kids-node--locked) {
```

and replace the hover and active selector groups with:

```css
.kids-node-link:hover .kids-node:not(.kids-node--locked) {
  --k3d-altura: 6px;
  translate: 0 -1px;
}
.kids-node-link:active .kids-node:not(.kids-node--locked) {
  --k3d-altura: 1px;
  translate: 0 4px;
}
```

Update the nearby comment so it states that both lesson links and the ready chest button share `kids-node-link`. Keep `.kids-node-link .kids-node--todo` unchanged so todo nodes retain their neutral step color.

- [ ] **Step 5: Run the focused chest test**

Run from `packages/community-kids`:

```bash
bun test tests/trail-chest.test.tsx -t "liberado é botão"
```

Expected: PASS.

- [ ] **Step 6: Commit the shared chest treatment**

```bash
git add packages/community-kids/src/components/kids/trail-chest.tsx packages/community-kids/src/app/globals.css packages/community-kids/tests/trail-chest.test.tsx
git commit -m "fix(kids): give ready chest lesson button depth"
```

### Task 3: Verify the complete trail change

**Files:**
- Verify: `packages/community-kids/src/components/kids/course-trail.tsx`
- Verify: `packages/community-kids/src/components/kids/trail-chest.tsx`
- Verify: `packages/community-kids/src/app/globals.css`
- Verify: `packages/community-kids/tests/course-trail.test.tsx`
- Verify: `packages/community-kids/tests/trail-chest.test.tsx`

**Interfaces:**
- Consumes: the connector-free trail and shared `kids-node-link` styling contract from Tasks 1 and 2.
- Produces: fresh automated evidence that the UI behavior, types, and formatting are valid.

- [ ] **Step 1: Run both component suites together**

Run from `packages/community-kids`:

```bash
bun test tests/course-trail.test.tsx tests/trail-chest.test.tsx
```

Expected: all tests PASS.

- [ ] **Step 2: Run static verification**

Run from `packages/community-kids`:

```bash
bun run typecheck
bun run check
```

Expected: both commands exit 0.

- [ ] **Step 3: Run the package test suite**

Run from `packages/community-kids`:

```bash
bun test tests
```

Expected: all Community Kids tests PASS. If a pre-existing unrelated test fails, preserve its output and separate it from regressions in these files.

- [ ] **Step 4: Review the final diff**

Run from the repository root:

```bash
git diff --check
git diff -- packages/community-kids/src/components/kids/course-trail.tsx packages/community-kids/src/components/kids/trail-chest.tsx packages/community-kids/src/app/globals.css packages/community-kids/tests/course-trail.test.tsx packages/community-kids/tests/trail-chest.test.tsx
```

Expected: no whitespace errors and only the approved dot-removal, shared chest styling, and regression coverage.
