# Caderno Único de Cadê Todo Mundo? Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar o Caderno do Aluno apenas na Aula 1, com download sob o vídeo e leitura 3D responsiva na outra coluna, e remeter a ele na Aula 2.

**Architecture:** Um único bloco `materials` declara `bookPreview: true`. O item de arquivo PDF é anexado uma vez no admin; o player reutiliza seu `attachmentId` na rota autenticada de anexos para o download e o leitor. A função pura de partição mostra o mesmo bloco como material à esquerda e como prévia à direita, sem duplicar o bloco persistido.

**Tech Stack:** TypeScript, React, Next.js, Bun/Vitest, react-resizable-panels, PDF.js/Three.js existentes.

**Spec:** `docs/plans/2026-09-26-cade-todo-mundo-caderno-unico-design.md`

## Global Constraints

- Um só PDF privado, anexado uma vez à Aula 1; nenhuma localização `r2priv:` no browser.
- A Aula 2 não contém bloco ou upload do caderno.
- Vídeo assistido a 90% é o único requisito da seção; abrir/baixar/imprimir são opcionais.
- A coluna direita aparece pela régua responsiva existente; em tela estreita, livro depois de vídeo/download.
- Sem “mapa do jogo” como nome/função principal do caderno.
- Preservar alternativa “Ler por páginas” e o download se WebGL não funcionar.
- Não alterar arquivos sujos fora deste escopo.

---

### Task 1: Contrato do bloco de materiais e autoria

**Files:**
- Modify: `packages/core/src/learning/index.ts` (tipo e validação do manifesto)
- Modify: `packages/members/src/domain/course/lesson-block.ts` (tipo persistido)
- Modify: `packages/member-shell/src/lib/types.ts` (tipo do player)
- Modify: `packages/admin/src/app/admin/membros/cursos/[courseId]/aulas/[lessonId]/lesson-editor-client.tsx` (preservar e editar a opção)
- Test: `packages/members/tests/integration/learning-import.test.ts`
- Test: `packages/admin/tests/materials-authoring.test.ts`
- Test: `docs/aulas-interativas/qa/cade-todo-mundo-manifestos.test.ts`

**Interfaces:**
- Produces: `MaterialsBlock.bookPreview?: boolean`, aceito por `isLearningManifest` e mantido ao salvar o bloco no admin.
- Consumes: item PDF `{ kind: 'file', attachmentId }` já existente.

- [ ] **Step 1: Write the failing tests.** No validador, `bookPreview: true` deve ser aceito apenas como booleano. No importador, reimportar o bloco com `items: []` deve preservar o PDF anexado e a flag. No formulário do admin, salvar materiais não pode apagar a flag.

```ts
const marked = manifesto('aula-1')
const notebook = marked.blocks.find((block) => block.key === 'caderno')
if (!notebook || !('content' in notebook) || notebook.content.kind !== 'materials')
  throw new Error('Bloco do caderno ausente no fixture')
notebook.content.bookPreview = true
expect(isLearningManifest(marked)).toBe(true)
notebook.content.bookPreview = 'sim' as never
expect(isLearningManifest(marked)).toBe(false)
```

No teste de importação, recupere o bloco da prévia após reimportar e confira `bookPreview: true` junto ao item PDF preservado.

- [ ] **Step 2: Run the targeted tests and confirm the red result.** Use the package's existing Bun test command and record the failing assertion.
- [ ] **Step 3: Add `bookPreview?: boolean` to all three types and validate `(content.bookPreview === undefined || typeof content.bookPreview === 'boolean')`. Include a labeled checkbox on the `materials` editor, initialize it from existing content, and include it in the saved content.** Keep `items` preservation in `importedContent` unchanged.
- [ ] **Step 4: Run targeted tests and typechecks** for core, members, member-shell and admin; fix failures in touched scope.
- [ ] **Step 5: Commit only Task 1 files.**

### Task 2: Leitor do mesmo PDF na segunda coluna

**Files:**
- Modify: `packages/member-shell/src/lib/lesson-split.ts`
- Modify: `packages/member-shell/src/components/lesson-sections.tsx`
- Create: `packages/member-shell/src/components/ebook/pdf-book-view.tsx` (controles 3D/páginas reutilizáveis)
- Create: `packages/member-shell/src/components/ebook/materials-book-preview.tsx` (resolve PDF do item de material)
- Modify: `packages/member-shell/src/components/ebook/ebook-block.tsx` (usa `PdfBookView` mantendo download/progresso atuais)
- Test: `packages/member-shell/tests/lesson-split.test.ts`
- Test: `packages/community-kids/tests/lesson-sections.test.tsx`
- Test: novo teste do `MaterialsBookPreview` junto aos testes de ebook/materiais

**Interfaces:**
- Consumes: `MaterialsBlock.bookPreview`, o primeiro item de arquivo com tipo PDF e `attachmentId`.
- Produces: `PdfBookView({ pdfUrl, title, onOpened? })`; `MaterialsBookPreview({ content })` usa `useLessonPlayer()` e `lessonAttachmentUrl(...)`.

- [ ] **Step 1: Write red tests.** Um bloco `materials` com `bookPreview: true` deve estar em `contentIds` e `toolIds` e ativar `podeDividir`, mas não `temEditor`. Um bloco normal continua só à esquerda. No player, a coluna esquerda mostra download e a direita mostra o leitor/estado de anexo pendente; em largura estreita, a ordem DOM é conteúdo e depois leitor.

