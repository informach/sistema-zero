# Criar o Dino e mostrar na tela Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar a experiência `world` uma sequência infantil clara: criar o Dino nos bastidores, mostrar na tela e tirá-lo da tela sem apagá-lo.

**Architecture:** O estado persistido permanece compatível internamente com `world.created` e `world.drawn`, mas a interface e todos os textos infantis deixam de expor “ligar/desligar o desenho”. O motor passa a recusar a visibilidade antes da criação; o catálogo, os controles e o palco traduzem o mesmo estado em ações e resultados concretos.

**Tech Stack:** TypeScript, Bun test, React 19, Testing Library, Next.js, Biome.

**Spec:** `docs/plans/2026-09-18-world-criar-mostrar-design.md`

## Global Constraints

- Não alterar a serialização de `SceneState`; `world.drawn` continua interno e significa somente que o personagem está visível na tela.
- A sequência infantil é obrigatória: criar antes de mostrar.
- Usar apenas “criar”, “mostrar/aparecer” e “tirar da tela” nos textos infantis desta cena; não usar “ligar/desligar o desenho”.
- O controle fechado deve continuar visível, focável e associado a uma explicação por `aria-describedby`.
- Preservar alterações não relacionadas já presentes no diretório de trabalho; fazer `git add` somente de arquivos deste lote.
- Depois de qualquer texto de fala alterado, a voz do Zappy desta aula deve ser regenerada no Admin antes da publicação.

---

### Task 1: Proteger a sequência no Core e alinhar a linguagem da cena

**Files:**
- Modify: `packages/core/src/learning/scene/engine.ts:353-379`
- Modify: `packages/core/src/learning/scene/catalog.ts:740-790`
- Modify: `packages/core/src/learning/scene/readout.ts:305-317,927-932`
- Modify: `packages/core/src/learning/scene/questions.ts:589-624`
- Modify: `packages/core/src/learning/scene/tela-e-mundo.test.ts:160-183`
- Modify: `packages/core/src/learning/scene/readout.test.ts:164-180,259-268`
- Modify: `packages/core/src/learning/scene/pedidos-no-motor.test.ts:395-416`

**Interfaces:**
- Consumes: `stepScene(start, previous, action)`, `SceneAction`, `SceneState`, `sceneReadout(scene, state)`.
- Produces: a `world` state machine where `connect/draw` is a no-op until `world.created` is true; readout rows named `bastidores` and `na tela do jogo`.

- [x] **Step 1: Write the failing Core contract tests**

Replace the independent-order test with an explicit guarded-flow test:

```ts
const bloqueado = rodar(start, [desenho(true)])
expect(bloqueado.world).toMatchObject({ created: false, drawn: false })
expect(bloqueado.evidence.discoveries).toEqual([])

const visivel = rodar(start, [{ type: 'create' }, desenho(true)])
expect(visivel.evidence.discoveries).toEqual(['hidden', 'visible'])
expect(faixa('world', visivel)).toEqual({
  bastidores: 'com o Dino',
  'na tela do jogo': 'Dino apareceu',
})

const retirado = rodar(start, [{ type: 'create' }, desenho(true), desenho(false)])
expect(retirado.world).toMatchObject({ created: true, drawn: false })
expect(evaluateExperimentation('world', retirado).passed).toBe(true)
```

Update the readout expectation so its final situation contains `O Dino está nos bastidores` and `ainda não apareceu na tela` rather than a state of a drawing key. Update the request driver to create first, show second and use the new request text.

- [x] **Step 2: Run the focused Core tests and confirm the old behavior fails**

Run:

```powershell
bun test packages/core/src/learning/scene/tela-e-mundo.test.ts packages/core/src/learning/scene/readout.test.ts packages/core/src/learning/scene/pedidos-no-motor.test.ts
```

Expected: FAIL because drawing before creation still mutates `drawn` and old readout/copy remains.

- [x] **Step 3: Implement the guarded Core transition**

In the `draw` branch, return from that branch without assigning `s.world.drawn` when `s.world.created` is false. For a created Dino, retain the existing action kind but record:

