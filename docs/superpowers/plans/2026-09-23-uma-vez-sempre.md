# Uma vez e sempre Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the pilot prove `Ao iniciar` and `Enquanto estiver rodando` through two visible trials of the same movement card.

**Architecture:** The engine already preserves discovered evidence across `reset`. Reconfigure only the pilot preset so `move` proves both `once` and `always`, then declare those two targets in the Day 1 manifest. The stage removes the fake ignition state and exposes the movement count in its HUD; the manifest and recording notes describe the two-trial comparison.

**Tech Stack:** TypeScript, Bun tests, React server rendering, Biome, JSON lesson manifests.

**Spec:** `docs/plans/2026-09-23-uma-vez-sempre-design.md`

## Global Constraints

- The pilot offers only `Mover a nave um pouquinho`; it does not offer `Ligar a nave`.
- The ship always renders with its flame. Keep legacy `panel` state readable so saved snapshots remain valid.
- The pilot requires `once` then `always`; it does not require `both`.
- A discovery requires observable execution: three manual steps for each trial.
- `reset` clears the current trial but retains evidence from the first trial.
- The HUD confirms the number of movements; the ship position remains the primary evidence.
- The Day 1 section keeps one conceptual video, one concise Zappy bridge, no prediction, and no final question.
- Do not change the behavior of the Dino, event, sound, or lives presets.

---

### Task 1: Reconfigure the pilot evidence in the scene engine

**Files:**
- Modify: `packages/core/src/learning/scene/presets.ts:118-177`
- Modify: `packages/core/src/learning/scene/once-vs-always.test.ts:43-71`
- Modify: `packages/core/CLAUDE.md:383-386`

**Interfaces:**
- Consumes: `OnceGoalCards` and `ONCE_GOALS_BY_PRESET`.
- Produces: `duas-caixas-nave` with one `move` card; `onceGoalCards(preset).once` and `.always` both resolve to `move`; the default target list is `['once', 'always']`.

- [ ] **Step 1: Write the failing pilot regression test**

Replace the current pilot test with this path:

```ts
const c = lab('duas-caixas-nave', ['once', 'always'])
expect(ONCE_VS_ALWAYS_PRESETS['duas-caixas-nave'].cards).toEqual([
  { id: 'move', kind: 'move', label: 'Mover a nave um pouquinho' },
])
c.place('move', 'start')
c.frames(3)
expect(c.get().once.heroX).toBe(56)
expect(c.get().once.fires.move).toBe(1)
expect(c.get().evidence.discoveries).toContain('once')
c.reset()
expect(c.get().once.heroX).toBe(44)
expect(c.get().evidence.discoveries).toContain('once')
c.place('move', 'loop')
c.frames(3)
expect(c.get().once.heroX).toBe(80)
expect(c.get().once.fires.move).toBe(3)
expect(c.get().evidence.discoveries).toEqual(expect.arrayContaining(['once', 'always']))
expect(evaluateExperimentation('once-vs-always', c.get(), true, undefined, c.targets).passed).toBe(true)
```

- [ ] **Step 2: Run the focused test and verify the old configuration fails**

Run: `bun test src/learning/scene/once-vs-always.test.ts`

Expected: FAIL because the old pilot still contains `panel`, still requires `both`, and does not prove `once` with `move`.

- [ ] **Step 3: Make the smallest preset change**

In `ONCE_VS_ALWAYS_PRESETS['duas-caixas-nave']`, use only:

```ts
cards: [{ id: 'move', kind: 'move', label: 'Mover a nave um pouquinho' }]
```

Set its goals to:

```ts
'duas-caixas-nave': { once: 'move', always: 'move' }
```

and its default targets to:

```ts
'duas-caixas-nave': ['once', 'always']
```

Do not delete `panel` from `OnceCardId`, `CardNumbers`, `CardPlaces`, validation, or `fire`; stored snapshots may still contain it.

- [ ] **Step 4: Update the scene rule documentation**

Replace the pilot note in `packages/core/CLAUDE.md` with one sentence stating that the pilot has one `move` card, tests it in `Ao iniciar`, resets, then tests the same card in `Enquanto estiver rodando`; its two targets prove the comparison.

- [ ] **Step 5: Run the focused core regression test**

Run: `bun test src/learning/scene/once-vs-always.test.ts`

Expected: PASS, including the unchanged Dino, event, sound, lives, and snapshot-validation cases.

- [ ] **Step 6: Commit the core behavior**

```bash
git add packages/core/src/learning/scene/presets.ts packages/core/src/learning/scene/once-vs-always.test.ts packages/core/CLAUDE.md
git commit -m "feat(learning): comparar o mesmo movimento nas duas areas"
```

