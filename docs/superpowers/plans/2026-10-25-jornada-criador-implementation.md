# Jornada do Criador Implementation Plan

> **For agentic workers:** Use subagent-driven implementation with isolated file ownership and shared contracts; execute this approved plan without a new design approval.

**Goal:** Implement the approved curriculum across core, Members, Admin, Kids and adult communities, including mastery review and a repeatable catalog seed.
**Architecture:** Shared pure curriculum inside the existing versioned policies. Members owns progress and entitlement decisions. Immutable mastery reviews and durable awards. Interfaces render server projections.
**Tech Stack:** TypeScript, Zod, Bun, Drizzle/PostgreSQL, Elysia, Next.js/React, shared member-shell.
**Spec:** `docs/plans/2026-10-25-jornada-criador-design.md` and `packages/members/src/infrastructure/config/creator-journey-curriculum.json`.

## Global Constraints

- Preserve unrelated local changes, including `docs/design/cade-todo-mundo-prototipo*` and `packages/member-shell/tests/scene-contrast.test.ts`.
- Preserve existing course UUIDs, content, grants, earned floors and commercial promises. Drafts do not become published lessons by seeding.
- Keep policies as the sole authority. No browser-only authorization, fabricated remote IDs or implicit seed fallback.
- Generate schema migrations with `bun run db:generate`; coordinate a single generation after schema changes converge.
- New visual work follows the current adult/Kids styles, accessibility and responsive layouts.

## Task 1: Shared contract and behavior (core_journey)

- [x] Add curriculum schemas, role identities, seven stages and six mastery areas under `packages/core/src/journey`.
- [x] Integrate optional curriculum into Kids/adult policy projection while preserving historical policies, pause and earned floors.
- [x] Add shared course locks, distinct Power quorum, early capabilities and mastery evaluation.
- [x] Verify 0/1/2 bases, mission completion, distinct Powers, repeated variants, floors, pause, invalid policies and mastery prerequisites.

## Task 2: Members integration and seed (members_seed)

- [x] Integrate common view into journey queries, authorization, course catalog/detail and gamification.
- [x] Resolve direct entitlements independently of the strongest subscription; test active, expired, gift and subscription-origin enrollment.
- [x] Grant curricular Studio blocks on course completion, without Mural requirement.
- [x] Implement complete editorial seed in `packages/members/scripts` and application services, resolving known slugs by audience, preserving content and creating future drafts.
- [x] Provide dry-run, idempotence report, conflict detection and activation through existing policy publication flows.
- [x] Verify focused Members service and seed tests, plus local DB integration if the safe harness is available.

## Task 3: Interfaces (journey_ui)

- [x] Extend shared member-shell contracts and present new server view.
- [x] Update Kids map, post, cards, home/progress, course detail and locked states.
- [x] Update adult map/post/catalog/progress while preserving current visual identity.
- [x] Add mastery hub/detail and submit/feedback flows.
- [x] Update Admin policy/course forms for bases, mission, Powers, extras and mastery curriculum using existing publication protocol.
- [x] Exercise real components in fixture preview at mobile/tablet/desktop and relevant behavioral tests.

## Task 4: Mastery persistence and review (root)

- [x] Add typed domain records/ports, immutable submissions/reviews/credits/awards and Drizzle repository.
- [x] Add learner and staff services/routes with account/profile/audience ownership and rubric-version validation.
- [x] Add Admin review queue with criterion-level approval/revision feedback and explicit credit workflow.
- [x] Verify unauthorized review, stale evidence, missing criterion, partial approval, repeated workshops, predecessor levels and durable awards.
- [x] Generate and inspect additive migrations after coordination with Members agent.

## Task 5: Integration and delivery (root + focused agent follow-ups)

- [x] Reconcile interfaces and run affected package typechecks/lint/tests.
- [x] Inspect responsive scene previews and repair demonstrated failures.
- [x] Update package documentation and seed/rollout/rollback instructions, including planned content boundaries.
- [x] Record commands/results and remaining external requirements; deliver implementation with exact seed commands and truthful deployment status.

## Execution log

Revisão completa de 26/10 concluída: correções, reproduções, resultados de testes e limites
estão em [Full review da Jornada](../../jornada-criador-full-review-2026-10-26.md).

- 25/10/2026: repository synchronized at `875e143cd`; approved proposal exported into a versioned implementation specification. Read-only audits completed; implementation delegated by package. No production writes.
- 25/10/2026: implemented core policy projection, course access, seed, mastery persistence/review and all learner/Admin surfaces. Generated additive migration `0139_creator_journey_masteries`; exercised actual migrations in dedicated local PostgreSQL databases.
- 25/10/2026: final critical review repaired policy-pause races, deletion/capture lock ordering, first-submission snapshot races, historical mastery admission, duplicate resubmission feedback, stale Admin queue responses and real draft/historical course facts. No schema rewrite or remote mutation was needed.
- 25/10/2026: Core, Members, Gateway, Admin, Kids and adult typechecks passed; 28 browser scenarios passed with screenshots at mobile/tablet/desktop. Scoped behavior/SQL test results and activation boundaries are recorded in `docs/jornada-criador-verificacao.md`. Implementation complete locally; production activation and content authoring follow the documented seed workflow.
- 25/10/2026: isolated Member Shell typecheck also passed after correcting preview JSON tuple validation and the fetch test double; its 16 UI/BFF tests were rerun successfully. All seven affected package typechecks are green.
