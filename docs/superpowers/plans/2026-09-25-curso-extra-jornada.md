# Curso Extra na Jornada Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a third Kids course role: unpositioned, not gated by journey progress, but still gated by an active course entitlement or `all_kids_courses`.

**Architecture:** Persist an explicit `journeyRole` (`positioned`, `reward`, `extra`) on courses. Existing positioned courses backfill to `positioned` and existing unpositioned courses remain `reward`; only `extra` bypasses the journey lock. Entitlements, lesson sequencing, completion and certification are unchanged. Both admin and Kids views receive the role to display truthful labels.

**Tech Stack:** Bun, TypeScript, Elysia/TypeBox, Drizzle/PostgreSQL, Next.js/React.

**Spec:** `docs/plans/2026-09-25-curso-extra-jornada-design.md`

## Global Constraints

- Only a positioned course has a non-null `careerSlot`; both `reward` and `extra` have a null slot.
- Existing course rows and old admin requests must keep their current behavior unless explicitly changed.
- `extra` bypasses journey gates only; specific active entitlement or `all_kids_courses` remains mandatory.
- Cadê Todo Mundo? belongs to Faísca (`primeiros-passos`, `2d`) as an extra; the new Desafio remains the sole required Faísca slot.
- The locked card retains the ordinary **Mostrar ao responsável** CTA and points to the course's external Community offer URL.
- Trail order is extras by creation, positioned courses by slot, then rewards by creation; the general catalog order is unchanged.
- Do not mutate staging/production course records, entitlements or offer data, and do not deploy as part of this implementation.

## File map

- `packages/members/src/domain/course/course.ts`: course-role type and domain property.
- `packages/members/src/infrastructure/persistence/drizzle/schema.ts` and next migration: persisted role and constraints/backfill.
- `packages/members/src/infrastructure/persistence/drizzle/{course,content-admin}.repository.ts`: row mapping, create/update/clone.
- `packages/members/src/domain/ports/content-admin-repository.port.ts`, `packages/members/src/application/content-admin/content-admin.service.ts`, `packages/members/src/interfaces/http/{dtos.ts,routes/content.routes.ts}`: authoring contract and validation.
- `packages/core/src/journey/catalog.ts`, `packages/members/src/application/{access/check-access.service.ts,journey-course-locking/journey-course-locking.ts}`: one consistent access policy.
- `packages/members/src/application/mappers/{views.ts,admin-content-views.ts}`, `packages/admin/src/lib/types.ts`, `packages/member-shell/src/lib/types.ts`: API views.
- `packages/admin/src/app/admin/membros/cursos/{course-form-dialog.tsx,courses-client.tsx}` and `packages/community-kids/src/components/kids/{catalog-course-card.tsx,course-card.tsx}`: truthful UI.
- `packages/community-kids/src/lib/journey-map.ts`: sort the filtered trail into the three approved groups.
- Existing core, members, admin and Kids tests: regressions for all roles and both entitlement paths.
- `docs/jornada-do-criador.md` and `docs/aulas-interativas/modulos-cade-todo-mundo.md`: operator guidance.

---

### Task 1: Persist a valid three-role course model

**Files:** Modify course domain/ports, Drizzle schema/repositories, members admin service/DTO/routes and their integration tests. Generate the next members migration and adjust the SQL so backfill precedes the new check constraint.

**Interfaces:** Produce `CourseJourneyRole = 'positioned' | 'reward' | 'extra'` in `@sistemazero/core/journey`, required `Course.journeyRole`, optional `CourseFields.journeyRole` (omitted PATCH preserves the old role unless `careerSlot` actually changes).

- [ ] **Step 1: Write failing authoring tests.** Add cases to `packages/members/tests/integration/content.test.ts` that create an extra with null slot, reject `extra` plus slot, reject `positioned` without slot, preserve an extra on an old PATCH without `journeyRole`, and allow explicit `extra` → `reward`.

```ts
const extra = await createCourse(app, {
  slug: 'cade-todo-mundo', audience: 'kids', level: 'primeiros-passos', track: '2d',
  careerSlot: null, journeyRole: 'extra',
})
expect((await readJson(extra)).journeyRole).toBe('extra')
```

