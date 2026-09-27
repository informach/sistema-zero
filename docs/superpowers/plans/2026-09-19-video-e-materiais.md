# Vídeo e materiais obrigatórios Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que a autora exija simultaneamente 90% do vídeo e o download de arquivos escolhidos para liberar uma seção.

**Architecture:** A configuração fica em `SectionCompletion` e é validada no core e no members. A evidência do arquivo é gravada pelo members somente após o BFF preparar uma entrega autenticada, usando a rota HMAC já existente para chamadas servidor a servidor; o progresso usa o JSONB existente por bloco e revisão.

**Tech Stack:** TypeScript, Bun, React, Next.js Route Handlers, Elysia, Drizzle/PostgreSQL.

**Spec:** `docs/plans/2026-09-19-video-e-materiais-design.md`

## Global Constraints

- Critérios selecionados são cumulativos; arquivos não selecionados não bloqueiam.
- PDF/imagem sem marca d'água válida nunca é entregue nem creditado.
- Não criar migração; o progresso JSONB já aceita `string[]`.
- Não fazer push ou deploy; integrar só na `staging` local.
- Usar os mesmos ganchos visuais nos apps Kids e Adulto.

---

### Task 1: Contrato de autoria e validação

**Files:** `packages/core/src/learning/section-progression.ts`, `packages/members/src/interfaces/http/learning.dtos.ts`, `packages/admin/src/lib/lesson-authoring.ts`, `packages/admin/src/components/editor/section-completion-editor.tsx`, testes de core/admin.

**Interfaces:** `SectionCompletion.materialItems?: { blockId: string; itemIds: string[] }[]`; cada `blockId` da lista também deve estar em `blockIds`.

- [ ] Escrever testes que publiquem vídeo + materiais, rejeitem arquivo inexistente/sem anexo/duplicado e mantenham arquivo opcional fora da regra.
- [ ] Rodar os testes e confirmar a falha da regra atual.
- [ ] Expandir o contrato e validador; retirar a exclusividade do vídeo; adicionar seleção por arquivo no Admin e o resumo textual.
- [ ] Rodar testes, typechecks de core/admin/members e revisar o diff.
- [ ] Commitar o lote.

### Task 2: Evidência confiável de download

**Files:** `packages/members/src/application/get-attachment-download/get-attachment-download.service.ts`, `packages/members/src/domain/ports/learning-repository.port.ts`, `packages/members/src/infrastructure/persistence/drizzle/learning.repository.ts`, `packages/members/src/interfaces/http/routes/members.routes.ts`, `packages/members/src/composition-root.ts`, `packages/api-gateway/gateway.config.ts`, `packages/member-shell/src/server/clients.ts`, `packages/member-shell/src/routes/index.ts`, testes de integração e rota.

**Interfaces:** `recordMaterialDownload(actor, lessonId, blockId, itemId, attachmentId)` exige que IDs pertençam ao mesmo item publicado; o repositório adiciona `itemId` a `answers.downloadedMaterialItemIds` sob lock por perfil e revisão.

- [ ] Testar autorização, perfil, seção bloqueada, arquivo trocado, repetição e resposta sem marca d'água.
- [ ] Rodar os testes e confirmar falhas anteriores.
- [ ] Adicionar rota HMAC restrita ao consumer `member-shell` e serviço de gravação validada.
- [ ] Registrar somente depois de preparar a resposta de arquivo; devolver erro se a gravação necessária falhar.
- [ ] Rodar testes, typechecks de gateway/members/member-shell e revisar o diff.
- [ ] Commitar o lote.

### Task 3: Avaliação de avanço e interface

**Files:** `packages/core/src/learning/requirements.ts`, `packages/members/src/application/learning/section-progression.service.ts`, `packages/member-shell/src/components/{lesson-sections,materials-block,lesson-player-context}.tsx`, `packages/member-shell/src/lib/attachment-download.ts`, CSS Kids/Adulto e testes.

**Interfaces:** O avaliador recebe a seleção `materialItems` e exige todos os `itemIds` registrados na revisão corrente. A interface passa `blockId` e `itemId` na URL e atualiza o progresso após download confirmado.

- [ ] Testar vídeo incompleto + arquivos completos, vídeo completo + arquivo pendente e todos completos.
- [ ] Rodar os testes e confirmar falha.
- [ ] Implementar avaliação AND, progresso visível e atualização no player.
- [ ] Rodar testes de UI, typechecks dos consumidores e revisar o diff.
- [ ] Commitar o lote.

### Task 4: Documentação, revisão final e integração local

**Files:** `packages/{core,admin,members,member-shell,community-kids}/CLAUDE.md`, documentação de aulas que afirma que materiais nunca bloqueiam.

- [ ] Documentar que materiais são opcionais por padrão, mas arquivos selecionados bloqueiam.
- [ ] Rodar testes focados, typecheck, lint/format e build proporcional; conferir falhas e limites.
- [ ] Fazer full review de contrato, segurança, estados de erro e mudanças concorrentes.
- [ ] Commitar e integrar os commits na `staging` local; conferir worktrees e ausência de push.