```ts
s.world.drawn = action.enabled
observe(
  s,
  s.world.drawn ? 'visible' : 'hidden',
  s.world.drawn
    ? 'O mesmo Dino apareceu na tela do jogo.'
    : 'O Dino continua nos bastidores, fora da tela do jogo.',
)
```

Change the catalog to a guided instruction and requests:

```ts
instruction: 'Primeiro, crie o Dino nos bastidores. Depois, faça o Dino aparecer na tela do jogo.',
manipulates: 'Criar o Dino nos bastidores e mostrar o Dino na tela',
success: 'O mesmo Dino pode existir nos bastidores e aparecer na tela do jogo.',
```

Use the goals `O Dino existe nos bastidores` / `Crie o Dino nos bastidores.` and `O mesmo Dino aparece na tela` / `Mostre o Dino na tela do jogo.`. Make the final script caption state that tirar o Dino da tela does not remove it from the bastidores.

Make the readout values `vazio` or `com o Dino` for `bastidores`, and `ainda não apareceu` or `Dino apareceu` for `na tela do jogo`.

Replace the prediction with a question about where the Dino is after being created in the bastidores and before appearing in the game screen. The correct choice is `Nos bastidores, sem aparecer na tela.` The explanation must state: creating prepares the Dino in the bastidores, and showing is a separate action that makes it appear.

- [x] **Step 4: Run Core tests and typecheck**

Run:

```powershell
bun test packages/core/src/learning/scene/tela-e-mundo.test.ts packages/core/src/learning/scene/readout.test.ts packages/core/src/learning/scene/pedidos-no-motor.test.ts
bun run --filter @sistemazero/core typecheck
```

Expected: PASS.

- [x] **Step 5: Review Task 1 and commit**

Review with:

```powershell
git diff --check -- packages/core/src/learning/scene
git diff -- packages/core/src/learning/scene/engine.ts packages/core/src/learning/scene/catalog.ts packages/core/src/learning/scene/readout.ts packages/core/src/learning/scene/questions.ts
```

Commit only the Core files and their three tests:

```powershell
git add packages/core/src/learning/scene/engine.ts packages/core/src/learning/scene/catalog.ts packages/core/src/learning/scene/readout.ts packages/core/src/learning/scene/questions.ts packages/core/src/learning/scene/tela-e-mundo.test.ts packages/core/src/learning/scene/readout.test.ts packages/core/src/learning/scene/pedidos-no-motor.test.ts
git commit -m "feat(lessons): guiar criação e exibição do Dino"
```

### Task 2: Tornar a bancada e o palco coerentes com as ações da criança

**Files:**
- Modify: `packages/member-shell/src/components/exploration-pieces.tsx:43-78`
- Modify: `packages/member-shell/src/components/scene-world-stage.tsx:75-113,198-210`
- Modify: `packages/member-shell/tests/consertos-onda-a.test.tsx`
- Modify: `packages/community-kids/tests/lesson-scene-experiencia.test.tsx`
- Modify: `packages/community-kids/tests/lesson-experimentation.test.tsx`
- Modify: `packages/community-kids/tests/lesson-scene-compare.test.tsx`
- Modify: `packages/community-kids/tests/lesson-scene-moldura.test.tsx`
- Modify: `packages/community-kids/tests/lesson-scene-servidor-recusou.test.tsx`

**Interfaces:**
- Consumes: `ExplorationPieces` receives `activity`, `state` and `dispatch`; `SceneButton` supports `fechado` and normal button events.
- Produces: two labelled control groups. The show button is closed until `state.world.created`, then toggles `Mostrar o Dino na tela` / `Tirar o Dino da tela`.

- [x] **Step 1: Write the failing interaction tests**

Add or update a component-level contract that asserts:

```ts
expect(screen.getByRole('group', { name: 'Nos bastidores' })).toBeInTheDocument()
const mostrar = screen.getByRole('button', { name: 'Mostrar o Dino na tela' })
expect(mostrar).toHaveAttribute('aria-disabled', 'true')
expect(mostrar).toHaveAttribute('aria-describedby', expect.stringContaining('world'))
expect(screen.getByText('Primeiro, crie o Dino nos bastidores.')).toBeInTheDocument()

await user.click(screen.getByRole('button', { name: /Criar o Dino/i }))
expect(screen.getByRole('button', { name: 'Mostrar o Dino na tela' })).not.toHaveAttribute('aria-disabled', 'true')

await user.click(screen.getByRole('button', { name: 'Mostrar o Dino na tela' }))
expect(screen.getByRole('button', { name: 'Tirar o Dino da tela' })).toBeInTheDocument()
```

