# Compartilhamento opcional em Cadê Todo Mundo? Implementation Plan

> **For agentic workers:** Execute inline in this session. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Encerrar a prática no envio e ensinar o compartilhamento opcional no fechamento da Aula 2.

**Architecture:** O Estúdio da Aula 2 tem `showcase.enabled` e aparece na prática e no fechamento por meio do mesmo `workspaceKey`. Ele é declarado apenas uma vez em `blockKeys`, portanto o jogo da criança não é duplicado. O fechamento exige só o vídeo; publicar continua opcional.

**Tech Stack:** Markdown, JSON, TypeScript, Bun test.

**Spec:** `docs/plans/2026-09-26-cade-todo-mundo-compartilhamento-design.md`

## Global Constraints

- Manter as quatro seções atuais e um vídeo em cada seção.
- Publicação imediata após confirmação, opcional e posterior ao envio.
- Não mudar a Aula 1, o certificado, catálogo ou funil.
- Preservar as alterações já presentes na árvore de trabalho.

---

### Task 1: Separar entrega e compartilhamento na Aula 2

**Files:**
- Modify: `docs/aulas-interativas/aulas/cade-todo-mundo-aula-2.roteiro.md`
- Modify: `docs/aulas-interativas/aulas/cade-todo-mundo-aula-2.md`
- Modify: `docs/aulas-interativas/qa/gerar-cade-todo-mundo.ts`
- Modify: `docs/aulas-interativas/aulas/cade-todo-mundo-aula-2.manifesto.json`
- Modify: `docs/aulas-interativas/modulos-cade-todo-mundo.md`
- Modify: `docs/aulas-interativas/ESPEC-MANIFESTO.md`
- Modify: `docs/aulas-interativas/qa/validar-manifestos.ts`
- Test: `docs/aulas-interativas/qa/cade-todo-mundo-manifestos.test.ts`
- Test: `packages/community-kids/tests/lesson-sections.test.tsx`

**Interfaces:**
- Consumes: `content.showcase` do bloco `studio` e a ordem Enviar → Compartilhar do Estúdio da aula.
- Produces: manifesto com `showcase.enabled` apenas na Aula 2 e `workspaceKey: 'projeto'` na prática e no fechamento; `completion.blockIds` do fechamento permanece `['video-a2-fecho']`.

- [x] **Step 1: Write the failing test.** Conferir `workspaceKey: 'projeto'` no fechamento, projeto declarado uma única vez e conclusão só pelo vídeo. O teste falhou antes da alteração.
- [x] **Step 2: Update generator and manifesto.** Reutilizar o mesmo Estúdio na seção final, sem segundo bloco nem segundo projeto.
- [x] **Step 3: Update spoken script and lesson direction.** A prática termina no envio. O fechamento celebra, mostra o compartilhamento opcional e encaminha ao certificado. Atualizar também a nota do módulo.
- [x] **Step 4: Align editorial validation.** Permitir um Estúdio já comprovado em seção anterior como bancada opcional do fechamento, sem abrir exceção para práticas não comprovadas.
- [x] **Step 5: Verify.** Testes de manifesto, projeto e player, validador dos 34 manifestos, formatação e typecheck passaram. Os hashes dos manifestos da Aula 1 e do certificado não mudaram ao rodar o gerador.
