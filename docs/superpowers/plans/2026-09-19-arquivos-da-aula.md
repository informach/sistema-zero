# Arquivos da Aula Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Anexo enviado uma vez por aula, reutilizado explicitamente pelo Livro 3D, por downloads e pelo Zappy, com critérios de avanço claros.

**Architecture:** A tabela e o rascunho de anexos da aula continuam sendo a fonte única dos arquivos. Blocos guardam o id do anexo, nunca uma cópia de sua URL; o Zappy usa fonte `attachment:<id>` independente de bloco. Texto, link, vídeo incorporado e imagem de exibição continuam no bloco de materiais.

**Tech Stack:** Bun, TypeScript, React/Next.js, Elysia, Drizzle/PostgreSQL, `bun test`.

**Spec:** `docs/plans/2026-09-19-arquivos-da-aula-design.md`

## Global Constraints

- Biblioteca por aula, não por curso.
- Só arquivos enviados entram na biblioteca; texto, links, vídeos incorporados e imagens de exibição ficam no bloco.
- PDF é o único tipo elegível para Livro 3D e para `Caderno do aluno para o Zappy`.
- Não criar item de download ao selecionar ou enviar um PDF do Livro 3D.
- Preservar acesso privado, marca d'água e conteúdo publicado; PDF sem marca d'água não é entregue.
- Não incluir as alterações não relacionadas e ainda não comitadas de outras sessões.

---

### Task 1: Contrato e persistência dos arquivos da aula

**Files:**
- Modify: `packages/core/src/learning/authoring.ts`
- Modify: `packages/members/src/domain/course/course.ts`
- Modify: `packages/members/src/infrastructure/persistence/drizzle/schema.ts`
- Modify: `packages/members/src/infrastructure/persistence/drizzle/course.repository.ts`
- Modify: `packages/members/src/infrastructure/persistence/drizzle/lesson-draft.repository.ts`
- Modify: `packages/members/src/interfaces/http/lesson-draft.dtos.ts`
- Modify: `packages/members/src/application/mappers/admin-content-views.ts`
- Modify: `packages/admin/src/lib/types.ts`
- Generate: `packages/members/src/infrastructure/persistence/drizzle/migrations/0091_*.sql` and metadata
- Create custom: `packages/members/src/infrastructure/persistence/drizzle/migrations/0092_*.sql`
- Test: `packages/members/tests/db/lesson-draft-cases.ts`, `packages/members/tests/integration/lesson-draft-restore.test.ts`

**Interfaces:**
- Produces: `DraftAttachment.zappyStudentNotebook?: boolean`, `LessonAttachment.zappyStudentNotebook: boolean`, published column `zappy_student_notebook boolean not null default false`.
- Consumes: existing `DraftAttachment.id/url/fileType` and existing e-book marker in published/draft block content.

- [ ] **Step 1: Add a failing focused test.** Verify a marked PDF survives draft `attachments` change, publication, published content read and draft re-read; an unmarked file remains false. Use this fixture:
  ```ts
  const caderno = { id: crypto.randomUUID(), label: 'Caderno', url: 'r2priv:aulas/caderno.pdf', fileType: 'application/pdf', sizeBytes: 42, zappyStudentNotebook: true }
  ```
- [ ] **Step 2: Run the focused test.** From `packages/members`, run `bun test tests/db/lesson-draft-cases.ts tests/integration/lesson-draft-restore.test.ts`; expect a missing field or false value failure.
- [ ] **Step 3: Extend types, DTO and persistence.** Add the optional flag to draft and admin types, a boolean column to Drizzle, and map the field on both publication and read. Validate a marked file is PDF using `fileType === 'application/pdf'` or a `.pdf` filename/URL only when MIME is absent; reject non-PDF marking with a clear issue. Map the flag in `initialDocument` and attachment views.
- [ ] **Step 4: Generate migrations with project scripts.** From `packages/members`, run `bun run db:generate`, then `bun run db:generate -- --custom --name notebook_attachment_backfill`. In the custom SQL, copy `zappyStudentNotebook` from existing published e-book blocks onto matching lesson attachments by lesson id and PDF URL, and set the same property in matching draft attachment JSON. Keep the column migration before the backfill in `_journal.json`. Do not hand-edit the generated schema migration.
- [ ] **Step 5: Verify and commit.** Run focused test, `bun run typecheck` for core/members/admin, and inspect SQL/journal. Commit only Task 1 files with `feat(aulas): identificar caderno no arquivo da aula`.

