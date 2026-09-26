# Assinatura com Mural visitante Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pagamentos confirmados de assinaturas com Mural completo também concedem Mural visitante permanente, preservado após cancelamento ou expiração.

**Architecture:** O grant pago continua resolvendo os itens da oferta e criando/extendo os entitlements da assinatura. Depois, concede o mesmo produto sintético de visitante usado pelo Desafio de 30 dias, com chave idempotente por assinatura e sem `subscriptionId` revogável. O Hub continua usando os direitos existentes para diferenciar leitura e interação.

**Tech Stack:** Bun, TypeScript, `bun:test`, Members entitlement aggregate e repositório existentes.

**Spec:** `docs/plans/2026-09-26-assinatura-mural-visitante-design.md`

## Global Constraints

- Só assinaturas cuja oferta resolvida contenha Mural pleno (`kind: community`, `fulfillment.accessType: community`, `courseRef: mural-dos-criadores`) recebem o direito.
- O visitante tem `expiresAt: null`, `subscriptionId: null`, snapshot vitalício e procedência do pagamento.
- Renovação e reentrega da mesma assinatura não duplicam o visitante; falha parcial faz o webhook tentar novamente.
- A oferta Desafio de 30 dias e as mudanças concorrentes em aulas, Core, Help e interface permanecem intactas.

---

### Task 1: Concessão independente por assinatura

**Files:**
- Modify: `packages/members/src/application/grant-entitlement/grant-entitlement.service.ts`
- Test: `packages/members/tests/application/grant.test.ts`

**Interfaces:**
- Consumes: `GrantEntitlementCommand.subscription`, `ResolvedOffer.items`, `createMuralVisitorSnapshot`, `EntitlementAggregate.grant`.
- Produces: matrícula de visitante com `idempotencyKey = subscription-visitor:${subscriptionId}:${MURAL_VISITOR_PRODUCT_ID}` e `sourceId = paymentId`.

- [ ] **Step 1: Write the failing tests**

Em `grant.test.ts`, use `offerWithMural('comunidade-dos-criadores-mensal')` e `subscription:{subscriptionId:'sub1',intervalMonths:1}`. Verifique três matrículas: curso + Mural pleno vinculados a `sub1` e visitante sem vínculo, sem validade, snapshot lifetime e fonte de pagamento. Renove com `paymentId:'pay2'`: a validade dos dois itens avança, o visitante continua uma única linha. Cancele e expire a assinatura em casos separados: só o visitante fica ativo. Teste assinatura sem item do Mural e falha inicial do `save` do visitante seguida de reentrega.

- [ ] **Step 2: Run red tests**

Run: `bun test packages/members/tests/application/grant.test.ts`

Expected: os novos testes falham por ausência do visitante na assinatura.

- [ ] **Step 3: Implement one shared permanent visitor grant**

No grant service, extraia a concessão sintética para um método que recebe `sourceKind`, `sourceId` e `idempotencyKey`, cria o snapshot via `createMuralVisitorSnapshot` e salva com `subscriptionId:null`/`expiresAt:null`. Use fonte `payment` e ID do pagamento para ambas as compras; para assinatura, idempotência por `subscriptionId`. Execute esse método após os itens normais quando `accessPolicy.mode === 'billing_cycle'`, há `cmd.subscription` e a oferta contém o item Mural pleno. Preserve a regra específica do Desafio de 30 dias chamando o mesmo método com a chave de pagamento existente.

```ts
const idempotencyKey = `subscription-visitor:${cmd.subscription.subscriptionId}:${MURAL_VISITOR_PRODUCT_ID}`
const entitlement = EntitlementAggregate.grant({
  id: this.deps.newId(), userId: cmd.userId, productId: MURAL_VISITOR_PRODUCT_ID,
  productKind: 'community', accessType: 'community', courseRef: MURAL_VISITOR_REF,
  offerId: offer.offerId, snapshot, sourceKind: 'payment', sourceId: cmd.paymentId,
  subscriptionId: null, grantedAt: cmd.grantedAt, expiresAt: null, idempotencyKey,
})
```

- [ ] **Step 4: Run green tests**

Run: `bun test packages/members/tests/application/grant.test.ts`

Expected: todos passam.

### Task 2: Contrato HTTP e manual

**Files:**
- Test: `packages/members/tests/integration/http.test.ts`
- Modify: `docs/catalogo-e-entitlements.md`

**Interfaces:**
- Consumes: Task 1, webhook `/members/webhooks/grant`, `AccessCheckService` existente.
- Produces: prova do fluxo HTTP e instrução operacional para assinaturas com Mural.

- [ ] **Step 1: Add the HTTP regression test**

Use o webhook assinado de `http.test.ts` com oferta de assinatura contendo Mural pleno, `accessPolicy:{mode:'billing_cycle',durationValue:null,durationUnit:null}` e `subscription:{subscriptionId:'sub-http',intervalMonths:1}`. Asserte resposta `granted:3`, três entitlements e visitante `subscriptionId:null`.

- [ ] **Step 2: Update the operational manual**

Em `docs/catalogo-e-entitlements.md`, explique que novas compras de assinatura com Mural concedem visitante permanente desde o primeiro pagamento, renovação não duplica, cancelamento retira o Mural completo e preserva o visitante. Registre que assinaturas anteriores exigem concessão retroativa separada.

- [ ] **Step 3: Verify scoped behavior**

Run: `bun test packages/members/tests/application/grant.test.ts packages/members/tests/integration/http.test.ts packages/members/tests/integration/access-check.test.ts packages/hub/tests/integration/access-read.test.ts`; `bun run --cwd packages/members typecheck`; `bunx biome check packages/members/src/application/grant-entitlement/grant-entitlement.service.ts packages/members/tests/application/grant.test.ts packages/members/tests/integration/http.test.ts`; `git diff --check` sobre os arquivos alterados.

Expected: testes do grant, HTTP, leitura e checagens estáticas passam. Se typecheck global falhar em arquivos concorrentes, relate os erros sem modificar os arquivos de outra sessão.

- [ ] **Step 4: Commit scoped files**

Stage apenas os três arquivos de código/teste e o manual desta tarefa. Commit: `feat(members): manter Mural visitante após assinatura`.
