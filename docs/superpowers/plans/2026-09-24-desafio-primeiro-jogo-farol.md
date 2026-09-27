# A Chave do Farol Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o novo Desafio do Primeiro Jogo, com três dias de construção de A Chave do Farol, introdução e certificado atualizados, experiência da condição e jogo funcional por toque e teclado.

**Architecture:** O Jogo 2D ganha um modo adicional de direcional sem modificar os modos atuais. Um projeto preparado com arte local atravessa os três dias por `chain`; cada dia adiciona uma regra autoral. A experiência da porta integra o catálogo nativo de cenas antes de ser citada pelo manifesto. As aulas seguem o trio editorial v5 e mantêm os vídeos como `plannedVideo`.

**Tech Stack:** Bun, TypeScript, React, Blockly/IR do Estúdio, motor de cenas do core, manifestos v5.

**Spec:** `docs/plans/2026-09-24-desafio-primeiro-jogo-farol-design.md`

## Global Constraints

- Manter `courseSlug: "desafio-primeiro-jogo"`, oferta e regras de acesso existentes; não alterar catálogo, funil ou preço.
- Usar somente a extensão Jogo 2D e blocos básicos de variável e condição; não usar Pinta nem Estúdio completo.
- O projeto deve funcionar por toque com quatro controles visíveis e por teclado; não exibir A/B, pausa ou seleção no modo novo.
- O curso é independente de Cadê Todo Mundo?: explicar o vocabulário necessário no ponto de uso.
- Cada seção comum tem no máximo um vídeo; vídeo e atividade aparecem juntos e ambos são necessários para concluir.
- A única nova experimentação é a condição da porta; suas metas exigem testar sem e com chave, não apenas alternar um controle.
- A introdução tem três momentos; os dias têm vitórias distintas; o certificado conserva emissão e próximos passos dirigidos ao responsável.
- Arte local embutida no projeto, vídeos `plannedVideo`, materiais opcionais e nenhuma publicação automática.
- Preservar todas as alterações já presentes no worktree; selecionar apenas arquivos desta tarefa em eventuais commits.

---

### Task 1: Direcional de quatro botões no Jogo 2D

**Files:**
- Modify: `packages/studio/src/official-extensions/game-2d/blockCatalogClassic.ts`
- Modify: `packages/studio/src/official-extensions/game-2d/classicIR.ts`
- Modify: `packages/studio/src/official-extensions/game-2d/classicCodec.ts`
- Modify: `packages/studio/src/official-extensions/game-2d/runtime/classicPlatformer.ts`
- Modify: `packages/studio/src/official-extensions/game-2d/runtimeContract.ts`
- Modify: `packages/studio/src/official-extensions/game-2d/docs.ts`
- Test: `packages/studio/src/official-extensions/game-2d/__tests__/classicPlatformer.test.ts`

**Interfaces:** Consumes `enableClassicControls(mode)`; produces a new `'directions'` mode accepted by the block dropdown, IR, generated code and runtime. Existing `'auto' | 'always' | 'off'` remain unchanged.

- [ ] **Step 1: Write a failing runtime test.** After `api.enableClassicControls('directions')`, query `[data-sz-g2d-action]`, expect exactly `left`, `up`, `down`, `right`; press `left` with `pointerdown`, expect `api.actionDown('left')` true, release and expect false. Also assert keyboard direction still works and rerunning `enableClassicControls('always')` restores the existing action buttons.

  ```ts
  api.enableClassicControls('directions')
  expect([...document.querySelectorAll('[data-sz-g2d-action]')].map((el) => el.getAttribute('data-sz-g2d-action'))).toEqual(['left', 'up', 'down', 'right'])
  const left = document.querySelector<HTMLButtonElement>('[data-sz-g2d-action="left"]')
  left?.dispatchEvent(new Event('pointerdown'))
  expect(api.actionDown('left')).toBe(true)
  left?.dispatchEvent(new Event('pointerup'))
  expect(api.actionDown('left')).toBe(false)
  ```
- [ ] **Step 2: Run the test and confirm the failure.** Run `bun test packages/studio/src/official-extensions/game-2d/__tests__/classicPlatformer.test.ts`.
- [ ] **Step 3: Add the mode through the full data path.** Add `['só as quatro direções', 'directions']` to the block dropdown, `'directions'` to `classicIR.ts` and `CONTROL_MODES`, and the typed runtime contract. In `enableClassicControls`, accept `'directions'`, render only the existing four accessible directional buttons, and keep the current DOM and behavior for all other modes. Avoid CSS that merely hides active buttons.

  ```ts
  // Contrato do modo, igual em IR, codec e runtimeContract:
  type ControlMode = 'auto' | 'always' | 'off' | 'directions'
  // O ramo 'directions' monta directions e não monta actions.
  ```