```ts
expect(partirSecao({ blocks: [{ id: 'caderno', kind: 'materials', content: { kind: 'materials', items: [], bookPreview: true } }, { id: 'video', kind: 'video' }] })).toMatchObject({ contentIds: ['caderno', 'video'], toolIds: ['caderno'], podeDividir: true, temEditor: false })
```

- [ ] **Step 2: Run tests to confirm the red result.**
- [ ] **Step 3: Implement the split rule.** `partirSecao` adds a book-preview materials block to both ID lists. In `LessonSections`, render the usual block on the left and `MaterialsBookPreview` for that ID on the right; do not call `renderBlocks([block])` again. Keep the non-editor stacked layout. A book-preview block with no PDF shows an actionable placeholder only in authoring preview.
- [ ] **Step 4: Extract `PdfBookView` from the current ebook UI.** It owns the `Livro 3D` / `Ler por páginas` toggle, dynamic loading and WebGL fallback. `EbookBlockView` retains its authenticated ebook URL and download/progress logic. The materials preview points to `lessonAttachmentUrl(player.courseSlug, player.lessonId, pdf.attachmentId)`; only the attachment ID, not the private storage reference, enters the URL.
- [ ] **Step 5: Run split, rendering, ebook and attachment-protection tests, plus typechecks** for member-shell and community-kids.
- [ ] **Step 6: Commit only Task 2 files.**

### Task 3: Reescrever e unificar o caderno do curso

**Files:**
- Modify: `docs/aulas-interativas/qa/gerar-cade-todo-mundo.ts`
- Regenerate: `docs/aulas-interativas/aulas/cade-todo-mundo-aula-1.manifesto.json`
- Regenerate: `docs/aulas-interativas/aulas/cade-todo-mundo-aula-2.manifesto.json`
- Modify: `docs/aulas-interativas/aulas/cade-todo-mundo-aula-1.roteiro.md`
- Modify: `docs/aulas-interativas/aulas/cade-todo-mundo-aula-2.roteiro.md`
- Modify: `docs/aulas-interativas/recursos/cade-todo-mundo/caderno-do-aluno.template.html`
- Regenerate locally: `output/pdf/cade-todo-mundo-caderno-do-aluno.pdf` (não adicionar ao git se estiver ignorado)
- Modify: `docs/aulas-interativas/aulas/cade-todo-mundo-aula-1.md`, `cade-todo-mundo-aula-2.md`, `docs/aulas-interativas/modulos-cade-todo-mundo.md`
- Test: `docs/aulas-interativas/qa/cade-todo-mundo-manifestos.test.ts`

**Interfaces:**
- Consumes: `bookPreview: true` from Task 1 and responsive preview from Task 2.
- Produces: manifest with one `caderno` block in Aula 1, no `caderno` in Aula 2 and `retireBlockKeys: ['caderno']` for replacement of existing drafts.

- [ ] **Step 1: Update tests first.** Assert Aula 1 title/flag/optional completion; assert Aula 2 has no caderno block or section reference and retires the old key.
- [ ] **Step 2: Run the manifest test and confirm the red result.**
- [ ] **Step 3: Update the manifest generator.** Rename section 2 `seu-caderno-do-aluno` / `Seu Caderno do Aluno`, set `bookPreview: true`, remove Aula 2 caderno block and reference, and add `retireBlockKeys: ['caderno']` in Aula 2. Regenerate both manifest files with `bun docs/aulas-interativas/qa/gerar-cade-todo-mundo.ts`.
- [ ] **Step 4: Rewrite the spoken script and planned-video directions.** Example voice: “Este é o Caderno do Aluno. Ele tem os passos das duas aulas, com os blocos que vamos usar e o que conferir quando testar. Se você esquecer alguma parte, pode voltar a esta seção e olhar o passo no caderno. Dá para folhear aqui na tela ou baixar o PDF junto do vídeo. Você não precisa baixar nem imprimir para continuar.” Mostrar capa e orientação no vídeo; não abrir a página de passos antes da primeira experiência. In Aula 2, replace “está nesta seção” with a short reminder about Aula 1.
- [ ] **Step 5: Reframe the PDF cover and overview.** Replace “Seu mapa para criar o jogo…” with “Os passos das duas aulas para consultar quando precisar.” Rename `Mapa do jogo` to `O que você vai fazer` or another descriptive, child-friendly overview. Retain both step-by-step pages. Generate the PDF with the existing script and visually inspect all pages.
- [ ] **Step 6: Update the lesson/module docs** to say one upload in Aula 1, book on the right if wide, stacked if narrow, and Aula 2 reference only; presentation video does not spoil the experience.
- [ ] **Step 7: Run filtered manifest validation and tests**: `bun docs/aulas-interativas/qa/validar-manifestos.ts cade-todo-mundo` and the `cade-todo-mundo` test files.
- [ ] **Step 8: Commit only Task 3 files.**

### Task 4: Integrated review

**Files:** No intentional production edits except corrections exposed by review.

- [ ] **Step 1: Inspect the full diff** and verify each requirement in the design spec has a corresponding change.
- [ ] **Step 2: Run the relevant typechecks, tests and manifesto validator fresh.** Record exact pass/fail counts and investigate any failure in scope.
- [ ] **Step 3: Review authoring and published flows**: no PDF linked, one PDF linked, 3D unsupported, narrow/wide columns, reimport of Aula 2, and conclusion after video without material access. If browser preview is available, inspect visually; otherwise state that browser verification remains pending.
- [ ] **Step 4: Commit only corrections from this review.** Do not stage unrelated shared-worktree changes or push/deploy without an explicit current request.
