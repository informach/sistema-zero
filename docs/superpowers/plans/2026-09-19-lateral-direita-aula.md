# Lateral direita contínua nas aulas — Implementation Plan

> **For agentic workers:** Execute inline, task by task, with a review after each task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the lesson outline a full-height, edge-to-edge white sidebar that opens smoothly in Kids and Adult without covering lesson content or the fixed footer.

**Architecture:** Keep the existing outline markup and content, but keep the panel mounted and use the visible state to animate its horizontal transform. Reserve exactly the visible sidebar width in the lesson layout, and move the fixed footer's right edge by the same width. The Kids and Adult lesson mains adjust their right padding; the Adult main keeps its existing unlimited width so two-column sections still use all available space.

**Tech Stack:** React, Next.js, Tailwind CSS v4, app `globals.css`, Bun tests, TypeScript.

**Spec:** `docs/plans/2026-09-19-lateral-direita-aula-design.md`

## Global Constraints

- Desktop outline width: `18rem`; animation duration: `300ms`, matching the Kids left menu.
- Desktop panel: white, fixed to the viewport's right edge, `100dvh` high, no outer rounding or external margin.
- Closed panel: `aria-hidden`, `inert`, and not pointer-interactive.
- Mobile: retain the right drawer and backdrop; do not reduce lesson or footer width.
- `prefers-reduced-motion: reduce`: no transition.
- Preserve lesson content, course progress, links, rating, and the existing visual identities of Kids and Adult.
- Do not change the left menu's height; the user explicitly set aside the reported gray strip.
- Other sessions are editing this worktree: preserve their changes and stage only reviewed files/hunks.

---

### Task 1: Kids desktop outline and footer

**Files:**
- Modify: `packages/community-kids/src/app/(app)/cursos/[slug]/aulas/[lessonId]/lesson-player-client.tsx`
- Modify: `packages/community-kids/src/app/globals.css`
- Test: `packages/community-kids/tests/lesson-footer-layout.test.ts`

**Interfaces:** The existing `outlineCollapsed: boolean` and `toggleOutline()` stay unchanged. `#kids-lesson-outline[aria-hidden="true"]` is the closed state; the CSS variable `--lesson-outline-width` remains `18rem` on `.kids-shell-row`.

- [ ] **Step 1: Write failing layout-contract tests.** Read the player and CSS source. Assert the intended markup and CSS contracts, for example:

```ts
expect(kidsPlayer).toContain('inert={outlineCollapsed}')
expect(kidsPlayer).toContain('outlineCollapsed && \'pointer-events-none\'')
expect(kidsPlayer).toContain('lg:translate-x-full')
expect(kidsCss).toContain('right: var(--lesson-outline-width)')
expect(kidsCss).toContain('transition: padding-right 0.3s ease-in-out')
```
- [ ] **Step 2: Run `bun test tests/lesson-footer-layout.test.ts` in `packages/community-kids` and confirm those new assertions fail.**
- [ ] **Step 3: Keep the outline mounted.** Replace the closed-state `hidden` with transform and pointer-state classes. Use the existing state directly:

```tsx
<aside
  id="kids-lesson-outline"
  aria-hidden={outlineCollapsed}
  inert={outlineCollapsed}
  className={cn(
    'fixed inset-y-0 right-0 z-[61] flex w-[min(20rem,90vw)] flex-col bg-card transition-transform duration-300 ease-in-out lg:z-40 lg:w-(--lesson-outline-width) motion-reduce:transition-none',
    outlineCollapsed ? 'pointer-events-none translate-x-full' : 'translate-x-0',
  )}
>
```

Make the inner card `flex min-h-0 flex-1 flex-col lg:rounded-none lg:border-0`, and the `nav` `max-h-[28rem] overflow-y-auto lg:max-h-none lg:min-h-0 lg:flex-1`. Remove the parent `lg:gap-10` because the panel is no longer a flex column. Keep the mobile drawer and backdrop.
- [ ] **Step 4: In Kids CSS, reserve the panel width and move the footer.** The key desktop rules are:

```css
@media (min-width: 1024px) {
  .kids-aula { transition: padding-right 0.3s ease-in-out; }
  .kids-aula:has(#kids-lesson-outline:not([aria-hidden="true"])) {
    padding-right: calc(2rem + var(--lesson-outline-width));
  }
  .kids-aula:has(#kids-lesson-outline:not([aria-hidden="true"])) .sz-lesson-nav-immersive {
    right: var(--lesson-outline-width);
  }
}
```