- [ ] **Step 4: Verify round-trip and accessibility.** Add a codec test that parses and regenerates `g2d:enableClassicControls` with mode `directions`; check the new option appears in the block catalog. Update the extension documentation. Run the targeted tests, `bun run --cwd packages/studio typecheck` and Biome on touched files.

### Task 2: Experiência nativa “A porta precisa da chave”

**Files:**
- Modify: `packages/core/src/learning/scene/actions.ts`, `state.ts`, `engine.ts`, `catalog.ts`, `cenario.ts`, `cast.ts` (`isSceneAction`, `initialScene`, `cloneScene` and `isSceneState` are in these files)
- Create: `packages/studio/src/arte/farol-assets.ts`
- Modify: `packages/studio/src/arte/index.ts`
- Create: `packages/core/src/learning/scene/lighthouse-key.test.ts`
- Create: `packages/member-shell/src/components/scene-lighthouse-key.tsx`
- Modify: `packages/member-shell/src/components/exploration-stage.tsx`, `scene-lesson-controls.tsx`, `scene-world-stage.tsx`, `scene-figures.tsx`
- Create: `packages/member-shell/tests/scene-lighthouse-key.test.tsx`

**Interfaces:** Produces scene id `'lighthouse-key'`; actions `{ type: 'key-state'; hasKey: boolean }` and `{ type: 'try-lighthouse-door' }`; evidence discoveries `'locked-without-key'` and `'opened-with-key'`. The stage and controls read dedicated lighthouse state, not unrelated `match` fields.

- [ ] **Step 1: Write failing core tests.** Opening the scene has no key, closed door and no discoveries. Testing the door without a key records only `locked-without-key`; switching to a key does not complete the second goal until the door is tested; then `opened-with-key` appears. `reset` restores the start. An invalid action must be ignored.

  ```ts
  const start = { scene: 'lighthouse-key' } as const
  const semChave = stepScene(start, openScene(start), { type: 'try-lighthouse-door' })
  expect(semChave.evidence.discoveries).toContain('locked-without-key')
  const comChave = stepScene(start, semChave, { type: 'key-state', hasKey: true })
  expect(comChave.evidence.discoveries).not.toContain('opened-with-key')
  expect(stepScene(start, comChave, { type: 'try-lighthouse-door' }).evidence.discoveries).toContain('opened-with-key')
  ```
- [ ] **Step 2: Run the core test and confirm the failure.** Run `bun test packages/core/src/learning/scene/lighthouse-key.test.ts`.
- [ ] **Step 3: Add dedicated state and transition.** Register the id, action types, state fields and validation in the existing scene architecture. Implement the two actions with immutable state transition and evidence only after the actual door test. Register the catalog title, concise instruction, progressive hints, two goals and fixed lighthouse world. Create local SVG assets for the same lighthouse, key and protagonist that the game will use. Preserve all existing scene cases.

  ```ts
  interface SceneLighthouseKey {
    hasKey: boolean
    door: 'closed' | 'open'
  }
  // 'key-state' muda hasKey; 'try-lighthouse-door' observa o resultado.
  // Nenhuma descoberta é registrada apenas por trocar hasKey.
  ```
- [ ] **Step 4: Add a focused visual stage and controls.** The stage shows key status, lighthouse and visibly closed/open door. The controls let the person change key status and test the door, with the action next to its instruction; no duplicate instructional line. Keep the scene responsive in the standard expanded and split layouts. Assert rendered labels and both outcomes in a member-shell test.
- [ ] **Step 5: Run tests and typechecks.** Run the new core/member-shell tests, their full package typechecks and the scene inventory test. Update `CATALOGO-CENAS.json` from the final catalog content.

### Task 3: Projeto preparado e regras do jogo

**Files:**
- Create: `docs/aulas-interativas/qa/desafio-farol-projeto.ts`
- Create: `docs/aulas-interativas/qa/desafio-farol-projeto.test.ts`

**Interfaces:** `montarProjetoFarol(etapa: 'dia-1' | 'dia-2' | 'dia-3')` returns a valid local `Project` snapshot. `dia-1` has scene/art infrastructure but no authored movement, pickup or door rule; fallback `dia-2` includes Day 1 rules, and fallback `dia-3` includes Days 1–2 rules.

