# Desafio de 30 dias com Mural visitante Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compradores novos do Desafio de 30 dias conservam o Mural como visitantes após o fim do acesso completo.

**Architecture:** O grant da oferta continua aplicando a política comprada aos itens do catálogo. Uma regra específica da oferta de 30 dias acrescenta, no mesmo webhook, uma matrícula vitalícia de visitante; o controle de acesso existente combina a matrícula temporária completa com a permanente de visitante. O snapshot de visitante é compartilhado com as indicações para evitar diferenças de contrato.

**Tech Stack:** Bun, TypeScript, testes `bun:test`, entitlement aggregate e repositório existentes.

**Spec:** `docs/plans/2026-09-26-desafio-mural-visitante-design.md`

## Global Constraints

- A regra vale somente para a oferta resolvida `desafio-primeiro-jogo-30-dias`, com política explícita `fixed/30/days` e item de Mural completo.
- A oferta legada `desafio-primeiro-jogo` e outras ofertas permanecem sem este grant adicional.
- A matrícula de visitante é permanente, `sourceKind: 'payment'`, idempotente por pagamento e produto sintético; nenhuma migração ou job.
- Não adicionar ao commit as alterações concorrentes em aulas, Studio ou member-shell.

---

### Task 1: Grant permanente e idempotente

**Files:**
- Create: `packages/members/src/domain/entitlement/mural-visitor.ts`
- Modify: `packages/members/src/application/grant-manual-entitlement/grant-manual-entitlement.service.ts`
- Modify: `packages/members/src/application/grant-entitlement/grant-entitlement.service.ts`
- Test: `packages/members/tests/application/grant.test.ts`
- Test: `packages/members/tests/integration/http.test.ts`

**Interfaces:**
- Consumes: `EntitlementAggregate.grant`, `EntitlementRepository.save`, `ResolvedOffer`, `PurchasedAccessPolicy`.
- Produces: `MURAL_VISITOR_PRODUCT_ID`, `MURAL_VISITOR_REF` e `createMuralVisitorSnapshot(offerId: string, offerSlug: string, now: Date): EntitlementSnapshot` em `mural-visitor.ts`.

- [ ] **Step 1: Write the failing tests**

Use `offerWithCourse('desafio-primeiro-jogo-30-dias', 'desafio-primeiro-jogo')`, acrescente um `ResolvedOfferItem` de Mural com `kind:'community'` e `fulfillment:{accessType:'community',courseRef:'mural-dos-criadores'}`, e execute o grant com `accessPolicy:{mode:'fixed',durationValue:30,durationUnit:'days'}`. Asserte três matrículas: curso e Mural completo vencem exatamente 30 dias depois; visitante não vence e guarda snapshot vitalício. A 30 dias exatos, `AccessCheckService` deve retornar só a chave visitante. Reentrega do mesmo pagamento retorna `granted:0` e não cria linha. Simule `entitlements.save` falhando uma vez apenas no produto visitante, reexecute e confira três linhas.

- [ ] **Step 2: Run red tests**

Run: `bun test packages/members/tests/application/grant.test.ts`

Expected: os novos testes falham porque ainda não existe grant de visitante.

- [ ] **Step 3: Implement shared snapshot and conditional grant**

Em `mural-visitor.ts`, centralize as constantes atuais do grant manual e o snapshot comum:

```ts
export const MURAL_VISITOR_PRODUCT_ID = '00000000-0000-0000-0000-000000000002'
export const MURAL_VISITOR_REF = 'mural-dos-criadores-visitante'
export function createMuralVisitorSnapshot(offerId: string, offerSlug: string, now: Date): EntitlementSnapshot {
  return {
    offerId, offerSlug, productId: MURAL_VISITOR_PRODUCT_ID,
    sku: MURAL_VISITOR_REF, name: 'Visita ao Mural dos Criadores', kind: 'community',
    accessType: 'community', courseRef: MURAL_VISITOR_REF,
    fulfillment: { accessType: 'community', courseRef: MURAL_VISITOR_REF },
    resolvedAt: now.toISOString(),
    accessPolicy: { mode: 'lifetime', durationValue: null, durationUnit: null },
  }
}
```

No grant manual, reexporte as constantes para não quebrar consumidores e use `createMuralVisitorSnapshot('', '', now)`; no grant pago, após os itens, conceda o agregado visitante apenas se slug, política e item de Mural completo coincidirem. Use `idempotencyKey: payment:${cmd.paymentId}:${MURAL_VISITOR_PRODUCT_ID}` e `expiresAt:null`. Não o inclua em `itemsResolved`.

- [ ] **Step 4: Run green tests**

Run: `bun test packages/members/tests/application/grant.test.ts`

Expected: todos passam.

### Task 2: Documentação e regressão

**Files:**
- Modify: `docs/catalogo-e-entitlements.md`
- Modify: `packages/members/CLAUDE.md`
- Modify: `packages/catalog/CLAUDE.md`
- Modify: `packages/catalog/scripts/seed.ts` (comentário do contrato)
- Test: `packages/members/tests/application/grant.test.ts`
- Test: `packages/members/tests/integration/http.test.ts`

**Interfaces:**
- Consumes: contrato do Task 1.
- Produces: documentação operacional da oferta de 30 dias e sua exceção de visitante.

- [ ] **Step 1: Add negative regression tests**

Teste oferta histórica vitalícia, outra oferta fixa de 30 dias, evento sem política explícita e oferta de Desafio sem item Mural completo. Nenhuma deve ganhar matrícula visitante. Confirme que uma matrícula vitalícia existente de Mural completo não é encurtada pela compra temporária. Teste o webhook assinado com `paidAt` e política fixa para provar que as três matrículas chegam pela borda HTTP.

- [ ] **Step 2: Run focused tests**

Run: `bun test packages/members/tests/application/grant.test.ts`

Expected: todos passam.

- [ ] **Step 3: Update manuals**

No contrato comercial em `docs/catalogo-e-entitlements.md`, explicite curso + Mural pleno por 30 dias e visitante permanente depois, restrito à oferta indicada; alteração de prazo de outras ofertas não reproduz a regra. Em `packages/members/CLAUDE.md`, registre o grant extra, o produto sintético, a idempotência e a ausência de job de transição. Atualize o comentário do seed e `packages/catalog/CLAUDE.md` para não dizer que a entrega final das duas ofertas é idêntica.

- [ ] **Step 4: Run package verification**

Run: `bun run --cwd packages/members typecheck`; `bun run --cwd packages/members check`; `bun test packages/members/tests/application/grant.test.ts`; `bun run --cwd packages/members test`.

Expected: todos passam. Inspecione `git diff --check` e `git diff` dos arquivos do escopo antes do commit.

- [ ] **Step 5: Commit scoped files**

Stage somente os arquivos listados nestas tarefas. Commit: `feat(members): manter Mural visitante após Desafio de 30 dias`.
