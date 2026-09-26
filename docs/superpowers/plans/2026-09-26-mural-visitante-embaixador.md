# Mural de visitante do embaixador — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cada novo resgate concede sete dias do curso e visita permanente, sem interações, ao Mural; uma assinatura ativa soma o acesso completo.

**Architecture:** O referrals versiona o resgate e entrega duas matrículas idempotentes. O members persiste uma chave de comunidade exclusiva do visitante. O hub aceita essa chave somente em leitura e exige o acesso completo nas mutações do Mural; o Kids reflete as capacidades do servidor.

**Tech Stack:** Bun, TypeScript, Elysia, Drizzle/PostgreSQL, Next.js/Astro, Vitest/Bun test.

**Spec:** `docs/plans/2026-09-26-mural-visitante-embaixador-design.md`

## Global Constraints

- Curso: `cade-todo-mundo`, sete dias a partir do cadastro; nunca renovar no retry.
- Direito novo: somente resgates criados após a implantação; nenhuma alteração em linhas anteriores.
- Visitante: ver e jogar no `mural-dos-criadores`; sem comentar, reagir ou remixar.
- Assinatura ativa: acesso completo previsto no combo; após vencer, retorna à visita.
- Preservar as edições de outras sessões, especialmente em `packages/members`; stage somente arquivos/hunks próprios.

---

### Task 1: Conceder a chave permanente do visitante no members

**Files:**
- Modify: `packages/members/src/application/grant-manual-entitlement/grant-manual-entitlement.service.ts`
- Modify: `packages/members/src/interfaces/http/dtos.ts`
- Modify: `packages/members/src/interfaces/http/routes/webhooks.routes.ts`
- Test: `packages/members/tests/integration/grant-manual-webhook.test.ts`

**Interfaces:**
- Consumes: matrícula `community` existente e idempotência por `sourceId`.
- Produces: `mode: 'mural_visitor'` no `POST /members/webhooks/grant-manual`, `expiresAt: null`, `courseRef: 'mural-dos-criadores-visitante'`.

- [ ] **Step 1: Escrever testes de grant.** Em `grant-manual-webhook.test.ts`, criar caso que envia duas vezes `{mode:'mural_visitor', userId, sourceId:'scholarship:<id>', expiresAt:null}` com o mesmo `x-delivery-id`; conferir uma matrícula ativa com `accessType:'community'`, `courseRef:'mural-dos-criadores-visitante'` e `expiresAt:null`.
- [ ] **Step 2: Confirmar o vermelho.** Em members, rodar `bun test tests/integration/grant-manual-webhook.test.ts`; esperar rejeição do modo desconhecido.
- [ ] **Step 3: Implementar grant mínimo.** Acrescentar ao comando e DTO o modo fechado abaixo, com UUID sintético fixo diferente das chaves-mestra. Reusar `grantOne`; o webhook força `expiresAt:null` para esse modo e notifica o hub após persistir.

```ts
type MuralVisitorCommand = {
  mode: 'mural_visitor'
  userId: string
  sourceId: string
}
const MURAL_VISITOR_REF = 'mural-dos-criadores-visitante'
const MURAL_VISITOR_PRODUCT_ID = '00000000-0000-0000-0000-000000000002'
```
- [ ] **Step 4: Verificar.** Rodar testes direcionados, `bun run typecheck` e `bun run check` em members; conferir diff para não incorporar alterações de outra sessão.
- [ ] **Step 5: Commit seletivo.** Incluir apenas os hunks próprios quando o arquivo já estiver editado por outra sessão; não usar `git add .`.

### Task 2: Versionar e entregar os dois direitos no referrals