### Task 2: Livro 3D seleciona arquivo existente sem criar downloads

**Files:**
- Modify: `packages/members/src/domain/course/lesson-block.ts`
- Modify: `packages/members/src/interfaces/http/dtos.ts`
- Modify: `packages/members/src/application/get-ebook-download/get-ebook-download.service.ts`
- Modify: `packages/admin/src/app/admin/membros/cursos/[courseId]/aulas/[lessonId]/lesson-editor-client.tsx`
- Modify: `packages/admin/src/lib/types.ts`
- Remove: `packages/admin/src/lib/lesson-ebook-material.ts` after its callers/tests are replaced
- Test: `packages/admin/tests/lesson-ebook-material.test.ts`, `packages/members/tests/integration/ebook-download.test.ts`

**Interfaces:**
- Produces: `EbookBlock.attachmentId: string`, resolved by `lesson.attachments.find(a => a.id === block.content.attachmentId)` in the authorized server route.
- Consumes: Task 1 attachment ids and metadata.

- [ ] **Step 1: Write failing tests.** Selecting a PDF id stores only `attachmentId`, neither uploads again nor changes a materials block. Ebook resolution returns the selected attachment's private URL; a foreign, missing or non-PDF attachment fails. Target block content:
  ```ts
  { kind: 'ebook', attachmentId: caderno.id, title: 'Caderno do aluno' }
  ```
- [ ] **Step 2: Run the focused tests.** Expect the current URL-based block and automatic materials creation to fail the new assertions.
- [ ] **Step 3: Implement the selector.** Change the e-book form from its direct uploader to a PDF-only attachment picker, with an inline upload that creates a library attachment and selects its id. Remove the e-book-only Zappy checkbox and the automatic `planEbookMaterialUpload` call. Keep the published student's 3D/book reader and protected download button unchanged.
- [ ] **Step 4: Change the server resolve path.** The e-book content uses `attachmentId`; after existing access/section checks, resolve that id only within the current lesson and validate its PDF type. Extend publication validation so a missing or non-PDF id blocks publication. Generate `bun run db:generate -- --custom --name ebook_attachment_links` from `packages/members`; edit only its custom SQL to migrate existing published/draft URL-based e-books to matching attachment ids, creating a lesson attachment only for genuinely unmatched PDFs. Preserve block ids and progress revisions.
- [ ] **Step 5: Verify and commit.** Run focused tests and members/admin typechecks. Commit Task 2 files with `feat(aulas): selecionar PDF do livro na biblioteca`.

### Task 3: Materiais e avanço com ações compreensíveis

**Files:**
- Modify: `packages/admin/src/app/admin/membros/cursos/[courseId]/aulas/[lessonId]/materials-builder.tsx`
- Modify: `packages/admin/src/app/admin/membros/cursos/[courseId]/aulas/[lessonId]/lesson-editor-client.tsx`
- Modify: `packages/admin/src/components/editor/section-completion-editor.tsx`
- Modify: `packages/admin/src/lib/lesson-authoring.ts`
- Modify: `packages/core/src/learning/section-progression.ts`
- Modify: `packages/core/src/learning/section-templates.ts`
- Test: `packages/admin/tests/materials-authoring.test.ts`, `packages/members/tests/integration/section-progression.test.ts`

**Interfaces:**
- Consumes: `MaterialsBlock.items[].attachmentId`, `SectionCompletion.materialItems`, Task 1 library list.
- Produces: each file item can select an existing attachment or upload once into the library; `material` sections accept file-download criteria.

- [ ] **Step 1: Write failing tests.** A `material` section with only a materials block and one PDF has a selectable download criterion and no publication issue. A section with e-book plus selected download may require both. An unselected file remains optional. Use explicit criteria:
  ```ts
  { version: 1, blockIds: ['b-mat'], materialItems: [{ blockId: 'b-mat', itemIds: ['i-caderno'] }] }
  ```
- [ ] **Step 2: Run focused tests.** Expect the current `material`-section e-book-only validation to fail.
- [ ] **Step 3: Fix the model and copy.** Permit e-book and materials requirements in `material` sections. Keep section completion as an explicit AND of checked criteria. Replace the old message with a file-specific actionable error and show a summary such as `Baixar Caderno do aluno e Mapa dos pais` using the selected ids.
- [ ] **Step 4: Improve Admin controls.** Show existing lesson attachments in each file item, allow inline upload, keep image/text/link/video item editors local to the materials block, and remove copy claiming every material is optional when files were marked required. Rename the annex tab `Arquivos da aula`, show file use badges, and refuse deletion while e-book/material/Zappy references remain.
- [ ] **Step 5: Verify and commit.** Run focused admin/core tests and typechecks, review no accidental changes to non-file items, then commit Task 3 files with `feat(aulas): reutilizar arquivos e configurar downloads`.

