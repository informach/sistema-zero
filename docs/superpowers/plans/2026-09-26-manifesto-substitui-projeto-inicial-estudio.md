# Manifesto substitui projeto inicial do Estúdio — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer a reimportação do manifesto atualizar o projeto inicial do Estúdio em qualquer curso e nos dois modos de importação.

**Architecture:** O serviço de importação já recebe o bloco do manifesto e só precisa parar de sobrescrever seu `initialProject` com o valor anterior. O ID e as evidências seguem fora dessa propriedade e permanecem intactos. A interface e a especificação passam a descrever essa regra.

**Tech Stack:** TypeScript, Bun test, React, Biome.

**Spec:** `docs/plans/2026-09-26-manifesto-substitui-projeto-inicial-estudio-design.md`

## Global Constraints

- Os dois modos de importação, `preserve` e `replace`, devem aplicar o `initialProject` do manifesto.
- Não modificar blocos Pinta, materiais, certificados, vídeos ou a versão publicada.
- Preservar IDs dos blocos e entregas dos alunos.

---

### Task 1: Substituição do projeto inicial na importação

**Files:**
- Modify: `packages/members/tests/integration/learning-import.test.ts`
- Modify: `packages/members/src/application/learning/learning-import.service.ts`

**Interfaces:**
- Consumes: `LearningManifest.blocks[].content.initialProject` e `LearningImportService.preview/apply`.
- Produces: rascunho com o conteúdo do Estúdio importado, preservando seu ID.

- [ ] **Step 1: Escrever o teste vermelho.** Para cada modo (`preserve`, `replace`), partir de um bloco Estúdio com projeto antigo, importar um manifesto com outro projeto e exigir que `draft.document.blocks` mantenha o ID e use `configured.content.initialProject`.
- [ ] **Step 2: Rodar o teste.** `bun test packages/members/tests/integration/learning-import.test.ts` deve falhar nas asserções do projeto inicial.
- [ ] **Step 3: Aplicar a correção mínima.** Em `importedContent`, fazer o ramo `studio` devolver `authored` em vez de `{ ...authored, initialProject: previous.initialProject }`, sem alterar os outros ramos.
- [ ] **Step 4: Rodar o teste novamente.** O mesmo comando deve passar e provar também que a versão publicada não foi alterada.

### Task 2: Clareza para quem importa

**Files:**
- Modify: `packages/admin/src/components/editor/lesson-manifest-import.tsx`
- Modify: `docs/aulas-interativas/ESPEC-MANIFESTO.md`
- Modify: `packages/admin/CLAUDE.md`
- Modify: `packages/members/CLAUDE.md`

**Interfaces:**
- Consumes: comportamento atualizado do importador.
- Produces: texto da interface e documentação coerentes com o manifesto como fonte do projeto inicial.

- [ ] **Step 1: Corrigir a cópia.** Informar na interface que o projeto inicial do Estúdio vem do manifesto, enquanto anexos e configurações dos demais blocos continuam preservados.
- [ ] **Step 2: Corrigir a especificação e regras locais.** Atualizar os trechos que dizem que o projeto inicial do Estúdio é preservado.
- [ ] **Step 3: Verificar os arquivos.** Rodar `bunx biome check` nos arquivos alterados e `git diff --check`.

### Task 3: Regressão do curso piloto

**Files:**
- Test: `docs/aulas-interativas/qa/cade-todo-mundo-manifestos.test.ts`
- Test: `docs/aulas-interativas/qa/cade-todo-mundo-projeto.test.ts`

**Interfaces:**
- Consumes: manifestos das Aulas 1 e 2 de Cadê Todo Mundo?.
- Produces: evidência de que a lista de blocos e o projeto inicial preparado seguem válidos.

- [ ] **Step 1: Rodar os testes do curso.** `bun test docs/aulas-interativas/qa/cade-todo-mundo-manifestos.test.ts docs/aulas-interativas/qa/cade-todo-mundo-projeto.test.ts` deve passar.
- [ ] **Step 2: Validar os manifestos.** `bun docs/aulas-interativas/qa/validar-manifestos.ts cade-todo-mundo` deve retornar três válidos, sem avisos.
- [ ] **Step 3: Revisar o diff final.** Conferir que não há mudança no catálogo, funil, matrículas, publicações ou entregas.