**Files:**
- Modify: `packages/referrals/src/infrastructure/persistence/drizzle/schema.ts`
- Generate: migration e journal em `packages/referrals/src/infrastructure/persistence/drizzle/migrations/`
- Modify: `packages/referrals/src/domain/ports/referral-repository.port.ts`
- Modify: `packages/referrals/src/infrastructure/persistence/drizzle/referral.repository.ts`
- Modify: `packages/referrals/src/domain/ports/gateway.port.ts`
- Modify: `packages/referrals/src/infrastructure/gateways/gateway.client.ts`
- Modify: `packages/referrals/src/application/redeem-scholarship/redeem-scholarship.service.ts`
- Test: `packages/referrals/tests/application/redeem.test.ts`, `packages/referrals/tests/db/referral-repository.test.ts`, `packages/referrals/tests/unit/gateway-client.test.ts`

**Interfaces:**
- Consumes: webhook `mode:'mural_visitor'` da Task 1.
- Produces: campos nulos em linhas antigas `mural_visitor_policy` e `mural_visitor_granted_at`; novos inserts gravam política ativa; `grantMuralVisitor({userId,sourceId,deliveryId})`.

- [ ] **Step 1: Escrever testes de fluxo.** Novo resgate deve chamar `grantManualCourse` com prazo e `grantMuralVisitor` sem prazo antes de confirmar/e-mail; replay não duplica; linha histórica (`muralVisitorPolicy:null`) não chama novo grant; falha na segunda concessão deixa a etapa pendente e retry a retoma. Fixar as chaves esperadas:

```ts
expect(visitorGrant).toMatchObject({
  sourceId: `scholarship:${redemptionId}`,
  deliveryId: `scholarship:mural-visitor:${redemptionId}`,
})
```
- [ ] **Step 2: Confirmar o vermelho.** Rodar `bun test tests/application/redeem.test.ts tests/unit/gateway-client.test.ts` em referrals.
- [ ] **Step 3: Adicionar persistência forward-only.** Campos novos nullable sem default/backfill; `insertRedemption` grava `muralVisitorPolicy:'visitor'`; mapper preserva nulos históricos; método `markMuralVisitorGranted(id, when)` persiste a etapa. Gerar migration com `bun run db:generate` e conferir SQL/journal.

```ts
muralVisitorPolicy: varchar({ length: 16 }),
muralVisitorGrantedAt: timestamp({ withTimezone: true }),
```
- [ ] **Step 4: Adicionar client S2S e orquestração.** O client envia o payload abaixo. No serviço, conceder curso e depois visitante se a política exigir; só concluir e enviar e-mail após ambas as etapas. Manter status e diagnóstico de falhas coerentes com o grant do curso.

```ts
const deliveryId = `scholarship:mural-visitor:${redemption.id}`
const body = { mode: 'mural_visitor', userId, sourceId: `scholarship:${redemption.id}` }
```
- [ ] **Step 5: Verificar e commit seletivo.** Testes direcionados e suite completa, `bun run typecheck`, `bun run check`; conferir migration e somente arquivos próprios no commit.

### Task 3: Separar leitura e interação do Mural no hub

**Files:**
- Modify: `packages/hub/src/application/access/access-resolution.service.ts`
- Modify: `packages/hub/src/application/mappers/views.ts`
- Modify: `packages/hub/src/application/read-community/read-community.service.ts`
- Modify: `packages/hub/src/application/threads/thread.service.ts`
- Modify: `packages/hub/src/application/reactions/reaction.service.ts`
- Test: `packages/hub/tests/integration/access-read.test.ts`, `packages/hub/tests/integration/threads.test.ts`, `packages/hub/tests/integration/reactions.test.ts`

**Interfaces:**
- Consumes: comunidade ativa `mural-dos-criadores-visitante` do members.
- Produces: `SpacePublicView.canInteract`; leitura do Mural com chave completa OU visitante, `canInteractChannel` com chave completa, sem mudança para outros espaços.