Update every Community Kids assertion that queries `Desenhar o Dino na tela`, `ligado`, or `desligado` to assert the child-facing action and state instead.

- [x] **Step 2: Run focused UI tests and confirm the contract fails**

Run:

```powershell
bun test packages/member-shell/tests/consertos-onda-a.test.tsx packages/community-kids/tests/lesson-scene-experiencia.test.tsx packages/community-kids/tests/lesson-experimentation.test.tsx packages/community-kids/tests/lesson-scene-compare.test.tsx packages/community-kids/tests/lesson-scene-moldura.test.tsx packages/community-kids/tests/lesson-scene-servidor-recusou.test.tsx
```

Expected: FAIL because the old controls are a single ungrouped row and the draw key remains active before creation.

- [x] **Step 3: Implement the two-panel interaction**

Render a `role="group"` section named `Nos bastidores` with the create action. Once created, render the same-position closed button as `✓ Dino nos bastidores`.

Render a second `role="group"` section named `Na tela do jogo` with the following behavior:

```tsx
<SceneButton
  fechado={!state.world.created}
  aria-describedby="world-screen-note"
  onClick={() => dispatch({ type: 'connect', port: 'draw', enabled: !state.world.drawn })}
>
  {state.world.drawn ? 'Tirar o Dino da tela' : 'Mostrar o Dino na tela'}
</SceneButton>
<p id="world-screen-note">
  {!state.world.created
    ? 'Primeiro, crie o Dino nos bastidores.'
    : state.world.drawn
      ? 'O Dino apareceu na tela do jogo.'
      : 'Agora você pode mostrar o Dino na tela do jogo.'}
</p>
```

Ensure `fechado` prevents the callback from dispatching before creation. Keep the internal action as `connect/draw`.

Update `WorldStage` descriptions and SVG alternatives from “desenhado” to “na tela”. Remove comments that document the no-longer-supported show-before-create state.

- [x] **Step 4: Run focused UI tests, typechecks and accessibility-focused tests**

Run:

```powershell
bun test packages/member-shell/tests/consertos-onda-a.test.tsx packages/community-kids/tests/lesson-scene-experiencia.test.tsx packages/community-kids/tests/lesson-experimentation.test.tsx packages/community-kids/tests/lesson-scene-compare.test.tsx packages/community-kids/tests/lesson-scene-moldura.test.tsx packages/community-kids/tests/lesson-scene-servidor-recusou.test.tsx
bun run --filter @sistemazero/member-shell typecheck
bun run --filter @sistemazero/community-kids typecheck
```

Expected: PASS.

- [x] **Step 5: Review Task 2 and commit**

Review with:

```powershell
git diff --check -- packages/member-shell/src/components/exploration-pieces.tsx packages/member-shell/src/components/scene-world-stage.tsx packages/community-kids/tests
rg -n "Desenhar o Dino na tela|desenho ligado|desenho desligado" packages/member-shell/src/components/exploration-pieces.tsx packages/member-shell/src/components/scene-world-stage.tsx
```

The search must return no child-facing copy. Commit only the changed controls, stage and related tests:

```powershell
git add packages/member-shell/src/components/exploration-pieces.tsx packages/member-shell/src/components/scene-world-stage.tsx packages/member-shell/tests/consertos-onda-a.test.tsx packages/community-kids/tests/lesson-scene-experiencia.test.tsx packages/community-kids/tests/lesson-experimentation.test.tsx packages/community-kids/tests/lesson-scene-compare.test.tsx packages/community-kids/tests/lesson-scene-moldura.test.tsx packages/community-kids/tests/lesson-scene-servidor-recusou.test.tsx
git commit -m "feat(kids): separar criar e mostrar o Dino"
```

### Task 3: Alinhar autoria, material da aula e validações editoriais

