# Cadê Todo Mundo? Playable Opening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put a playable, accessible finished Jogo 2D game beside the opening video and require all three discoveries plus video watch to complete section one.

**Architecture:** Introduce an interactive `project-play` activity backed by a self-contained Studio project and a fixed set of targets. A sandboxed `StudioProjectPlayer` reports real group clicks and receives accessible-button pointer commands through the preview bridge. Existing lesson persistence and split layout carry the activity.

**Tech Stack:** TypeScript, React, Bun tests, Jogo 2D runtime, manifest v5.

**Spec:** `docs/plans/2026-09-26-cade-todo-mundo-jogo-abertura-design.md`

## Global Constraints

- The child edits only the existing starter project; the opening receives a separate completed snapshot.
- Do not introduce CSS, Canvas or HTML blocks into the allowed Studio palette.
- Keep exactly one video in the first section and preserve the video-watch requirement.
- Completion requires three unique actual in-game group-click targets; repeated clicks do not count.
- Game remains operable by touch, mouse and keyboard; narrow screens stack video then game.
- Do not push or deploy.

---

### Task 1: Real game and preview interaction bridge

**Files:** `docs/aulas-interativas/qa/cade-todo-mundo-projeto.ts`, `packages/studio/src/official-extensions/game-2d/runtime/textSprites.ts`, `packages/studio/src/preview/inputBridge.ts`, related tests.

**Interfaces:** Produce `montarProjetoCadeTodoMundoCompleto(): Project`; preview messages `sz:g2d:group-click` carrying hit coordinates and `sz:pointer-at` carrying logical stage coordinates.

- [x] **Step 1: Write failing tests** for three unique reveals, restart-safe count and bridge messages from a true group hit.
- [x] **Step 2: Run targeted Bun tests and confirm failure.**
- [x] **Step 3: Implement complete demo IR and preview message path.** The runtime emits only after a picked sprite invokes the group handler; pointer-at dispatches to the same pointer pipeline as physical contact.
- [x] **Step 4: Run targeted tests and studio typecheck.**

### Task 2: Activity contract and progression

**Files:** `packages/core/src/learning/index.ts`, `packages/core/src/learning/section-progression.ts`, related tests.

**Interfaces:** `ProjectPlayActivity` with `type: 'project-play'`, `project`, `targets`; `answers.foundTargets` as unique target IDs. `evaluateLearning` passes when the declared target set is complete. Public projection carries the project and targets. Section validator recognizes this observable activity.

- [x] **Step 1: Write tests** for invalid project/target data, zero/two/three targets, duplicate answer IDs, public projection and section validation.
- [x] **Step 2: Run tests and confirm failure.**
- [x] **Step 3: Implement schema/projection/evaluation/progression with bounded data.**
- [x] **Step 4: Run core tests and typecheck.**

### Task 3: Child player and responsive layout

**Files:** new `packages/member-shell/src/components/project-play-activity.tsx`; modify `learning-activity.tsx`, `lesson-split.ts`; related tests.

**Interfaces:** Component accepts current answers and `onChange`, renders `StudioProjectPlayer` with a stable iframe ref, verifies message source and target membership, renders three 44px target buttons and expand/return control.

- [x] **Step 1: Write tests** for split side assignment, message validation, unique progress and accessible controls.
- [x] **Step 2: Run tests and confirm failure.**
- [x] **Step 3: Implement player, persistence integration and layout.**
- [x] **Step 4: Run member-shell tests/typecheck and inspect small/wide layout in code.** Browser-based visual inspection remains pending because Chromium could not launch in this environment.

### Task 4: Opening content and review

**Files:** `docs/aulas-interativas/qa/gerar-cade-todo-mundo.ts`, Aula 1 manifesto and roteiro, manifest QA tests.

**Interfaces:** Section `apresentacao` contains `video-a1-abertura` and required project-play block; completed demo snapshot is separate from `projeto` starter block.

- [x] **Step 1: Add manifest tests** for two required blocks, one video, project separation and source fidelity.
- [x] **Step 2: Run tests and confirm failure.**
- [x] **Step 3: Update generator, regenerate only the intended manifesto and rewrite opening narration naturally.**
- [x] **Step 4: Verify manifest import/QA tests, diff, typechecks and full focused review. Commit local changes only.**
