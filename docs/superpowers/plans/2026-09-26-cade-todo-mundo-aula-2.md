# Cadê Todo Mundo? — Aula 2 Implementation Plan

> **For agentic workers:** Execute these tasks in order. Use the existing generator as the source of the manifest and verify every generated change before claiming completion.

**Goal:** Bring Aula 2 into line with the approved Aula 1 teaching and navigation decisions.

**Architecture:** Keep the existing three-section manifest. Edit spoken copy and authoring guidance, then update the generator and regenerate the Aula 2 manifest. The same optional Caderno do Aluno appears in each practical lesson.

**Tech Stack:** Markdown, TypeScript, Bun tests, learning-manifest JSON.

**Spec:** `docs/plans/2026-09-26-cade-todo-mundo-aula-2-design.md`

## Global Constraints

- One video per section; the Zappy bridge does not repeat the practical steps.
- The preview updates automatically; do not tell the child to start or run it.
- Keep `courseSlug`, `lessonSlug`, section keys, project chain and completion rules stable.
- The caderno is optional; its download must not block progress.
- Preserve unrelated uncommitted edits in the workspace.

---

### Task 1: Assert the Aula 2 material structure

**Files:** Modify `docs/aulas-interativas/qa/cade-todo-mundo-manifestos.test.ts`.

**Interfaces:** Read the existing manifest via `manifesto('aula-2')`. No production API changes.

- [x] Add an assertion that Aula 2's `contar-achados` section has block keys `['video-a2-contagem', 'ponte-a2-contagem', 'projeto', 'caderno']` and completion keys `['video-a2-contagem', 'projeto']`.
- [x] Assert that the `caderno` block has `kind: 'materials'` and title `Caderno do Aluno — Cadê Todo Mundo?`.
- [x] Run `bun test docs/aulas-interativas/qa/cade-todo-mundo-manifestos.test.ts` and confirm that the new assertion fails while the Aula 2 manifest lacks the material.

### Task 2: Revise the Aula 2 teaching sequence

**Files:** Modify `docs/aulas-interativas/aulas/cade-todo-mundo-aula-2.roteiro.md` and `docs/aulas-interativas/aulas/cade-todo-mundo-aula-2.md`.

**Interfaces:** Keep the three existing sections and their keys; refer to `docs/aulas-interativas/aulas/cade-todo-mundo-aula-1.roteiro.md` for previously taught preview controls.

- [x] In the 35–45 second retomada, show the zero-count problem before naming the task. Do not assume a live saved project exists when the fallback is used.
- [x] In the practical narration, orient the child to the incorporated Estúdio, show where the preview is at narrow and wide widths only as needed, say it updates automatically, and name `Programação > Variáveis` and `Somar 1 em variável achados` before asking the child to test three hiding places.
- [x] Replace “Inicia a prévia” and the instruction to confirm a preview-start button. Guide the child to wait for the live update and touch the garden. Keep `Salvo` and `Enviar para o professor` in this section only.
- [x] Mention the optional caderno at the end of the practical video and remove submission repetition from the closing video direction.

### Task 3: Synchronize generator, manifest and import notes

**Files:** Modify `docs/aulas-interativas/qa/gerar-cade-todo-mundo.ts` and `docs/aulas-interativas/modulos-cade-todo-mundo.md`; regenerate `docs/aulas-interativas/aulas/cade-todo-mundo-aula-2.manifesto.json`.

**Interfaces:** Reuse the Aula 1 material block shape: `{ key: 'caderno', content: { kind: 'materials', title: 'Caderno do Aluno — Cadê Todo Mundo?', items: [] } }`.

- [x] Add `caderno` to Aula 2 `blocks` and its practical section `blockKeys`; do not add it to `completion.blockIds`.
- [x] Align planned-video directions with the spoken script: automatic preview, no duplicate sending in the closing video, optional caderno in practice.
- [x] Note that the PDF at `output/pdf/cade-todo-mundo-caderno-do-aluno.pdf` must be attached to each lesson's `caderno` block in admin.
- [x] Run `bun docs/aulas-interativas/qa/gerar-cade-todo-mundo.ts` and inspect the diff for unrelated manifest changes.

### Task 4: Verify

**Files:** Review all touched files.

- [x] Run `bun test docs/aulas-interativas/qa/cade-todo-mundo-projeto.test.ts docs/aulas-interativas/qa/cade-todo-mundo-manifestos.test.ts`.
- [x] Run `bun docs/aulas-interativas/qa/validar-manifestos.ts cade-todo-mundo`.
- [x] Run `git diff --check` and manually compare roteiro, guia, generator, manifest and caderno language for contradictions.
