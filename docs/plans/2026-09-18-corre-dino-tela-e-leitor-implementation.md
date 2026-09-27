# Corre Dino: tela e leitor de tela Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar a descoberta do limite da tela concreta e separar a Aula 1 do Corre Dino da experiência de leitor de tela, preservando essa experiência genérica para cursos posteriores.

**Architecture:** A cena compartilhada `stage-size` continua usando o estado e as metas existentes do core; somente sua apresentação e o rótulo do controle mudam. A receita editorial da Aula 1 passa a produzir duas seções distintas para a tela, sem cenário na experiência e sem conteúdo de leitor de tela, e os três artefatos de autoria passam a refletir a receita revisada.

**Tech Stack:** TypeScript, React, Vitest, SVG, manifestos de aprendizagem JSON e geradores Bun.

**Spec:** `docs/plans/2026-09-18-corre-dino-tela-e-leitor-design.md`

## Global Constraints

- Não alterar o motor, a cena nem os testes próprios de `screen-reader`; só remover usos curriculares do Corre Dino Aula 1.
- Não manter compatibilidade de conteúdo legado: a próxima importação substitui o roteiro ainda em autoria.
- O botão deve dizer a próxima ação: `Ligue a borda` quando escondida e `Desligue a borda` quando visível.
- A cena `stage-size` não pode declarar `cenario: "corre-dino"`, nem desenhar Dino, cenário ou outro conteúdo do jogo.
- A área externa representa a página e fica fixa; apenas a tela interna muda de largura e altura.
- Fazer uma revisão após cada commit e uma revisão completa antes da entrega.

---

## File structure

- `packages/member-shell/src/components/scene-stages.tsx` — desenha o SVG da experiência `stage-size`; passará a ter somente a página azul e o viewport interno delimitado pela borda.
- `packages/member-shell/src/components/scene-lesson-controls.tsx` — escolhe o texto e o estado acessível do botão da borda.
- `packages/community-kids/tests/lesson-scene-design.test.tsx` — verifica o ciclo visual, as medidas e a ausência de conteúdo de cenário na cena.
- `packages/community-kids/tests/lesson-scene-experiencia.test.tsx` — verifica que a pista avança depois do novo comando de ligar a borda.
- `docs/aulas-interativas/qa/revisao-editorial-aula-01.ts` — fonte determinística do manifesto e da montagem da Aula 1.
- `docs/aulas-interativas/qa/revisao-editorial-aula-01-texto.ts` — fonte determinística do roteiro em Markdown da Aula 1.
- `docs/aulas-interativas/qa/validar-revisao-aula-01.ts` — prova a estrutura curricular e os critérios do Estúdio após a remoção.
- `docs/aulas-interativas/corre-dino-v6/aula-01/{manifesto.json,montagem.json,roteiro.md,configuracao-estudio.json}` — candidatos de autoria que serão importados no Admin.
- `docs/aulas-interativas/corre-dino-v6/{README.md,blocos-por-aula.json}` — inventário do curso e permissões da Aula 1, sem o bloco que deixou de ser ensinado.

### Task 1: Tornar o limite da tela visível somente pela borda

**Files:**
- Modify: `packages/member-shell/src/components/scene-lesson-controls.tsx:135-196`
- Modify: `packages/member-shell/src/components/scene-stages.tsx:StageSizeStage`
- Modify: `packages/community-kids/tests/lesson-scene-design.test.tsx:629-689,1096-1101`
- Modify: `packages/community-kids/tests/lesson-scene-experiencia.test.tsx:118-132`

**Interfaces:**
- Consumes: `SceneState['stage']` with `{ width, height, border }` and the existing `border` action.
- Produces: a command button whose accessible name is `Ligue a borda` or `Desligue a borda`; an SVG with `data-pagina-da-experiencia` and, when the border is visible, `data-borda` for the resizable inner game viewport.

- [ ] **Step 1: Write the failing UI tests**

Replace assertions for `A borda da tela: escondida` with assertions for the explicit command and assert the state transition:

```ts
expect(screen.getByRole('button', { name: 'Ligue a borda' })).toHaveAttribute('aria-pressed', 'false')
fireEvent.click(screen.getByRole('button', { name: 'Ligue a borda' }))
expect(await screen.findByRole('button', { name: 'Desligue a borda' })).toHaveAttribute(
  'aria-pressed',
  'true',
)
```

Add the visual boundary assertions:

```ts
expect(document.querySelector('[data-pagina-da-experiencia]')).toBeTruthy()
expect(document.querySelector('[data-cenario-stage-size]')).toBeNull()
expect(document.querySelector('[data-figura-stage-size]')).toBeNull()
```

- [ ] **Step 2: Run the focused tests to verify the old interface fails**

Run: `bun --cwd packages/community-kids test tests/lesson-scene-design.test.tsx tests/lesson-scene-experiencia.test.tsx`

Expected: FAIL because the button still exposes its old state sentence and `stage-size` still renders the Dino/scenery.

- [ ] **Step 3: Implement the smallest presentation change**

In `LessonSceneControls`, retain the same dispatch and `aria-pressed`, but replace the child text with:

```tsx
{state.stage.border ? 'Desligue a borda' : 'Ligue a borda'}
```

In `StageSizeStage`, remove `cast`, `sceneCenario`, `actorFigure`, `caixaDe`, `FundoDoCenario` and `ActorFigure` from this stage. Render one fixed light-blue page rectangle and a second light-blue inner viewport computed from `moldura(width, height)`. Keep `data-borda`, dimensions and target corners conditional on `border`; apply an SVG `clipPath` to the inner viewport even though it contains no decorative game content yet. The page rectangle must use `data-pagina-da-experiencia`; no fixed outer visual may change when width or height changes.

- [ ] **Step 4: Run the focused tests and formatting**

Run:

```powershell
bun --cwd packages/community-kids test tests/lesson-scene-design.test.tsx tests/lesson-scene-experiencia.test.tsx
bunx biome check --write packages/member-shell/src/components/scene-stages.tsx packages/member-shell/src/components/scene-lesson-controls.tsx packages/community-kids/tests/lesson-scene-design.test.tsx packages/community-kids/tests/lesson-scene-experiencia.test.tsx
```

Expected: PASS; button labels, discovery progression, accessibility state and fixed outer page are covered.

- [ ] **Step 5: Review and commit only the scene batch**

Review `git diff --check`, inspect the focused diff and make sure no generic `screen-reader` file changed. Commit exactly these four files:

```powershell
git add packages/member-shell/src/components/scene-stages.tsx packages/member-shell/src/components/scene-lesson-controls.tsx packages/community-kids/tests/lesson-scene-design.test.tsx packages/community-kids/tests/lesson-scene-experiencia.test.tsx
git commit -m "feat(lessons): esclarecer o limite da tela"
```

### Task 2: Reestruturar a receita da Aula 1 sem o leitor de tela

**Files:**
- Modify: `docs/aulas-interativas/qa/revisao-editorial-aula-01.ts:11-430`
- Modify: `docs/aulas-interativas/qa/revisao-editorial-aula-01-texto.ts:12-84`
- Modify: `docs/aulas-interativas/qa/validar-revisao-aula-01.ts:25-157`

**Interfaces:**
- Consumes: `reviseLessonOne(source: LearningManifest): LearningManifest` and `lessonOneCuts`.
- Produces: source data with `tela-experiencia-v8` containing only `orientacao-experiencia-tela-v8` and `experiencia-tela`, followed by `tela-criar-v8` containing only `video-tela-v7`, `orientacao-tela-v7` and workspace `projeto`.

- [ ] **Step 1: Write the failing recipe/QA assertions**

Change the expected intent sequence to omit the two description sections and add an assertion that makes the teaching boundary explicit:

```ts
const limite = sections.find((section) => section.id === 'tela-experiencia-v8')
const montagem = sections.find((section) => section.id === 'tela-criar-v8')
assert.deepEqual(
  [limite?.blockIds, limite?.workspaceBlockId, montagem?.blockIds, montagem?.workspaceBlockId],
  [
    ['orientacao-experiencia-tela-v8', 'experiencia-tela'],
    null,
    ['video-tela-v7', 'orientacao-tela-v7'],
    'projeto',
  ],
)
assert.equal(candidate.blocks.some((block) => block.key === 'experiencia-leitor-de-tela'), false)
assert.equal(candidate.blocks.some((block) => block.key === 'video-descricao-demo-v7'), false)
```

Use ordinary `assert.deepEqual` values rather than Jest matchers in the Bun QA file.

- [ ] **Step 2: Run the Aula 1 QA to verify it fails**

Run: `bun docs/aulas-interativas/qa/validar-revisao-aula-01.ts`

Expected: FAIL until the recipe and the generated candidate agree on the new sections and missing description requirement.

- [ ] **Step 3: Update the source recipe, not just its generated output**

In `revisao-editorial-aula-01.ts`:

1. Remove `video-descricao-demo-v7` and `video-descricao-criar-v7` from `lessonOneCuts`.
2. Remove the `screen-reader` entry from `lessonOneScenes` and create the short dialogue:

```ts
dialogue(
  'orientacao-experiencia-tela-v8',
  'Antes de montar no seu jogo, descubra onde a tela do jogo termina. A borda é o que mostra esse limite.',
)
```

3. Create `tela-experiencia-v8` with only the dialogue and `experiencia-tela`, `workspaceKey: null`, and the interactive block as its completion.
4. Create `tela-criar-v8` with `video-tela-v7` and `orientacao-tela-v7`, `workspaceKey: 'projeto'`, and only the stage/border project checks.
5. Delete the description check, its orientation dialogue and all description references from delivery. Ensure `dino-v7` and `entrega-v7` evaluate from `[stage, border, dino]`.
6. Pass no scenario to `blocoDaCena` for `experiencia-tela`; leave the course scenario in the coordinate and world scenes.
7. Preserve the generic scene model and `screen-reader` tests outside the curriculum.

In `revisao-editorial-aula-01-texto.ts`, update the opening, decision bullets and final production checklist so the output says only tela, borda and Dino, without description or reader-screen recording. Its iteration will regenerate headings from the new sections.

- [ ] **Step 4: Regenerate the candidate artifacts from the corrected recipe**

Generate the five candidate artifacts from the same recipe, including the new Studio configuration. Use the course-originals directory selected by the repository's content workflow when it is available. When it is not available locally, patch the checked-in candidate only to the exact values asserted by `validar-revisao-aula-01.ts`, then run that QA and `validar-manifestos-v6.ts`; the source recipe remains the authority and must be updated in the same commit.

- [ ] **Step 5: Run focused authoring verification**

Run:

```powershell
bun docs/aulas-interativas/qa/validar-revisao-aula-01.ts
bun docs/aulas-interativas/qa/validar-manifestos-v6.ts
bunx biome check --write docs/aulas-interativas/qa/revisao-editorial-aula-01.ts docs/aulas-interativas/qa/revisao-editorial-aula-01-texto.ts docs/aulas-interativas/qa/validar-revisao-aula-01.ts
```

Expected: PASS; the manifest validates, the generic reader remains legal elsewhere, and the Aula 1 recipe no longer generates reader material.

- [ ] **Step 6: Review and commit the recipe/candidate batch**

Review that `manifesto.json`, `montagem.json` and `roteiro.md` match their generator inputs, and that the new `retireBlockKeys` contains every current reader block removed by this import. Commit only the recipe, test and Aula 1 generated artifacts:

```powershell
git add docs/aulas-interativas/qa/revisao-editorial-aula-01.ts docs/aulas-interativas/qa/revisao-editorial-aula-01-texto.ts docs/aulas-interativas/qa/validar-revisao-aula-01.ts docs/aulas-interativas/corre-dino-v6/aula-01/manifesto.json docs/aulas-interativas/corre-dino-v6/aula-01/montagem.json docs/aulas-interativas/corre-dino-v6/aula-01/roteiro.md
git commit -m "feat(corre-dino): focar a primeira aula na tela"
```