**Files:**
- Modify: `packages/admin/src/components/editor/scene-action-editor.tsx:20-48`
- Modify: `packages/admin/tests/learning-builder.test.tsx`
- Modify: `packages/admin/tests/scene-authoring-rules.test.ts`
- Modify: `docs/aulas-interativas/desafio-primeiro-jogo-v6/dia-1/manifesto.json`
- Modify: `docs/aulas-interativas/desafio-primeiro-jogo-v6/dia-1/roteiro.md`
- Modify: `docs/aulas-interativas/corre-dino-v6/aula-01/manifesto.json`
- Modify: `docs/aulas-interativas/corre-dino-v6/aula-01/roteiro.md`
- Modify: `docs/aulas-interativas/qa/desafio-aulas-00-02.ts`
- Modify: `docs/aulas-interativas/qa/revisao-editorial-aula-01.ts`
- Create: `docs/plans/2026-09-18-world-criar-mostrar-design.md`
- Create: `docs/plans/2026-09-18-world-criar-mostrar-implementation.md`

**Interfaces:**
- Consumes: the `connect/draw` action from the Core catalog and lesson-manifest validation rules.
- Produces: Admin action labels and lesson documents that describe the exact guided experience.

- [x] **Step 1: Write the failing authoring and manifest assertions**

Update existing assertions so the authoring surface must offer labels equivalent to `Mostrar o personagem na tela` and `Tirar o personagem da tela`, while preserving action values `{ type: 'connect', port: 'draw', enabled: true | false }`.

Update the editorial QA expected world instruction, prediction, requests and conclusion. It must require these exact source strings:

```ts
'Primeiro, crie o Dino nos bastidores. Depois, faça o Dino aparecer na tela do jogo.'
'Imagine: o Dino já está nos bastidores, mas ainda não apareceu na tela do jogo. Onde está o Dino?'
'Crie o Dino nos bastidores.'
'Mostre o Dino na tela do jogo.'
```

- [x] **Step 2: Run the authoring and lesson validators and confirm failure**

Run:

```powershell
bun test packages/admin/tests/learning-builder.test.tsx packages/admin/tests/scene-authoring-rules.test.ts packages/core/tests/learning.test.ts packages/core/tests/learning-player-consertos.test.ts
bun test docs/aulas-interativas/qa/desafio-aulas-00-02.ts docs/aulas-interativas/qa/revisao-editorial-aula-01.ts
```

Expected: FAIL because the lesson source and action labels still use the old draw-switch language.

- [x] **Step 3: Implement the editorial alignment**

Special-case only `ScenePort.draw` in the action option labels:

```ts
const labelDaConexao = (port: ScenePort, enabled: boolean) =>
  port === 'draw'
    ? enabled
      ? 'Mostrar o personagem na tela'
      : 'Tirar o personagem da tela'
    : `${enabled ? 'Ligar' : 'Desligar'} ${PORTAS[port]}`
```

Keep the generic `PORTAS.draw` value for contexts that still need a technical author label, but use `labelDaConexao` for `TODAS`.

Update both lesson-one manifest and roteiro sources to the guided sequence, including the initial state, prediction, action names, expected result and teacher guidance. Do not alter unrelated course content or legacy course chapters that use “desenhar” as the name of an actual programming block.

- [x] **Step 4: Run authoring, manifest and full affected test suites**

Run:

```powershell
bun test packages/admin/tests/learning-builder.test.tsx packages/admin/tests/scene-authoring-rules.test.ts packages/core/tests/learning.test.ts packages/core/tests/learning-player-consertos.test.ts
bun test docs/aulas-interativas/qa/desafio-aulas-00-02.ts docs/aulas-interativas/qa/revisao-editorial-aula-01.ts
bun run --filter @sistemazero/admin typecheck
```

Expected: PASS.

- [x] **Step 5: Review Task 3, commit and document voice follow-up**

Review with:

```powershell
git diff --check -- packages/admin docs/aulas-interativas docs/plans
rg -n "Crie o Dino e ligue o desenho|cria o Dino com o desenho desligado|Ligar o desenho faz|Desligar o desenho tira" packages/core packages/member-shell packages/community-kids packages/admin docs/aulas-interativas
```

