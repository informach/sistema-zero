# Challenge Days 2–5 Pedagogical Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the four remaining construction days follow the approved Day 1 teaching pattern, with lesson scripts, manifests, experience behavior and completion rules in agreement.

**Architecture:** Each day has one analysis, one recording script and one importable manifest under `docs/aulas-interativas/aulas`. Shared scene behavior lives in `packages/core/src/learning/scene`; the editorial validator gates migrated manifests through `docs/aulas-interativas/qa/novo-modelo.ts`. Keep lesson-specific copy in manifests and scripts, and change shared scene code only for an observed behavioral defect.

**Tech Stack:** Markdown, JSON manifest v5, TypeScript, Bun tests, Biome.

**Spec:** `docs/plans/2026-09-24-desafio-dias-2-a-5-design.md`

## Global Constraints

- Only Days 2, 3, 4 and 5 of `desafio-primeiro-jogo`; do not edit introduction or certificate.
- One video and at most one short Zappy dialogue per section. Concept section order: video, dialogue, experimentation. Practical section order: video, dialogue, shared Studio workspace.
- Concept completion requires both the video and the experiment. Practical completion requires the video and the project checks; final delivery requires its video and Studio submission. Quiz is its own section with one Zappy introduction and no other blocks, before delivery.
- A prediction is selective. Instructions identify each mandatory action and observation without pre-announcing the outcome. A final question remains only when it asks for a new interpretation.
- Keep the space-game cast and background, existing Studio chain, carry-over project, block labels and canonical values. New videos are recording plans, not media uploads.
- Preserve concurrent edits. Do not push or deploy without a new request.

---

### Task 1: Day 2, ship shoots

**Files:**
- Modify: `docs/aulas-interativas/aulas/desafio-dia-2.manifesto.json`
- Modify: `docs/aulas-interativas/aulas/desafio-dia-2.roteiro.md`
- Modify: `docs/aulas-interativas/aulas/desafio-dia-2.md`
- Modify: `docs/aulas-interativas/qa/novo-modelo.ts`

**Interfaces:** Consumes the existing manifest v5 shape and shared scene IDs `once-vs-always`, `fixed-vs-read`, `velocity`, `cleanup`; produces a manifest whose four concept sections have video+bridge+experience and all practical sections have video+bridge+project checks.

- [ ] **Step 1: Enable editorial diagnostics for Day 2.** Add `desafio-dia-2.manifesto.json` to `MANIFESTOS_NOVO_MODELO`, run `bun docs/aulas-interativas/qa/validar-manifestos.ts desafio-dia-2`, and record the expected warnings for missing concept video, duplicate dialogues, missing video completion and mixed quiz.
- [ ] **Step 2: Repair the manifest.** Preserve current project checks and Studio block. Add `plannedVideo` blocks for number written/read, vertical velocity and cleanup. Give each concept exactly one short bridge and one experience, reduce redundant prediction/checkpoint where their answers are already the observed result, and include video+experience keys in `completion.blockIds`. Replace multi-dialogue construction instructions with one post-video task bridge and add the practical video key to completion. Move quiz into `quiz-final` immediately before delivery with its own short introduction.
- [ ] **Step 3: Synchronize both Markdown files.** Write narrations and on-screen directions for the new conceptual clips, keep category→subcategory→block and exact values in practical video scripts, and update analysis section counts, clip table, experiment descriptions and completion descriptions to match the manifest exactly.
- [ ] **Step 4: Verify.** Run `bun docs/aulas-interativas/qa/validar-manifestos.ts desafio-dia-2` (one valid, zero convention warnings) and `bun test packages/core/tests/learning.test.ts`. Inspect `git diff --check` and commit only the four Day 2 files.

### Task 2: Day 3, asteroid rain and collision

**Files:**
- Modify: `docs/aulas-interativas/aulas/desafio-dia-3.manifesto.json`
- Modify: `docs/aulas-interativas/aulas/desafio-dia-3.roteiro.md`
- Modify: `docs/aulas-interativas/aulas/desafio-dia-3.md`
- Modify: `docs/aulas-interativas/qa/novo-modelo.ts`