### Task 3: Retirar a concessão da Aula 1 e fechar a revisão curricular

**Files:**
- Modify: `docs/aulas-interativas/corre-dino-v6/aula-01/configuracao-estudio.json:8-15`
- Modify: `docs/aulas-interativas/corre-dino-v6/blocos-por-aula.json:aula-01`
- Modify: `docs/aulas-interativas/corre-dino-v6/README.md:15-28`

**Interfaces:**
- Consumes: the final stage/border/dino requirements from the source recipe.
- Produces: an Aula 1 Studio allow-list of `sz_frame_start`, `sz_g2d_create_dino`, `sz_g2d_setup_stage`, `sz_g2d_stage_border` and `sz_val_number`; later-course catalog entries for the generic description block remain untouched.

- [ ] **Step 1: Write the failing content assertions**

Extend `validar-revisao-aula-01.ts` to read the Studio configuration and assert:

```ts
assert.equal(config.allowBlocks.includes('sz_g2d_set_stage_description'), false)
assert.deepEqual(results('dino-v7', project([stage, border, dino])), [true])
assert.deepEqual(results('entrega-v7', project([stage, border, dino])), [true, true, true, true])
```

- [ ] **Step 2: Run focused QA to verify the old allow-list fails**

Run: `bun docs/aulas-interativas/qa/validar-revisao-aula-01.ts`

Expected: FAIL because the configuration still exposes the reader-description block and the delivery check still expects it.

- [ ] **Step 3: Apply the curricular cleanup**

Remove `sz_g2d_set_stage_description` only from the Aula 1 `allowBlocks` array and Aula 1 inventory entry. Update the course README row for Aula 1 to read `stage-size` and `coordinates`/`world` only, with completion `Ao iniciar, tela 480 × 270, borda, Dino x 110/y 150/tamanho 64`. Do not remove generic catalog references or the generic `screen-reader` implementation.

- [ ] **Step 4: Run the complete relevant validation set**

Run:

```powershell
bun docs/aulas-interativas/qa/validar-revisao-aula-01.ts
bun docs/aulas-interativas/qa/validar-manifestos-v6.ts
bun --cwd packages/core test src/learning/scene/lesson-one.test.ts src/learning/scene/tela-e-mundo.test.ts
bun --cwd packages/community-kids test tests/lesson-scene-design.test.tsx tests/lesson-scene-experiencia.test.tsx
bunx biome check --write docs/aulas-interativas/corre-dino-v6/aula-01/configuracao-estudio.json docs/aulas-interativas/corre-dino-v6/blocos-por-aula.json docs/aulas-interativas/corre-dino-v6/README.md
```

Expected: PASS; stage-size and generic screen-reader retain their independent core coverage while Corre Dino Aula 1 no longer mentions reader content.

- [ ] **Step 5: Full review and commit the curriculum inventory batch**

Run `git diff --check`; search the Aula 1 candidate and recipe for `screen-reader`, `leitor de tela`, `descricao-v7` and `sz_g2d_set_stage_description`, expecting no matches. Confirm no unrelated dirty files are staged. Commit exactly the three course inventory files and the QA test:

```powershell
git add docs/aulas-interativas/qa/validar-revisao-aula-01.ts docs/aulas-interativas/corre-dino-v6/aula-01/configuracao-estudio.json docs/aulas-interativas/corre-dino-v6/blocos-por-aula.json docs/aulas-interativas/corre-dino-v6/README.md
git commit -m "docs(corre-dino): retirar leitor de tela da aula inicial"
```

## Final review

- [ ] Inspect each commit with `git show --check --stat` and confirm no current work from other sessions is included.
- [ ] Run `git diff staging --check` and inspect the staged-branch diff for the expected files only.
- [ ] Re-run Task 3 verification commands from a clean test process.
- [ ] Confirm the generic `ScreenReaderStage` remains exported and `packages/core/src/learning/scene/lesson-one.test.ts` still tests it.
- [ ] Confirm the documented import follow-up: import the revised Aula 1 into the draft, republish it, then regenerate its Zappy voices.