Classify remaining matches: they may only describe unrelated real programming blocks, never the `world` experience. Commit exact files from this task:

```powershell
git add packages/admin/src/components/editor/scene-action-editor.tsx packages/admin/tests/learning-builder.test.tsx packages/admin/tests/scene-authoring-rules.test.ts docs/aulas-interativas/desafio-primeiro-jogo-v6/dia-1/manifesto.json docs/aulas-interativas/desafio-primeiro-jogo-v6/dia-1/roteiro.md docs/aulas-interativas/corre-dino-v6/aula-01/manifesto.json docs/aulas-interativas/corre-dino-v6/aula-01/roteiro.md docs/aulas-interativas/qa/desafio-aulas-00-02.ts docs/aulas-interativas/qa/revisao-editorial-aula-01.ts docs/plans/2026-09-18-world-criar-mostrar-design.md docs/plans/2026-09-18-world-criar-mostrar-implementation.md
git commit -m "docs(lessons): alinhar criação e exibição do Dino"
```

### Task 4: Full review and staging delivery

**Files:**
- Verify: all files committed by Tasks 1 through 3.

**Interfaces:**
- Consumes: all committed Core, Member Shell, Kids, Admin and lesson-source contracts.
- Produces: verified commits ready for one staging push, followed by the CI-controlled deploy.

- [ ] **Step 1: Run the complete affected local verification**

Run:

```powershell
bun test packages/core/src/learning/scene packages/member-shell/tests/consertos-onda-a.test.tsx packages/community-kids/tests/lesson-scene-experiencia.test.tsx packages/community-kids/tests/lesson-experimentation.test.tsx packages/community-kids/tests/lesson-scene-compare.test.tsx packages/community-kids/tests/lesson-scene-moldura.test.tsx packages/community-kids/tests/lesson-scene-servidor-recusou.test.tsx packages/admin/tests/learning-builder.test.tsx packages/admin/tests/scene-authoring-rules.test.ts
bun run --filter @sistemazero/core typecheck
bun run --filter @sistemazero/member-shell typecheck
bun run --filter @sistemazero/community-kids typecheck
bun run --filter @sistemazero/admin typecheck
bunx biome check packages/core/src/learning/scene packages/member-shell/src/components/exploration-pieces.tsx packages/member-shell/src/components/scene-world-stage.tsx packages/admin/src/components/editor/scene-action-editor.tsx
```

- [ ] **Step 2: Inspect the diff and repository state**

Run:

```powershell
git log --oneline -3
git status --short
git diff staging...HEAD --check
git diff staging...HEAD --stat
```

Confirm that each changed behavior has a test, no unrelated dirty file is staged, and no private technical term leaked into the world experience.

- [ ] **Step 3: Push after the currently running staging workflow finishes**

Run:

```powershell
gh run view 35365726122 --json status,conclusion
git push origin staging
gh run list --branch staging --limit 1
```

Only push when run `35365726122` has completed, so GitHub Actions concurrency does not cancel its deployment.

- [ ] **Step 4: Verify CI and staging deploy**

Run:

```powershell
gh run watch <new-run-id> --exit-status
gh run view <new-run-id> --log | rg -i "deployando no staging|staging atualizado|deployment|SUCCESS|CRASHED|FAILED"
```

Report the precise services selected by the deployment and the final commit SHA. Remind the user to regenerate the Zappy voice for the changed world-scene copy before publishing the lesson.

## Self-review

- Spec coverage: Task 1 covers the guarded state transition, catalog, readout and prediction. Task 2 covers the two groups, closed explanation, action labels and stage alternatives. Task 3 covers the teacher/Admin surfaces and both Lesson 1 source sets. Task 4 covers lint, type, behavior, repository isolation and staging deployment.
- Placeholder scan: no incomplete implementation instructions, generic validation text or undefined interfaces remain.
- Type consistency: `connect/draw` remains a `SceneAction`; `created` and `drawn` remain `SceneState` fields; the UI only changes the child-facing translation.

## Execution handoff

The plan is saved at `docs/plans/2026-09-18-world-criar-mostrar-implementation.md`. The user already chose direct implementation, so execute it inline with `executing-plans`, keeping the review gate and isolated commit at the end of every task.