**Interfaces:** Consumes the Day 2 project state unchanged; produces concepts for the `spawn`, `random` and `collision-pair` scenes and a final project ready for Day 4.

- [ ] **Step 1: Enable diagnostics.** Add `desafio-dia-3.manifesto.json` to `MANIFESTOS_NOVO_MODELO`; run `bun docs/aulas-interativas/qa/validar-manifestos.ts desafio-dia-3` and confirm it reports the old missing-video, excess-dialogue, quiz and completion defects.
- [ ] **Step 2: Repair the manifest.** Add short conceptual video plans for the clock, randomized x with offscreen y, and collision aliases. Keep the real missed-shot observation before the collision solution. Make each experience instruction cover its goals without stating the result. Keep one post-video bridge per practical section; preserve checks for the 40-frame clock, `y=-30`, `vy=3`, group order and pair-only collision. Isolate quiz before delivery and include video completion everywhere applicable.
- [ ] **Step 3: Synchronize Markdown.** Add complete conceptual narrations and visual directions to the recording script. Update the analysis to explain why each experience, prediction and final question remains or leaves, and match video/section keys with the manifest.
- [ ] **Step 4: Verify.** Run the Day 3 manifest validator and `bun test packages/core/tests/learning.test.ts`; inspect `git diff --check`, then commit only the Day 3 files and `novo-modelo.ts`.

### Task 3: Day 4 scene must require the second lives comparison

**Files:**
- Modify: `packages/core/src/learning/scene/once-vs-always.test.ts`
- Modify: `packages/core/src/learning/scene/once-vs-always.ts`
- Modify: `packages/core/src/learning/scene/catalog.ts`
- Modify: `packages/core/src/learning/scene/presets.ts`
- Modify: `packages/core/src/learning/scene/pistas.ts`

**Interfaces:** Produces case-only goal ID `lives-loop` for preset `uma-ficha-vidas`, after the existing `once` goal; other presets retain their existing goals.

- [ ] **Step 1: Add a failing regression.** In `once-vs-always.test.ts`, open preset `uma-ficha-vidas` with `['once','lives-loop']`, put `lives` in `start`, advance six frames, assert `once` is discovered but completion is false; reset, move `lives` to `loop`, advance nine frames, assert `lives-loop` is discovered and completion is true. Run `bun test packages/core/src/learning/scene/once-vs-always.test.ts` and observe failure for the missing goal.
- [ ] **Step 2: Implement the minimal evidence.** Add `lives-loop` as a case-only goal to `catalog.ts`, append it to `ONCE_GOALS_BY_PRESET['uma-ficha-vidas']`, place it on the second hint rung in `pistas.ts`, and in the life-preset branch of `onceDiscoveries` recognize loop placement only after three scheduled hits and repeated life assignment. Keep the old `once` evidence unchanged.
- [ ] **Step 3: Run scene tests.** Run `bun test packages/core/src/learning/scene/once-vs-always.test.ts packages/core/src/learning/scene/presets.test.ts packages/member-shell/tests/scene-once-vs-always.test.tsx`. Verify both goals are visually actionable and commit only these five files.

### Task 4: Day 4, points and lives

**Files:**
- Modify: `docs/aulas-interativas/aulas/desafio-dia-4.manifesto.json`
- Modify: `docs/aulas-interativas/aulas/desafio-dia-4.roteiro.md`
- Modify: `docs/aulas-interativas/aulas/desafio-dia-4.md`
- Modify: `docs/aulas-interativas/qa/novo-modelo.ts`

**Interfaces:** Consumes the `lives-loop` goal from Task 3; preserves Day 4 Studio checks and project state needed by Day 5.