- [ ] **Step 2: Run the focused test red.**

```powershell
bun test packages/members/tests/integration/content.test.ts
```

- [ ] **Step 3: Add the model, validation and persistence.** Use `journeyRole` as the serialized property; derive the CREATE default from the slot (`positioned` if numbered, else `reward`) and preserve the PATCH value when omitted. Enforce the role/slot invariant at the service and database levels. Clone courses into `reward`, as clones already lose their slot.

```ts
export const COURSE_JOURNEY_ROLES = ['positioned', 'reward', 'extra'] as const
export type CourseJourneyRole = (typeof COURSE_JOURNEY_ROLES)[number]

if ((course.journeyRole === 'positioned') !== (course.careerSlot !== null)) {
  throw new InvalidContentCommandError('Escolha uma posição apenas para curso da jornada')
}
```

```sql
ALTER TABLE members.courses ADD COLUMN journey_role members.course_journey_role NOT NULL DEFAULT 'reward';
UPDATE members.courses SET journey_role = 'positioned' WHERE career_slot IS NOT NULL;
ALTER TABLE members.courses ADD CONSTRAINT courses_journey_role_slot_check
  CHECK ((journey_role = 'positioned') = (career_slot IS NOT NULL));
```

- [ ] **Step 4: Run the focused members tests and typecheck green.**

```powershell
bun test packages/members/tests/integration/content.test.ts
bun run --filter @sistemazero/members typecheck
```

- [ ] **Step 5: Commit the model/migration with its tests.**

```powershell
git add packages/members/src packages/members/tests/integration/content.test.ts
git commit -m "feat(members): add explicit journey role to courses"
```

### Task 2: Keep commercial access separate from journey gating

**Files:** Modify core journey resolver, members access/catalog lock projections, views/types, fixtures and focused tests.

**Interfaces:** Extend `resolveJourneyCourseLock` with a fifth optional `journeyRole` argument. Existing four-argument calls keep the old rule; production callers pass `course.journeyRole`.

- [ ] **Step 1: Write failing access tests.** Cover no entitlement (403), specific entitlement (200), Kids master entitlement (200), expired specific entitlement (403), open extra before the Faísca base is complete, and reward remaining locked (423). Test catalog, My courses and direct lesson URLs.

```ts
expect(resolveJourneyCourseLock(EMPTY, 'primeiros-passos-2d', null, true, 'extra'))
  .toEqual({ locked: false })
expect(resolveJourneyCourseLock(EMPTY, 'primeiros-passos-2d', null, true, 'reward'))
  .toMatchObject({ locked: true, reason: 'tier-reward' })
```

- [ ] **Step 2: Run the core and members focused tests red.**

```powershell
bun test packages/core/tests/journey.test.ts packages/members/tests/integration/journey-course-access.test.ts
```

- [ ] **Step 3: Bypass only the journey lock for extras.** Pass the role through both direct access and list projection; the entitlement check in `CheckAccessService` must remain before the role branch.

```ts
if (journeyRole === 'extra') return { locked: false }
```

- [ ] **Step 4: Run tests and typecheck green.**

```powershell
bun test packages/core/tests/journey.test.ts packages/members/tests/integration/journey-course-access.test.ts
bun run --filter @sistemazero/core typecheck
bun run --filter @sistemazero/members typecheck
```

- [ ] **Step 5: Commit access policy with regressions.**

```powershell
git add packages/core packages/members/src packages/members/tests/integration/journey-course-access.test.ts
git commit -m "feat(journey): open extra courses to enrolled learners"
```

### Task 3: Expose the role in admin and Kids without changing the ordinary course card

**Files:** Modify admin and member-shell types, course form/list, Kids course-card labels, `journey-map.ts`, and relevant tests. Update the operator docs.

**Interfaces:** Admin sends `journeyRole`; catalog/My courses return it. The card's existing `hasAccess` and `salesPageUrl` logic remains unchanged.

- [ ] **Step 1: Write failing UI tests.** Verify the admin can select three roles, the slot picker appears only for `positioned`, an extra course says `Curso extra` rather than `Curso bônus`, and an unowned extra still shows **Mostrar ao responsável** with the configured URL. In `journey-map.test.ts`, deliberately interleave creation dates and slots; expect extras ascending by creation, then numbered slots ascending, then rewards ascending by creation.

