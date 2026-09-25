# Prazo do presente por indicação Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Execute inline; do not delegate or touch concurrent edits outside these files.

**Goal:** Dar sete dias de acesso ao Cadê Todo Mundo? para novos resgates por indicação, preservar resgates antigos e comunicar a regra com clareza.

**Architecture:** O serviço de indicações grava a política do prazo na linha do resgate e envia `expiresAt` ao grant de curso no members. A checagem de acesso existente no members faz o bloqueio após o vencimento. Cópias de páginas e e-mails refletem o prazo; o auto-cadastro e o bônus dos embaixadores permanecem.

**Tech Stack:** Bun, TypeScript, Elysia, Drizzle/PostgreSQL, Astro, React, Next.js, templates de e-mail.

**Spec:** `docs/plans/2026-09-25-prazo-presente-embaixador-design.md`

## Global Constraints

- Sete dias são 168 horas contadas da criação do novo resgate pelo formulário, sem renovação por retry.
- Resgates anteriores à migração conservam política `null` e acesso sem prazo; não fazer backfill.
- Assinaturas, outras campanhas, bônus por Pix e embaixadores existentes não mudam.
- Nas superfícies públicas, dizer “7 dias a partir do cadastro pelo link”; não confundir com sete dias de garantia para o bônus.
- Preservar alterações concorrentes já abertas em `packages/members`, `packages/admin`, `packages/core` e documentos da jornada.

---

### Task 1: Persistir a política por resgate

**Files:**
- Modify: `packages/referrals/src/infrastructure/persistence/drizzle/schema.ts`
- Create: `packages/referrals/src/infrastructure/persistence/drizzle/migrations/0002_*.sql` e snapshot gerados pelo Drizzle
- Modify: `packages/referrals/src/domain/ports/referral-repository.port.ts`
- Modify: `packages/referrals/src/infrastructure/persistence/drizzle/referral.repository.ts`
- Modify: `packages/referrals/tests/fakes/in-memory.ts`
- Test: `packages/referrals/tests/unit/migrations-journal.test.ts`, `packages/referrals/tests/db/referral-repository.test.ts`

**Interfaces:** `RedemptionRecord.accessDurationDays: number | null`; `insertRedemption` grava `7` para qualquer novo resgate e o banco retorna `null` para linhas antigas.

- [ ] **Step 1: Escrever testes que distingam insert novo de leitura antiga.** Testar que um insert novo persiste `7` e que uma linha histórica com `null` continua `null`.
- [ ] **Step 2: Rodar `bun test tests/db/referral-repository.test.ts` em `packages/referrals` e confirmar falha esperada da nova propriedade.** Se o Postgres de teste não estiver disponível, executar o teste unitário de migração e registrar essa limitação.
- [ ] **Step 3: Acrescentar coluna nullable e mapear no repositório.** A migração deve equivaler a `ALTER TABLE "referrals"."scholarship_redemptions" ADD COLUMN "access_duration_days" integer;`, sem `DEFAULT` nem `UPDATE` histórico. O insert de resgate deve gravar `7` no código, e o fake deve replicar o mesmo contrato.
- [ ] **Step 4: Gerar migração com `bun run db:generate` em `packages/referrals`, conferir SQL/snapshot e rodar typecheck e teste de migrações.**
- [ ] **Step 5: Revisar o diff somente dos arquivos da tarefa.** Não incluir alterações de outros pacotes em eventual commit.

### Task 2: Conceder expiração estável e preservar legado

**Files:**
- Modify: `packages/referrals/src/application/redeem-scholarship/redeem-scholarship.service.ts`
- Modify: `packages/referrals/tests/application/redeem.test.ts`

**Interfaces:** `grantManualCourse` recebe `expiresAt = new Date(redemption.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000)` ou `null` para legado.