- [ ] **Step 1: Write a failing project test.** Require embedded SVG assets for scene, protagonist, key, lighthouse off/on and boat, only extension `game-2d`, an initial scene that cannot win by itself, and absence/presence of the three rules by stage. Test the completed IR in the real Jogo 2D harness: touch or keyboard moves, key can be collected once, entering the lighthouse without key does not win, entering with key lights it and triggers the final state.

  ```ts
  const d1 = montarProjetoFarol('dia-1')
  const d2 = montarProjetoFarol('dia-2')
  const d3 = montarProjetoFarol('dia-3')
  expect(d1.installedExtensions.map((item) => item.id)).toEqual(['game-2d'])
  expect(JSON.stringify(d1.ir)).not.toContain('g2d:topDown')
  expect(JSON.stringify(d2.ir)).toContain('g2d:topDown')
  expect(JSON.stringify(d3.ir)).toContain('g2d:onOverlap')
  ```
- [ ] **Step 2: Run the test and confirm the failure.** Run `bun test docs/aulas-interativas/qa/desafio-farol-projeto.test.ts`.
- [ ] **Step 3: Implement art and IR in one source.** Build a 640×360 game with local SVG data URLs from `farol-assets.ts`, usable by `sz_g2d_create_image_sprite`. Use the real `g2d:enableClassicControls`, `g2d:topDown`, `g2d:onOverlap`, state and conditional IR supported by the current Studio. Keep the four control buttons clear of the key and lighthouse. Generate Blockly workspace and project files from the same IR, as `cade-todo-mundo-projeto.ts` does.
- [ ] **Step 4: Run project tests, Studio typecheck and asset sanitizer.** Confirm touch directions affect the player, collision is edge-triggered, the key cannot be collected twice, reset is predictable, and no remote image URL is required.

### Task 4: Três dias, roteiro e manifesto em paridade

**Files:**
- Create: `docs/aulas-interativas/qa/gerar-desafio-farol.ts`
- Create: `docs/aulas-interativas/qa/desafio-farol-manifestos.test.ts`
- Create: `docs/aulas-interativas/aulas/desafio-dia-1.md`, `desafio-dia-1.roteiro.md`, `desafio-dia-1.manifesto.json`
- Create: `docs/aulas-interativas/aulas/desafio-dia-2.md`, `desafio-dia-2.roteiro.md`, `desafio-dia-2.manifesto.json`
- Create: `docs/aulas-interativas/aulas/desafio-dia-3.md`, `desafio-dia-3.roteiro.md`, `desafio-dia-3.manifesto.json`
- Modify: `docs/aulas-interativas/qa/novo-modelo.ts` and `validar-manifestos.ts`

**Interfaces:** Three version-5 manifests under `courseSlug: 'desafio-primeiro-jogo'`, with `lessonSlug: 'dia-1' | 'dia-2' | 'dia-3'`, `chain: 'desafio-primeiro-jogo'`, an initialProject fallback per day, `allowedModes: ['blocks']` and project checks for each authored rule.

- [ ] **Step 1: Write failing structural tests.** Assert three manifests, one video per ordinary section, no required palpite, concept scene only in Day 3 before its Studio section, Zappy bridge and internal instruction not duplicated, video plus activity in every completion, and checks on the actual movement/collect/condition blocks.

  ```ts
  for (const section of manifest.sections) {
    const videos = section.blockKeys.filter((key: string) => manifest.blocks.some((b: { key: string; plannedVideo?: string }) => b.key === key && b.plannedVideo))
    expect(videos.length).toBeLessThanOrEqual(1)
  }
  expect(day3.blocks.some((b: { content?: { activity?: { scene?: string } } }) => b.content?.activity?.scene === 'lighthouse-key')).toBe(true)
  ```
- [ ] **Step 2: Run those tests and confirm the failure.** Run `bun test docs/aulas-interativas/qa/desafio-farol-manifestos.test.ts`.
- [ ] **Step 3: Write each lesson proposal and spoken script.** Day 1 introduces the game and four-direction movement; Day 2 begins from movement and makes touching the key meaningful; Day 3 starts with the locked door, explains a condition with a familiar analogy, lets the person compare states in the experiment, then shows every block in the Studio. Narration starts with concrete context, defines each new term before use, repeats the full palette path, and never uses a nonexistent Play button. Keep production directions outside spoken quotations.
- [ ] **Step 4: Generate the manifests from the authored sequence.** Use `plannedVideo` for every recording; embed the Day 3 `lighthouse-key` scene only after Task 2. Project sections require 90% of their video and a valid project/submission; the concept section requires video and both discoveries. Keep actual Studio block paths and defaults synchronized with `REFERENCIA-BLOCOS-JOGO-2D.json`.
- [ ] **Step 5: Validate paridade.** Compare every section title and video count in proposal, script and manifest. Run generator, targeted tests and `bun docs/aulas-interativas/qa/validar-manifestos.ts desafio-dia`.