- [ ] **Step 1: Escrever matriz de testes.** Visitante lê espaço/canal/tópico e joga; API recusa comentário e reação com 403; acesso completo pode interagir; assinatura expirada com visitante volta a somente leitura; outros espaços mantêm a regra anterior.
- [ ] **Step 2: Confirmar o vermelho.** Em hub, rodar `bun test tests/integration/access-read.test.ts tests/integration/threads.test.ts tests/integration/reactions.test.ts`.
- [ ] **Step 3: Implementar capacidade de leitura.** Na resolução de acesso, incluir a chave visitante somente ao avaliar o espaço `mural-dos-criadores`; nunca a tratar como chave completa. Expor `canInteract` no detalhe do espaço a partir da chave completa (ou staff), conservando `locked` para sem acesso.

```ts
const MURAL_SLUG = 'mural-dos-criadores'
const MURAL_VISITOR_REF = 'mural-dos-criadores-visitante'
// canAccessSpace(Mural) = fullAccess || owns(MURAL_VISITOR_REF)
// canInteractSpace(Mural) = fullAccess
```

- [ ] **Step 4: Aplicar gate em mutações.** Comentários e reações do Mural exigem `canInteractChannel`; tópicos seguem `staff_only`; preservar denúncia de conteúdo e leitura. Revisar edição de conteúdo próprio para não retirar direitos de exclusão/privacidade de usuários que antes eram assinantes.
- [ ] **Step 5: Verificar e commit seletivo.** Suite do hub, typecheck e check; revisar diff de autorização antes de commitar.

### Task 4: UI, comunicação e verificação integrada

**Files:**
- Modify: `packages/community-kids/src/app/(app)/mural-dos-criadores/page.tsx`
- Modify: `packages/community-kids/src/components/kids/kids-space-view-client.tsx`, `packages/community-kids/src/components/kids/kids-space-content.tsx`, `packages/community-kids/src/components/kids/kids-space-detail.tsx`
- Modify: `packages/community-kids/src/lib/types.ts`
- Modify: `packages/funnel/src/pages/embaixador/[token].astro`, `packages/funnel/src/pages/bolsa/[codigo].astro`, `packages/funnel/src/islands/BolsaResgate.tsx`, `packages/funnel/src/islands/EmbaixadorPainel.tsx`
- Modify: `packages/messaging/scripts/seed-templates.ts` e copy de convite/boas-vindas
- Test: `packages/community-kids/tests/kids-space-content.test.tsx`, `packages/funnel/tests/unit/referral-gift-page.test.ts`, `packages/funnel/tests/unit/referral-gift-copy.test.tsx`, testes dos templates em `packages/messaging/tests/unit/`

**Interfaces:**
- Consumes: `SpacePublicView.canInteract` da Task 3.
- Produces: UI de visitante apenas com leitura/player; copy separando sete dias do curso da visita contínua.

- [ ] **Step 1: Escrever testes de UI/copy.** Com `canInteract:false`, não mostrar comentários, reações nem remix; com `true` e Estúdio válido, manter ações. Testar as frases “7 dias a partir do cadastro” e “Mural para ver e jogar enquanto a conta existir” sem prometer assinatura.
- [ ] **Step 2: Confirmar o vermelho.** Rodar os testes direcionados de community-kids, funnel e messaging.
- [ ] **Step 3: Implementar UI e textos.** Consumir `canInteract` do hub; filtrar ações sem duplicar o gate de segurança. Atualizar páginas do presente, textos compartilháveis e templates novos; manter templates legados intactos.

```ts
const canInteract = space?.canInteract === true
const canRemix = canInteract && remixTier !== null
// No detalhe: canReply={canInteract && currentReplyPolicy}
// Nas reações: onReact={canInteract ? react : null}
```
- [ ] **Step 4: Verificação final.** Rodar testes completos, typecheck e check de referrals, members, hub, community-kids, funnel e messaging; `git diff --check`; revisar contrato entre os serviços e a matriz de direitos. Banco local ausente deve ser declarado, não tratado como teste aprovado.
- [ ] **Step 5: Commit seletivo e entrega.** Commit apenas as alterações desta funcionalidade; não incluir trabalho de outra sessão nem fazer push/deploy sem solicitação expressa neste turno.
