# Presets e once-vs-always Implementation Plan

> **Direção atualizada em 22/09/2026:** o desenho original continua válido para os outros quatro
> casos, mas o piloto `duas-caixas-nave` foi substituído pelo contrato de
> `2026-09-22-experiencia-uma-vez-sempre.md`. Ele usa `panel` + `move`, nave já presente, “passo” no
> lugar de “quadro”, somente avanço manual e a interação selecionar ficha → escolher área. As etapas
> históricas abaixo que falam em tipos sem `panel` ou numa grade permanente não regem mais o piloto.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar o contrato de preset por atividade e a cena `once-vs-always` com os cinco casos do redesenho.

**Architecture:** O bloco guarda configuração validada da cena; o core executa e avalia; o member-shell desenha com a moldura atual; o admin oferece os casos prontos. O gesto de voltar usa `reset`.

**Tech Stack:** TypeScript, Bun, React, Vitest/Bun test, Biome.

**Spec:** `docs/plans/2026-09-19-cenas-presets-design.md` e `CENAS-NOVAS.md`, seção `once-vs-always`, na pasta externa `redesenho-didatico-aulas/cenas`.

## Global Constraints

- Os IDs de meta atuais não mudam: manifestos e sessões salvas os referenciam.
- A meta com um mesmo ID prova a mesma relação em todos os presets.
- Os cinco presets cobrem os usos de Desafio Dia 1, Dia 2 e Dia 4, e Corre Dino Aula 2 e Aula 4.
- O reset restaura o caso inicial e preserva descobertas anteriores.
- O core não importa React nem outros pacotes do monorepo.
- Palco e bancada usam os tokens e componentes atuais do member-shell.
- Manifestos e roteiros v6 não mudam neste plano.

---

### Task 1: Contrato validado de preset

**Files:**
- Create: `packages/core/src/learning/scene/presets.ts`
- Modify: `packages/core/src/learning/scene/actions.ts`, `index.ts`, `start.ts`, `evaluate.ts`
- Test: `packages/core/src/learning/scene/presets.test.ts`

**Interfaces:**
- Produces: `OnceVsAlwaysPreset`, `isOnceVsAlwaysPreset`, `ONCE_VS_ALWAYS_PRESETS`, `SceneSetup.preset`, `SceneSetup.goalCopy`.
- The five keys are `duas-caixas-nave`, `tres-caixas-tiro`, `uma-ficha-vidas`, `duas-caixas-dino`, `tres-caixas-som`.

- [ ] **Step 1:** Write a test that accepts the five presets only for `once-vs-always`, rejects unknown cards/areas and unknown goal-copy IDs, and preserves a current `coordinates` activity without a preset.
- [ ] **Step 2:** Run `bun test packages/core/src/learning/scene/presets.test.ts`; confirm the new contract is absent.
- [ ] **Step 3:** Implement a discriminated, bounded preset schema. Each card has a stable mechanical kind (`paint`, `create`, `move`, `event`, `lives`) and an authored label. Keep `label`/`pedido` overrides keyed by a known goal ID. Extend `isSceneSetup` to reject presets on other scenes and to reject a case with neither actions, goals nor preset.
- [ ] **Step 4:** Pass the overrides through `sceneGoals` to the player without changing evidence IDs. Run the focused test and `bun run --filter @sistemazero/core typecheck`.
- [ ] **Step 5:** Commit only files from this task with `feat(scenes): validate per-lesson presets`.

### Task 2: Motor determinístico e metas da once-vs-always

**Files:**
- Modify: `packages/core/src/learning/scene/actions.ts`, `state.ts`, `engine.ts`, `catalog.ts`, `pistas.ts`, `questions.ts`, `readout.ts`, `cast.ts`, `session.ts`
- Test: `packages/core/src/learning/scene/once-vs-always.test.ts`

**Interfaces:**
- Consumes: `SceneSetup.preset`, `SceneSetup.goalCopy` from Task 1.
- Produces: actions `place-in-area` and `trigger`, state for placements, frame count, per-card fire counts, visible effects and scheduled hits, goals `once`, `always`, `both`, `on-event`, `key-fires`, `flood`.