### Task 5: Introdução, certificado, módulos e materiais

**Files:**
- Modify: `docs/aulas-interativas/aulas/desafio-introducao.md`, `.roteiro.md`, `.manifesto.json`
- Modify: `docs/aulas-interativas/aulas/desafio-certificado.md`, `.roteiro.md`, `.manifesto.json`
- Modify: `docs/aulas-interativas/modulos-desafio-primeiro-jogo.md`, `README.md`, `BRIEFING.md` only where old directions contradict the approved course
- Create: `docs/aulas-interativas/recursos/desafio-farol/gerar-materiais.py`
- Create: `output/pdf/desafio-farol-caderno.pdf`, `output/pdf/desafio-farol-mapa-responsaveis.pdf`
- Create or extend: manifest and content tests for intro/certificate

**Interfaces:** Existing slugs `boas-vindas` and `certificado` remain. The intro has three sections; certificate has issuance and adult-facing next steps. Materials are optional and referenced in the manifesto with `items: []` until manually attached in admin.

- [ ] **Step 1: Inventory the existing import keys and attached-resource preservation rules.** Record keys that must remain stable for the certificate and material blocks; use `retireBlockKeys` for removed intro blocks, without deleting admin attachments by accident.
- [ ] **Step 2: Redesign intro as three guided sections.** Show the finished farol game and actual page navigation in spoken, on-screen steps; present the caderno and responsible's map; demonstrate how to return or ask for help. Remove all navy/starfield training copy. Teach `Salvo`/`Enviar` at first use on Day 1 rather than as an abstract tour.
- [ ] **Step 3: Update certificate.** Replace five-day navy statements with the three-day lighthouse accomplishment. Preserve the certificate issuance block and adult-directed Community video, external offer link and non-purchase completion rule.
- [ ] **Step 4: Update module metadata and material.** Provide course title, short/detailed descriptions, module names/summaries and linked lessons. Build and visually inspect PDFs; leave downloads optional. Update cross-doc links/old counts only where this course changes them.
- [ ] **Step 5: Validate all five manifests and narrative consistency.** No references to the ship game of Nave Contra Asteroides in the new Desafio, no false claim that the child built prepared infrastructure, no broken material links.

### Task 6: Full review and handoff

**Files:** all files touched by Tasks 1–5.

- [ ] **Step 1: Run fresh verification.** `bun docs/aulas-interativas/qa/validar-manifestos.ts`; targeted course, scene and Jogo 2D tests; `bun run --cwd packages/core test`; `bun run --cwd packages/member-shell test`; `bun run --cwd packages/studio typecheck`; `bun run --cwd packages/core typecheck`; `bun run --cwd packages/member-shell typecheck`; Biome on touched code; `git diff --check`.
- [ ] **Step 2: Review as a child.** On phone/touch and desktop/keyboard, confirm the four buttons are visible and usable, no extras appear, movement is smooth, the key is collected once, the door stays locked without it, reset works and the final lighthouse/boat feedback is legible. Expand and reduce the Studio; confirm no control covers essential content.
- [ ] **Step 3: Review as author/admin.** Compare script against real button and block labels; import each manifest into a disposable draft only if a safe non-production environment is available; verify project continuity, progress gates, material attachment needs and certificate. Do not publish or push/deploy automatically.
- [ ] **Step 4: Report exact evidence and remaining manual work.** Distinguish tests from browser rehearsal, list videos and attachments still needed, and preserve unrelated worktree changes.

## Self-review before execution

- Spec coverage: gameplay, three days, touch/keyboard, one condition scene, intro, certificate, material, manifests, QA and non-publication each have a task above.
- Interface consistency: `'directions'`, `'lighthouse-key'`, `montarProjetoFarol`, `desafio-primeiro-jogo`, `dia-1` through `dia-3` remain the same across tasks.
- Do not treat a structural project check alone as proof of runtime behavior; Task 3 harness and Task 6 browser rehearsal cover the game behavior.
