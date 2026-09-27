# Cadê Todo Mundo? Aula 1 Progressive Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the child's first experiment the second section, moving UI orientation to the moment of use and keeping the optional map in the practice section.

**Architecture:** `gerar-cade-todo-mundo.ts` is the source of the manifest structure; its generated Aula 1 JSON must match the spoken script and author notes. Keep video, experiment and Studio completion rules unchanged while removing the dedicated material section and video.

**Tech Stack:** Markdown lesson scripts, TypeScript manifest generator, JSON learning manifest, Bun tests.

**Spec:** `docs/plans/2026-09-25-cade-todo-mundo-aula-1-onboarding-progressivo-design.md`

## Global Constraints

- Exactly one video per section; three sections total in Aula 1.
- Intro lasts about 1–1.5 minutes and introduces the complete game, sections, video pause/replay and **Próxima seção** without previewing the activity or Studio controls.
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

### Task 5: Restore explanatory depth without changing the sequence (26/09 clarification)

**Files:** Modify `docs/aulas-interativas/aulas/cade-todo-mundo-aula-1.roteiro.md`, `docs/aulas-interativas/aulas/cade-todo-mundo-aula-1.md`, `docs/aulas-interativas/qa/gerar-cade-todo-mundo.ts`, and the Aula 1 manifest JSON.

**Interfaces:** Keep the three existing section keys and all `completion.blockIds` unchanged. Only spoken copy, recording directions and matching planned-video descriptions change.

- [ ] **Step 1: Restore the complete-game demonstration in section 1.** Name three hidden characters, demonstrate all three reveals, the `Achados` counter and celebration; distinguish what is already prepared from what the child will program today. Explain sections, pause, replay and **Próxima seção** with the earlier reassurance, without touring the activity or Studio. Target around 1–1.5 minutes.
- [ ] **Step 2: Restore navigation and activity guidance in section 2.** Explain **Anterior** without losing work, the campainha analogy and the meaning of acontecimento/ação. Show that video and activity share the section, the drag divider on wide screens, **Ampliar experiência/Voltar à aula**, and the activity below the video on narrow screens. Do not reveal the experiment's result or repeat its detailed instruction outside the experience.
- [ ] **Step 3: Restore Studio guidance in section 3.** Explain that the embedded Studio is where blocks become game instructions and no other page is needed. Demonstrate divider, **Expandir/Reduzir** in context, preserve the full block-by-block directions, and give the optional map a fuller explanation at the end.
- [ ] **Step 4: Match planned-video descriptions to the script.** Edit generator and manifest JSON together. Keep Aula 2 and certificate unchanged, then run `bun test docs/aulas-interativas/qa/cade-todo-mundo-manifestos.test.ts docs/aulas-interativas/qa/cade-todo-mundo-projeto.test.ts`, `bun docs/aulas-interativas/qa/validar-manifestos.ts cade-todo-mundo`, `bunx biome check docs/aulas-interativas/qa/gerar-cade-todo-mundo.ts`, and `git diff --check`.

### Task 6: Teach where the child sees and tests the game (26/09 clarification)

**Files:** Modify `docs/aulas-interativas/aulas/cade-todo-mundo-aula-1.roteiro.md`, `docs/aulas-interativas/aulas/cade-todo-mundo-aula-1.md`, `docs/aulas-interativas/qa/gerar-cade-todo-mundo.ts`, and `docs/aulas-interativas/aulas/cade-todo-mundo-aula-1.manifesto.json`.

**Interfaces:** Keep all section keys, block keys and `completion.blockIds` unchanged. Edit only section 3 speech, recording direction and matching planned-video description. The narrow/wide distinction depends on the Studio width, not the fullscreen toggle alone.

- [ ] **Step 1: Correct the spoken test.** Replace “aperta o botão de iniciar a prévia do jogo” with a short demonstration: narrow Studio → open the **Pré-visualização** tab; wide Studio → look at the game beside the blocks, use the eye only if hidden. Explain that the updated game appears there automatically; touch the hiding place to test. Do not make Reproduzir/Atualizar a required action.
- [ ] **Step 2: Correct recording and author guidance.** Record both widths, point to the actual tab or adjacent game at test time, demonstrate the eye only in wide layout, and ensure the camera captures the touch and reveal. Remove the old instruction to check an invented preview-start button label. Preserve the existing block-placement, save and submission steps.
- [ ] **Step 3: Align source and manifest.** Give `video-a1-programar` the same preview direction in `gerar-cade-todo-mundo.ts` and Aula 1 JSON. Do not change Aula 2 or certificate; review the diff to confirm only planned-video copy changed in the JSON.
- [ ] **Step 4: Verify.** Run `bun test docs/aulas-interativas/qa/cade-todo-mundo-manifestos.test.ts docs/aulas-interativas/qa/cade-todo-mundo-projeto.test.ts`, `bun docs/aulas-interativas/qa/validar-manifestos.ts cade-todo-mundo`, `bunx biome check docs/aulas-interativas/qa/gerar-cade-todo-mundo.ts`, and `git diff --check`. Check that no mandatory preview-start button remains in the Aula 1 script. Commit only the four scoped files locally; do not push or deploy.

## Self-review

The plan covers the three-section structure, contextual UI orientation, optional map placement, unchanged completion rules, generator/JSON consistency and recording handoff. The first 26/09 clarification restores original explanatory depth; the second corrects the preview demonstration for narrow and wide Studio without changing runtime behavior or child-facing controls.