- [ ] **Step 1: Enable diagnostics.** Add `desafio-dia-4.manifesto.json` to `MANIFESTOS_NOVO_MODELO` and run its validator to expose old-model warnings.
- [ ] **Step 2: Repair the manifest.** Add video plans for variable, invincibility and once-vs-always applied to lives. Give each experience one bridge, cover all required goals in its instruction, change the lives case goal list to `['once','lives-loop']`, and remove a final question if it merely asks for the already-observed outcome. Put a single post-video bridge in each practical section, include video keys in completion, and move quiz before delivery.
- [ ] **Step 3: Synchronize Markdown.** Explain storing/changing/showing, the three contacts at frames 1/10/30, and why reassigning lives every frame defeats damage. Preserve the correct fact that the colliding asteroid is already removed and protection guards against later rocks. Match clip keys, section numbers, and completion in both Markdown files.
- [ ] **Step 4: Verify.** Run Day 4 validator, the scene regression from Task 3 and `bun test packages/core/tests/learning.test.ts`; inspect `git diff --check`, then commit only Day 4 files and `novo-modelo.ts`.

### Task 5: Day 5, game states and final delivery

**Files:**
- Modify: `docs/aulas-interativas/aulas/desafio-dia-5.manifesto.json`
- Modify: `docs/aulas-interativas/aulas/desafio-dia-5.roteiro.md`
- Modify: `docs/aulas-interativas/aulas/desafio-dia-5.md`
- Modify: `docs/aulas-interativas/qa/novo-modelo.ts`

**Interfaces:** Consumes Day 4 canonical project state; produces a complete challenge game with four state branches, restart-to-menu, separated quiz and one final delivery video.

- [ ] **Step 1: Enable diagnostics.** Add `desafio-dia-5.manifesto.json` to `MANIFESTOS_NOVO_MODELO`; run validator and confirm it catches two videos in `momentos` and `entrega`, plus excess Zappy and mixed quiz.
- [ ] **Step 2: Repair the manifest.** Separate the four-moments concept video from the practical constant/initial-state video while keeping a coherent progression. Add concept video plans for `game-state` and `restart`; keep video, bridge and experience together in each concept. Replace multi-dialogue practical sections with one post-video invitation, preserve all 20 project checks, and require the practical video. Isolate quiz before final delivery; make final delivery one video by integrating the course close into its test/send/share plan.
- [ ] **Step 3: Synchronize Markdown.** Script the exact four moments, three independently guarded execution places (motor, clock and Space), the whole-chain move, the two-Enter restart cycle, and a final clip that only promises available sharing controls. Match all section keys, durations and goals with the manifest.
- [ ] **Step 4: Verify.** Run Day 5 validator and `bun test packages/core/tests/learning.test.ts`; inspect `git diff --check`, then commit only Day 5 files and `novo-modelo.ts`.

### Task 6: Full cross-day review

**Files:**
- Modify if contradiction remains: `docs/aulas-interativas/BRIEFING.md`
- Test: `docs/aulas-interativas/aulas/desafio-dia-{2,3,4,5}.manifesto.json`
- Test: `packages/core/src/learning/scene/once-vs-always.test.ts`

**Interfaces:** Produces a verified local `staging` commit sequence. Does not import drafts in admin or publish lessons.

- [ ] **Step 1: Audit consistency.** Compare all video and section keys across each day’s three artifacts. Check every experience's initial scene, controls, goals, instruction, prediction, checkpoint and success text. Check Day N exit state against Day N+1 input and confirm the space setting/cast on all scenes. Repair any residual contradiction in `BRIEFING.md` section 9 about mandatory predictions/questions.
- [ ] **Step 2: Run final verification.** Run `bun docs/aulas-interativas/qa/validar-manifestos.ts desafio-dia-`, `bun test packages/core/tests/learning.test.ts packages/core/src/learning/scene/once-vs-always.test.ts`, relevant member-shell tests, TypeScript checks for touched packages, and `bunx biome check` on changed TS/JSON. Run `git diff --check`.
- [ ] **Step 3: Review scope and commit residual fixes.** Inspect `git diff --stat` and `git status --short`, verify no introduction/certificate changes, and commit only task-owned residual files. Report validation, new recording plans and any remaining manual preview needs; do not push or deploy.
