# Cadê Todo Mundo? Aula 1 Progressive Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the child's first experiment the second section, moving UI orientation to the moment of use and keeping the optional map in the practice section.

**Architecture:** `gerar-cade-todo-mundo.ts` is the source of the manifest structure; its generated Aula 1 JSON must match the spoken script and author notes. Keep video, experiment and Studio completion rules unchanged while removing the dedicated material section and video.

**Tech Stack:** Markdown lesson scripts, TypeScript manifest generator, JSON learning manifest, Bun tests.

**Spec:** `docs/plans/2026-09-25-cade-todo-mundo-aula-1-onboarding-progressivo-design.md`

## Global Constraints

- Exactly one video per section; three sections total in Aula 1.
- Intro is short and only introduces the game, sections, video replay and **Próxima seção**.
- The first experiment is section two; **Anterior** and the activity controls are taught there.
- Studio controls are taught only in the Studio section.
- `caderno` is optional, belongs to the practice section and is not in `completion.blockIds`.
- Preserve the experiment scene, Studio initial project, required actions and submission checks.
- Do not import, publish or record the content as part of this work.

---

### Task 1: Lock the new section sequence in a regression test

**Files:** Modify `docs/aulas-interativas/qa/cade-todo-mundo-manifestos.test.ts`.

**Interfaces:** Reads `LearningManifest` through the existing `manifesto('aula-1')` helper; expects stable section keys, block keys and completion block IDs.

- [ ] **Step 1: Add a failing test.** Assert `sections.map(s => s.key)` equals `['apresentacao','toque-e-resposta','primeiro-achado']`; the intro has only `video-a1-abertura`; the concept section includes `video-a1-toque` and `experiencia-toque`; the practice contains `caderno`, `video-a1-programar`, `projeto`, but not `video-a1-caderno`, and its completion remains `['video-a1-programar','projeto']`. Assert the deleted video key is absent from `blocks`.
- [ ] **Step 2: Run `bun test docs/aulas-interativas/qa/cade-todo-mundo-manifestos.test.ts` and confirm the new assertion fails on the old four-section manifest.**

### Task 2: Update the manifest source and generated JSON

**Files:** Modify `docs/aulas-interativas/qa/gerar-cade-todo-mundo.ts` and `docs/aulas-interativas/aulas/cade-todo-mundo-aula-1.manifesto.json`.

**Interfaces:** Generator exports no public API; running it rewrites the three course manifests. Preserve Aula 2 and certificate bytes or verify they remain unchanged.

- [ ] **Step 1: Remove `video-a1-caderno` and the `caderno` section.** Set intro direction to a short game/mission/sections demonstration. Add **Anterior** and activity help to `video-a1-toque` direction. Add embedded Studio and optional map directions to `video-a1-programar`; append `caderno` to its `blockKeys`, not its completion IDs.
- [ ] **Step 2: Run `bun docs/aulas-interativas/qa/gerar-cade-todo-mundo.ts` and inspect the JSON diff.** Only Aula 1 should change; if generated Aula 2 or certificate differs, inspect before proceeding.
- [ ] **Step 3: Run the focused manifest test and `bun docs/aulas-interativas/qa/validar-manifestos.ts cade-todo-mundo`; require both to pass.**

### Task 3: Rewrite spoken script and author notes

**Files:** Modify `docs/aulas-interativas/aulas/cade-todo-mundo-aula-1.roteiro.md` and `docs/aulas-interativas/aulas/cade-todo-mundo-aula-1.md`.

**Interfaces:** Each heading corresponds to one manifest section and one video. Directions are not spoken; quoted text is speakable Brazilian Portuguese for a child at first contact.

- [ ] **Step 1: Write the intro as a brief invitation with game, mission, section/video concept, pause/replay and next button.** No activity/Studio tour or victory spoilers beyond the short game preview.
- [ ] **Step 2: Start the concept video with the navigation bridge, then the campainha analogy; show activity location and ampliation only after introducing the experiment, without revealing the result.** Keep Zappy bridge distinct from the instruction inside the scene.
- [ ] **Step 3: Introduce the Studio and its expand/reduce controls when the child reaches the practice; preserve every block-placement instruction.** Mention the optional map only at the end of the practice, not as a prerequisite.
- [ ] **Step 4: Replace the four-row author table with three rows and update production notes so no obsolete material video is requested.**

### Task 4: Verify and hand off

**Files:** No new files.

- [ ] **Step 1: Run `bun test docs/aulas-interativas/qa/cade-todo-mundo-manifestos.test.ts docs/aulas-interativas/qa/cade-todo-mundo-projeto.test.ts` and the manifest validator.**
- [ ] **Step 2: Run `bunx biome check docs/aulas-interativas/qa/gerar-cade-todo-mundo.ts docs/aulas-interativas/qa/cade-todo-mundo-manifestos.test.ts` and `git diff --check`.**
- [ ] **Step 3: Inspect all three generated manifests, confirm only Aula 1 changed and that intro, concept, Studio and caderno are internally consistent. Commit only the scoped files locally.**

## Self-review

The plan covers the three-section structure, contextual UI orientation, optional map placement, unchanged completion rules, generator/JSON consistency and recording handoff. No new runtime behavior or child-facing control is introduced.