- [ ] **Step 1:** Write five paths from `openScene` through the exact gestures in `CENAS-NOVAS.md`: three-frame start/loop, five-frame combined, event waiting, key trigger, flood and the two scheduled collisions of the lives case. Assert no target goal is present at opening.
- [ ] **Step 2:** Run the focused test and confirm the new action/model is rejected before implementation.
- [ ] **Step 3:** Add the scene ID and action validators. Add one state group to `SceneState`, its initial value, field validation, hydration and deep clone. Execute the frame logic at the existing `advance` boundary; a card only fires in `Ao iniciar` on the first frame, in the loop every frame, and in the event area on `trigger`.
- [ ] **Step 4:** Count each card firing visibly in state. Schedule impacts by frame number for the lives case so repeated runs are identical. Record goal evidence only after the child has seen the required number of frames or impacts.
- [ ] **Step 5:** Register model copy, hints, prediction/checkpoint, readout and role requirements. Reuse the global `reset` action and test that it restores the preset while keeping earned discoveries.
- [ ] **Step 6:** Run focused tests, `clock.test.ts`, `setup.test.ts` and core typecheck; commit only task files with `feat(scenes): add once versus always engine`.

### Task 3: Palco e bancada no visual atual

**Files:**
- Create: `packages/member-shell/src/components/scene-once-vs-always.tsx`
- Modify: `packages/member-shell/src/components/exploration-stage.tsx`, `scene-lesson-controls.tsx`, `scene-activity.tsx`
- Test: `packages/member-shell/tests/scene-once-vs-always.test.tsx`

**Interfaces:**
- Consumes: preset and state from Tasks 1–2; dispatches `place-in-area`, `trigger`, `advance` and `reset`.

- [ ] **Step 1:** Render two and three areas from their presets and assert all card labels and counters appear. Assert that the trigger button exists only in three-area cases.
- [ ] **Step 2:** Run the focused UI test and confirm that the stage is missing.
- [ ] **Step 3:** Build the stage inside the existing `SceneCanvas`/console components. Make cards draggable onto areas, with a labeled select control that sends the same action for keyboard and screen-reader use. Show frame count and per-card fire count together with the game effect. Name the existing reset control “Voltar ao começo” for this scene.
- [ ] **Step 4:** Exercise a complete two-area case in the UI test and run member-shell typecheck and focused tests; commit only task files with `feat(scenes): draw once versus always lab`.

### Task 4: Autoria e transporte do contrato

**Files:**
- Modify: `packages/admin/src/components/editor/scene-setup-editor.tsx`, `packages/admin/src/lib/scene-authoring-rules.ts`, `packages/members/src/interfaces/http/learning.dtos.ts`
- Test: `packages/admin/tests/scene-authoring.test.tsx`, `packages/members/tests/integration/legacy-section-grading.test.ts`

**Interfaces:**
- Consumes: `ONCE_VS_ALWAYS_PRESETS` and the validator from Task 1.
- Produces: selectable cases in the admin, durable activity JSON on the server.

- [ ] **Step 1:** Write an admin interaction that chooses `tres-caixas-tiro`, saves its configured cards and goals, and rejects an unknown card ID. Add a server contract test that accepts the valid block and rejects malformed preset data.
- [ ] **Step 2:** Run the focused tests and confirm the case cannot yet be authored/transported.
- [ ] **Step 3:** Add a select for the five prepared cases and editing controls for permitted labels. Ensure `trocarCena` removes an incompatible preset with an explicit warning. Extend the DTO from the core validator/limits so the server and browser agree.
- [ ] **Step 4:** Run focused tests plus admin, members and core typechecks; commit only task files with `feat(scenes): author and persist scene presets`.

### Task 5: Integrated verification

**Files:**
- Test: `packages/core/src/learning/scene/once-vs-always.test.ts`, `packages/member-shell/tests/scene-once-vs-always.test.tsx`

**Interfaces:**
- Consumes: the completed feature; produces verification evidence.

- [ ] **Step 1:** Replay each of the five cases through the session functions used by the server. Assert the required goals, reset behavior and round-trip serialization.
- [ ] **Step 2:** Verify the scene at mobile and desktop widths, keyboard placement, and palette contrast. Record any concrete visual defect and correct it.
- [ ] **Step 3:** Run focused tests, package typechecks and Biome on changed files. Inspect `git diff` and commit only the integrated corrections with `test(scenes): verify preset journeys`.