- [ ] **Step 1: Escrever casos de falha.** No teste de resgate, exigir prazo de 168 h no grant novo; simular resgate antigo com `accessDurationDays = null` e exigir `expiresAt: null`; falhar o primeiro grant, repetir após avanço do relógio e exigir o mesmo `expiresAt`; simular retry após o vencimento e exigir erro diagnosticável sem e-mail de boas-vindas.
- [ ] **Step 2: Rodar `bun test tests/application/redeem.test.ts` e confirmar os novos testes falhando.**
- [ ] **Step 3: Implementar a concessão.** Usar a data da linha, nunca `now()` do retry, para calcular o prazo. Antes do grant, se `now() >= expiresAt`, marcar o resgate como `failed` com razão `gift_window_elapsed`, não conceder nem enviar boas-vindas.
- [ ] **Step 4: Rodar a suíte de resgates, testes de gateway, typecheck e revisar idempotência.** O `deliveryId` existente permanece estável.

### Task 3: Comunicar o prazo sem prometer mudança a resgates antigos

**Files:**
- Modify: `packages/community-kids/src/app/perfis/ambassador-card.tsx`
- Modify: `packages/community-kids/tests/ambassador-copy.test.ts`
- Modify: `packages/funnel/src/pages/embaixador/[token].astro`
- Modify: `packages/funnel/src/pages/bolsa/[codigo].astro`
- Modify: `packages/funnel/src/islands/EmbaixadorPainel.tsx`
- Modify: `packages/funnel/src/islands/BolsaResgate.tsx`
- Modify: `packages/funnel/tests/unit/referral-gift-copy.test.tsx`
- Modify: `packages/messaging/scripts/seed-templates.ts`
- Modify: `packages/messaging/tests/referral-copy.test.ts`
- Modify: `packages/referrals/src/application/redeem-scholarship/redeem-scholarship.service.ts`
- Modify: `packages/referrals/tests/application/redeem.test.ts`

**Interfaces:** Novos resgates usam templates `referrals-scholarship-welcome-7d` (conta nova) e `referrals-scholarship-existing-7d` (conta já existente). Legados continuam usando `referrals-scholarship-welcome` e `new-access` para não receber uma promessa falsa durante retentativas de e-mail.

- [ ] **Step 1: Escrever testes de texto.** Exigir “7 dias” e “cadastro” nas três superfícies e no convite; exigir o título “Seja um embaixador do Sistema Zero” na área dos pais; exigir que o bônus por Pix permaneça. No serviço, exigir templates distintos por política nova/antiga.
- [ ] **Step 2: Rodar os testes específicos de copy e resgate e confirmar falhas esperadas.**
- [ ] **Step 3: Atualizar páginas e mensagens.** Usar “Para novos resgates, o acesso a este curso dura 7 dias a partir do cadastro pelo link” na oferta, uma frase curta equivalente no formulário e o aviso ao embaixador antes de compartilhar. Manter a garantia do bônus em frase separada.
- [ ] **Step 4: Adicionar templates específicos para as duas situações de conta nova e existente, com aviso de que redefinir senha não reinicia o prazo.** Manter templates antigos para resgates legados. Atualizar o convite para avisar o prazo antes do cadastro.
- [ ] **Step 5: Rodar testes, typecheck e formatador dos pacotes alterados.**

### Task 4: Revisão e verificação final

**Files:** todos os arquivos alterados nas tarefas 1–3; nenhuma mudança em `packages/members` necessária se a checagem existente cobrir `expiresAt`.

**Interfaces:** O acesso no members considera uma concessão com `expiresAt <= now` inativa, mas não bloqueia uma assinatura ou concessão independente ativa.

- [ ] **Step 1: Verificar o contrato de acesso existente e executar os testes relevantes do members sem modificar as alterações concorrentes.**
- [ ] **Step 2: Rodar `bun test` e `bun run typecheck` em `packages/referrals`; rodar testes direcionados e typecheck nos pacotes de UI e messaging; rodar `git diff --check`.**
- [ ] **Step 3: Fazer revisão de regressão.** Conferir legados, retries, convite enviado antes da mudança e resgate depois dela, conta preexistente, expiração exata, textos e estado atual do worktree.
- [ ] **Step 4: Relatar o que foi verificado e o que depende de migração/seed/deploy.** Não alegar funcionamento no staging sem verificação real.