### Task 2: Show a permanently lit ship and a movement HUD

**Files:**
- Modify: `packages/member-shell/src/components/scene-once-vs-always.tsx:44-90`
- Modify: `packages/member-shell/tests/scene-once-vs-always.test.tsx:25-73`
- Modify: `packages/member-shell/CLAUDE.md:1844-1849`

**Interfaces:**
- Consumes: `state.once.frames`, `state.once.fires.move`, `ActorFigure`.
- Produces: a ship that receives no `desligada` variant in this stage, no “Nave ligada” text, and a `Movimentos: N` HUD when the preset has the `move` card.

- [ ] **Step 1: Write the failing rendering expectations**

In the pilot stage test, assert the opening markup contains the flame and the HUD, then advance with `move` in `Ao iniciar` and assert no ignition text appears:

```ts
expect(html).toContain('#ffb13b')
expect(html).toContain('Movimentos: 0')
expect(html).not.toContain('Nave ligada')
state = stepScene(start, state, { type: 'place-in-area', card: 'move', area: 'start' })
state = stepScene(start, state, { type: 'advance', seconds: 0.25 })
html = renderToStaticMarkup(<OnceVsAlwaysStage state={state} cast={cast} preset={preset} />)
expect(html).toContain('Movimentos: 1')
expect(html).not.toContain('Nave ligada')
```

Update the controls test to assert `Ligar a nave` is absent and `Mover a nave um pouquinho` appears once.

- [ ] **Step 2: Run the focused stage test and verify it fails**

Run: `bun test tests/scene-once-vs-always.test.tsx`

Expected: FAIL because the pilot starts with the off variant, does not render `Movimentos: 0`, and still offers the ignition card.

- [ ] **Step 3: Simplify the stage state presentation**

Remove `ensinaLigarNave`, `ligouNaveNestaExperiencia`, and `naveLigada`. Render every `ActorFigure` without a `desligada` variant. Beside the existing step HUD, conditionally render:

```tsx
{prepared.cards.some((card) => card.id === 'move') && (
  <Texto x={24} y={67} tamanho={14} className="fill-scene-b-ink" fontWeight="700">
    {`Movimentos: ${state.once.fires.move}`}
  </Texto>
)}
```

Keep the controls' per-card counts for all other presets.

- [ ] **Step 4: Update the member-shell rule**

Replace the pilot-specific `panel + move` instruction in `packages/member-shell/CLAUDE.md` with the permanent-flame, single-move-card, two-trial behavior.

- [ ] **Step 5: Run the focused stage test**

Run: `bun test tests/scene-once-vs-always.test.tsx`

Expected: PASS, including the space scenario, no ground/cactus, manual-step controls, and the event-area keyboard path.

- [ ] **Step 6: Commit the stage behavior**

```bash
git add packages/member-shell/src/components/scene-once-vs-always.tsx packages/member-shell/tests/scene-once-vs-always.test.tsx packages/member-shell/CLAUDE.md
git commit -m "feat(learning): mostrar comparacao de movimento no palco"
```

### Task 3: Align the pilot lesson, recording brief, and scene catalog

**Files:**
- Modify: `docs/aulas-interativas/aulas/desafio-dia-1.manifesto.json:122-170`
- Modify: `docs/aulas-interativas/aulas/desafio-dia-1.md`
- Modify: `docs/aulas-interativas/aulas/desafio-dia-1.roteiro.md`
- Modify: `docs/aulas-interativas/cenas/CENAS-NOVAS.md:71-117`
- Test: `packages/core/src/learning/scene/pedidos-no-motor.test.ts`

**Interfaces:**
- Consumes: `setup.goals`, `setup.goalCopy`, and the exact pilot preset validated by `isOnceVsAlwaysPreset`.
- Produces: a valid manifest that requires `once` and `always`, tells the two trials, and records the video/HUD behavior for recording and future scene reuse.

- [ ] **Step 1: Add a failing manifest assertion to the lesson audit**

Add an assertion that finds `experiencia-areas` in `desafio-dia-1.manifesto.json` and verifies:

```ts
expect(activity.setup.goals).toEqual(['once', 'always'])
expect(activity.setup.preset.cards).toEqual([
  { id: 'move', kind: 'move', label: 'Mover a nave um pouquinho' },
])
expect(activity.setup.goalCopy.once.pedido).toContain('Ao iniciar')
expect(activity.setup.goalCopy.always.pedido).toContain('Enquanto estiver rodando')
```

- [ ] **Step 2: Run the lesson audit and verify it fails**

Run: `bun test src/learning/scene/pedidos-no-motor.test.ts`