### Task 4: Zappy indexa o PDF marcado, independente do Livro 3D

**Files:**
- Modify: `packages/members/src/domain/ports/zappy-knowledge-repository.port.ts`
- Modify: `packages/members/src/infrastructure/persistence/drizzle/zappy-knowledge.repository.ts`
- Modify: `packages/members/src/application/zappy/zappy-knowledge.service.ts`
- Modify: `packages/members/src/domain/zappy/zappy-knowledge-report.ts`
- Modify: `packages/admin/src/server/zappy-knowledge.ts`
- Modify: `packages/admin/src/server/lesson-draft-publication.ts`
- Test: `packages/members/tests/unit/zappy-knowledge.test.ts`, `packages/members/tests/unit/zappy-repository.test.ts`, `packages/members/tests/integration/zappy-bff.test.ts`

**Interfaces:**
- Produces: source reference `attachment:<attachmentId>` with `blockId: null` and source revision based on published attachment URL; existing block refs remain for text/video.
- Consumes: published `LessonAttachment.zappyStudentNotebook` from Task 1.

- [ ] **Step 1: Write failing tests.** Marked PDF creates one student-notebook source without an e-book; unmarking or deleting it removes that source. Changing its URL invalidates the old source, and a stale extraction cannot overwrite the new URL. An unpublished lesson or `coming_soon` lesson never becomes searchable. The source identity is:
  ```ts
  const sourceRef = `attachment:${attachment.id}`
  ```
- [ ] **Step 2: Run focused tests.** Expect the current block-only authority, search and report queries to fail.
- [ ] **Step 3: Generalize source authority.** Resolve `attachment:<id>` against the published, marked PDF under its lesson, with the same transactional lock/revision validation used by blocks. Allow `blockId: null` for attachment sources, join the attachment in search/report queries, and reconcile removed/unmarked attachment sources. Keep course/lesson entitlement and `coming_soon` filters intact.
- [ ] **Step 4: Synchronize publication and backfill.** After successful publication, sync each marked attachment, delete sources for removed/unmarked attachments, and include marked attachments in the manual backfill and missing-notebook report. Move the PDF extraction trigger out of `syncZappyKnowledgeForBlock`. Use `sourceRef: 'attachment:' + attachment.id` and the private published URL.
- [ ] **Step 5: Verify and commit.** Run Zappy tests, members/admin typechecks and targeted integration tests; commit Task 4 files with `feat(zappy): indexar caderno pelo arquivo publicado`.

### Task 5: Regressão, migração e revisão final

**Files:**
- Review: `packages/admin/src/app/admin/membros/cursos/[courseId]/aulas/[lessonId]/lesson-editor-client.tsx`, `packages/members/src/infrastructure/persistence/drizzle/lesson-draft.repository.ts`, `packages/members/src/infrastructure/persistence/drizzle/zappy-knowledge.repository.ts`
- Review: `packages/members/src/infrastructure/persistence/drizzle/migrations/meta/_journal.json`
- Update: `docs/plans/2026-09-19-arquivos-da-aula-design.md` if implementation differs from the approved design.

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces: verified admin-to-student flow with no duplicate upload or unmarked download.

- [ ] **Step 1: Review migrations.** Confirm ordered journal entries, restrictive/idempotent backfill, no dropped published PDFs, no schema drift, and rollback as forward-fix migration.
- [ ] **Step 2: Exercise the author journey.** In a lesson with Caderno and Mapa PDFs, mark only Caderno for Zappy; select Caderno in Livro 3D, both in Materiais complementares, and require only the desired download(s). Verify draft, publish, reopen and republish.
- [ ] **Step 3: Exercise the student journey.** Confirm 3D reading, separate download buttons, watermark on each PDF, fail-closed download error, and advancement only after selected requirements.
- [ ] **Step 4: Run verification.** Run focused tests, `bun run lint`, `bun run typecheck`, `bun run test` in affected packages, plus `git diff --check` and a final review of the diff. Do not stage other-session files.
- [ ] **Step 5: Commit fixes.** Commit only scoped files required by the review with `fix(aulas): consolidar fluxo de arquivos da aula`. Do not push or deploy without a separate request.