Add `right` to the footer transition and disable both transitions under reduced motion.
- [ ] **Step 5: Run `bun test tests/lesson-footer-layout.test.ts tests/focus-mode.test.ts` and the Kids typecheck; review the diff for mobile, focus, and overlapping edits.**

### Task 2: Adult desktop outline and footer

**Files:**
- Modify: `packages/community/src/app/(app)/cursos/[slug]/aulas/[lessonId]/lesson-player-client.tsx`
- Modify: `packages/community/src/app/globals.css`
- Test: `packages/community-kids/tests/lesson-footer-layout.test.ts`

**Interfaces:** The existing `outlineOpen: boolean` and `setOutlineOpen()` stay unchanged. `#adult-lesson-outline[aria-hidden="true"]` is the closed state; `--lesson-outline-width` is defined once on the Adult lesson `main`.

- [ ] **Step 1: Add failing Adult layout-contract assertions.** They verify persistent, accessible outline markup; a full-height fixed sidebar; an internally scrolling lesson list; and an exact footer inset:

```ts
expect(adultPlayer).toContain('inert={!outlineOpen}')
expect(adultPlayer).toContain('!outlineOpen ? \'pointer-events-none translate-x-full\'')
expect(adultPlayer).toContain('lg:max-h-none lg:min-h-0 lg:flex-1')
expect(adultCss).toContain('right: var(--lesson-outline-width)')
```
- [ ] **Step 2: Run `bun test tests/lesson-footer-layout.test.ts` in `packages/community-kids` and confirm failure.**
- [ ] **Step 3: Update the Adult outline markup to use fixed full-height positioning and the existing state:**

```tsx
<aside
  id="adult-lesson-outline"
  aria-hidden={!outlineOpen}
  inert={!outlineOpen}
  className={cn(
    'fixed inset-y-0 right-0 z-[61] flex w-[min(20rem,90vw)] flex-col bg-card transition-transform duration-300 ease-in-out lg:z-40 lg:w-(--lesson-outline-width) motion-reduce:transition-none',
    !outlineOpen ? 'pointer-events-none translate-x-full' : 'translate-x-0',
  )}
>
```

Give its `Card` `flex min-h-0 flex-1 flex-col lg:rounded-none lg:border-0 lg:shadow-none`, the `nav` `max-h-[28rem] overflow-y-auto lg:max-h-none lg:min-h-0 lg:flex-1`, and remove the old flex gap/sticky positioning.
- [ ] **Step 4: In Adult CSS, preserve the full-width two-column layout and move the footer.** The key desktop rules are:

```css
@media (min-width: 1024px) {
  main:has(.sz-aula-adulto) { --lesson-outline-width: 18rem; transition: padding-right 0.3s ease-in-out; }
  main:has(#adult-lesson-outline:not([aria-hidden="true"])) {
    padding-right: calc(1.5rem + var(--lesson-outline-width));
  }
  .sz-aula-adulto:has(#adult-lesson-outline:not([aria-hidden="true"])) .sz-lesson-nav-immersive {
    right: var(--lesson-outline-width);
  }
}
```

Add a matching `right` transition to the footer, and disable the transitions for reduced motion.
- [ ] **Step 5: Run the layout tests and Adult typecheck; review the diff for mobile, focus, and overlapping edits.**

### Task 3: Integrated verification and handoff

**Files:**
- Review: both lesson players, both app stylesheets, `packages/member-shell/src/components/lesson-sections.tsx`, and `packages/community-kids/tests/lesson-footer-layout.test.ts`.

- [ ] **Step 1: Run `bun test tests/lesson-footer-layout.test.ts tests/lesson-sections.test.tsx tests/focus-mode.test.tsx` in `packages/community-kids`.**
- [ ] **Step 2: Run `bun run typecheck` in `packages/community-kids`, `packages/community`, and `packages/member-shell`; run Biome on touched code and `git diff --check`.**
- [ ] **Step 3: Inspect open/closed, left/right/both-open, reduced-motion, and mobile behavior in a browser if an authenticated browser is available. If unavailable, state that visual verification remains unconfirmed.**
- [ ] **Step 4: Review all own changes against the spec, preserve simultaneous work, and commit only changes safely attributable to this work. Do not push/deploy without a new explicit request.**