Expected: FAIL because the old manifest still declares `panel`, does not declare the two target list, and has no adapted goal copy.

- [ ] **Step 3: Rewrite the interactive block precisely**

Set the Zappy bridge to `Agora veja a mesma ação nos dois lugares.` Set `instructions` to direct the `Ao iniciar` three-step trial, `Voltar ao começo`, then the `Enquanto estiver rodando` three-step trial. In `setup`, declare:

```json
"goals": ["once", "always"],
"goalCopy": {
  "once": {
    "label": "Em Ao iniciar, a nave se moveu uma vez e parou",
    "pedido": "Ponha Mover a nave um pouquinho em Ao iniciar e avance três passos."
  },
  "always": {
    "label": "Enquanto estiver rodando, a nave se moveu a cada passo",
    "pedido": "Volte ao começo, ponha Mover a nave um pouquinho em Enquanto estiver rodando e avance três passos."
  }
}
```

Replace the preset cards with the one `move` card. Keep `required: true`, `semPerguntaFinal: true`, the one video, and the existing section-completion list.

- [ ] **Step 4: Rewrite the video and lesson notes**

In both Day 1 documents, make `video-duas-areas` show one movement at the start marker and three movements at consecutive step markers. State that the scene HUD shows `Passo` and `Movimentos`, that no ignition action exists, and that the experiment is the two trials above. Update `CENAS-NOVAS.md` to describe the same one-card, three-step, reset, three-step sequence and remove claims that the ship starts off or that `both` is required.

- [ ] **Step 5: Run the manifest-oriented core tests**

Run: `bun test src/learning/scene/pedidos-no-motor.test.ts src/learning/scene/presets.test.ts`

Expected: PASS, including the global imported-manifest validation and the adapted goal-copy behavior.

- [ ] **Step 6: Commit the lesson content**

```bash
git add docs/aulas-interativas/aulas/desafio-dia-1.manifesto.json docs/aulas-interativas/aulas/desafio-dia-1.md docs/aulas-interativas/aulas/desafio-dia-1.roteiro.md docs/aulas-interativas/cenas/CENAS-NOVAS.md packages/core/src/learning/scene/pedidos-no-motor.test.ts
git commit -m "docs(learning): orientar dois testes na aula piloto"
```

### Task 4: Verify the integrated change

**Files:**
- Verify: `packages/core`
- Verify: `packages/member-shell`
- Verify: repository working tree

**Interfaces:**
- Consumes: core preset/engine, member-shell stage, and imported lesson manifest.
- Produces: fresh evidence that the behavior and package contracts remain valid.

- [ ] **Step 1: Format changed files**

Run:

```bash
bunx biome format --write packages/core/src/learning/scene/presets.ts packages/core/src/learning/scene/once-vs-always.test.ts packages/member-shell/src/components/scene-once-vs-always.tsx packages/member-shell/tests/scene-once-vs-always.test.tsx docs/aulas-interativas/aulas/desafio-dia-1.manifesto.json docs/aulas-interativas/aulas/desafio-dia-1.md docs/aulas-interativas/aulas/desafio-dia-1.roteiro.md docs/aulas-interativas/cenas/CENAS-NOVAS.md
```

- [ ] **Step 2: Run focused behavior tests**

Run:

```bash
bun test src/learning/scene/once-vs-always.test.ts src/learning/scene/presets.test.ts src/learning/scene/pedidos-no-motor.test.ts
```

from `packages/core`, then:

```bash
bun test tests/scene-once-vs-always.test.tsx
```

from `packages/member-shell`.

Expected: all targeted tests PASS.

- [ ] **Step 3: Run package checks**

Run in both `packages/core` and `packages/member-shell`:

```bash
bun run typecheck
bun run check
```

Expected: each command exits 0.

- [ ] **Step 4: Review the final diff and history**

Run:

```bash
git diff HEAD~3..HEAD --check
git status --short --branch
git log --oneline -4
```

Expected: no whitespace errors; the three implementation commits and the design commit are present; no unrelated files are staged or modified.

## Self-review

- Spec coverage: Task 1 makes the same movement prove both outcomes and preserves legacy snapshots. Task 2 removes the fake ignition and makes the scene evidence visible. Task 3 aligns the mandatory lesson, Zappy bridge, recording brief, and reusable-scene reference. Task 4 checks behavior, types, formatting, and the final diff.
- Placeholder scan: no implementation placeholder, generic test request, or undefined implementation step remains.
- Type consistency: `OnceGoalCards`, `setup.goals`, `setup.goalCopy`, `state.once.fires.move`, and the existing `reset` action are named exactly as the current code exposes them.