```tsx
expect(screen.getByText('Curso extra')).toBeTruthy()
expect(screen.getByRole('link', { name: /Mostrar ao responsável/ }).getAttribute('href'))
  .toBe('https://example.test/comunidade')
```

- [ ] **Step 2: Run focused UI tests red.**

```powershell
bun test packages/admin/tests/course-form-default.test.tsx packages/community-kids/tests/catalog-course-card-cta.test.tsx
```

- [ ] **Step 3: Add the role selector, truthful labels and trail-only sort.** Default new unpositioned courses to `reward`, preserve editing state, clear the slot when switching to `reward` or `extra`, require a slot for `positioned`, and send both values on save. Render `Curso extra` where unpositioned cards currently render `Curso bônus`. Sort inside `coursesForLevel` only; do not reorder `ListCatalogService` or `CardShell`.

```ts
const unpositionedLabel = course.journeyRole === 'extra' ? 'Curso extra' : 'Curso bônus'
const group = (course: CatalogCourseView) =>
  course.journeyRole === 'extra' ? 0 : typeof course.careerSlot === 'number' ? 1 : 2
const ordered = [...inTier].sort((a, b) => {
  const groupDelta = group(a) - group(b)
  if (groupDelta) return groupDelta
  if (group(a) === 1) return (a.careerSlot ?? 0) - (b.careerSlot ?? 0)
  return (a.createdAt ?? '').localeCompare(b.createdAt ?? '') ||
    a.courseSlug.localeCompare(b.courseSlug)
})
```

- [ ] **Step 4: Run UI tests, typechecks and docs checks green.**

```powershell
bun test packages/admin/tests/course-form-default.test.tsx packages/community-kids/tests/catalog-course-card-cta.test.tsx packages/community-kids/tests/journey-map.test.ts
bun run --filter @sistemazero/admin typecheck
bun run --filter @sistemazero/community-kids typecheck
```

- [ ] **Step 5: Commit the UI and docs.**

```powershell
git add packages/admin packages/member-shell packages/community-kids docs/jornada-do-criador.md docs/aulas-interativas/modulos-cade-todo-mundo.md
git commit -m "feat(kids): show extra courses in the Faísca trail"
```

### Task 4: Full regression and rollout readiness

**Files:** Add/adjust database constraint tests and project-level regressions if focused verification exposes failures.

**Interfaces:** No runtime API changes beyond `journeyRole`; no automatic data grants or course publication.

- [ ] **Step 1: Verify the migration and invariant with database tests.**

```powershell
bun test packages/members/tests/db/journey-slot-constraint.test.ts
```

- [ ] **Step 2: Run all directly affected suites and typechecks.**

```powershell
bun test packages/core/tests/journey.test.ts packages/members/tests/integration/journey-course-access.test.ts packages/members/tests/integration/content.test.ts packages/community-kids/tests/journey-map.test.ts packages/community-kids/tests/catalog-course-card-cta.test.tsx
bun run --filter @sistemazero/members typecheck
bun run --filter @sistemazero/admin typecheck
bun run --filter @sistemazero/community-kids typecheck
```

- [ ] **Step 3: Check formatting, diff and unchanged entitlement policy.**

```powershell
bunx biome check packages/core/src/journey/catalog.ts packages/members/src packages/admin/src/app/admin/membros/cursos packages/community-kids/src/components/kids packages/member-shell/src/lib/types.ts
git diff --check
git status --short
```

- [ ] **Step 4: Report the deployment/configuration handoff.** After a separate authorized deployment, the operator sets Cadê Todo Mundo? to `extra`, `primeiros-passos`/`2d`, null slot, and the Community offer URL. Existing entitlements are not changed.

## Self-review

- Spec coverage: model, migration, entitlement separation, journey policy, admin, Kids cards, tests and operator configuration each map to a task above.
- No unowned course auto-enrolls; neither a Kids master nor a specific entitlement bypasses the reward rule for existing bonuses.
- The user explicitly approved trail ordering by role/slot/creation; the global catalog keeps its creation-date order.
