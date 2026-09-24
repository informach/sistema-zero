# Indicação de embaixadores para Cadê Todo Mundo? Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Execute inline; this workspace has unrelated edits that must remain untouched.

**Goal:** Fazer novos resgates de links de embaixador concederem apenas o curso Cadê Todo Mundo? e explicar o presente com clareza à família.

**Architecture:** O members expõe a disponibilidade do curso e amplia a concessão manual S2S para `mode:'course'`. O referrals consulta a disponibilidade antes de criar conta, concede o curso de forma idempotente e mantém os links e a atribuição existentes. O funil, as áreas de embaixador e os e-mails comunicam exatamente essa entrega.

**Tech Stack:** Bun, TypeScript, Elysia, Astro, React, Zod, TypeBox, Bun Test, PostgreSQL/Drizzle, Railway.

**Spec:** `docs/plans/2026-09-24-indicacao-embaixador-cade-todo-mundo-design.md`

## Global Constraints

- Curso: título `Cadê Todo Mundo?`, slug `cade-todo-mundo`, público kids de 8 a 15 anos.
- A indicação libera apenas este curso, sem oferta do Desafio, assinatura, Pinta ou Estúdio completo.
- Manter `/bolsa/<codigo>`, a política atual de um resgate por e-mail e os resgates já concluídos.
- Curso indisponível/rascunho: bloquear antes de claim/conta; falha S2S não vira sucesso nem link inválido.
- Não disparar WhatsApp frio; convite e boas-vindas são por e-mail.
- Conservar bônus de conversão e contratos de idempotência; não criar um motor de campanhas.
- Isolar commits dos arquivos modificados por esta tarefa; não incluir o trabalho já sujo do curso.
- Staging primeiro. Produção não muda; teste de resgate real espera o curso publicado.

## File map

| Área | Responsabilidade | Arquivos principais |
| --- | --- | --- |
| Members | disponibilidade e grant S2S de um curso publicado | `packages/members/src/application/grant-manual-entitlement/grant-manual-entitlement.service.ts`, `src/interfaces/http/dtos.ts`, `src/interfaces/http/routes/webhooks.routes.ts`, `tests/integration/grant-manual-webhook.test.ts` |
| Gateway | allowlist e re-assinatura da consulta S2S | `packages/api-gateway/gateway.config.ts`, `tests/unit/route-registry.test.ts` |
| Referrals | disponibilidade antes de claim, concessão do curso, e-mail correto | `packages/referrals/src/domain/ports/gateway.port.ts`, `src/infrastructure/gateways/gateway.client.ts`, `src/application/redeem-scholarship/redeem-scholarship.service.ts`, `src/interfaces/http/internal.routes.ts`, `src/infrastructure/config/env.ts`, `src/composition-root.ts`, testes equivalentes |
| Funil | landing e formulário coerentes com o presente | `packages/funnel/src/pages/bolsa/[codigo].astro`, `src/islands/BolsaResgate.tsx`, `src/server/referrals.ts`, testes de indicação/copy |
| Comunicação | convite, painel, admin, Kids e templates | `packages/funnel/src/pages/embaixador/[token].astro`, `src/islands/EmbaixadorPainel.tsx`, `packages/community-kids/src/app/perfis/ambassador-card.tsx`, `packages/admin/src/app/admin/embaixadores/embaixadores-client.tsx`, `packages/messaging/scripts/seed-templates.ts` |

---

### Task 1: Members e gateway aceitam presente de curso publicado

**Files:**
- Modify: `packages/members/src/application/grant-manual-entitlement/grant-manual-entitlement.service.ts`
- Modify: `packages/members/src/interfaces/http/dtos.ts`
- Modify: `packages/members/src/interfaces/http/routes/webhooks.routes.ts`
- Modify: `packages/members/tests/integration/grant-manual-webhook.test.ts`
- Modify: `packages/api-gateway/gateway.config.ts`
- Modify: `packages/api-gateway/tests/unit/route-registry.test.ts`
- Modify: `packages/members/CLAUDE.md`, `packages/api-gateway/CLAUDE.md` to reflect the new contract

**Interfaces:**
- Produces: `GET /members/webhooks/gift-course/:slug` → `{ available: boolean }`, HMAC + allowlist `referrals`.
- Produces: `POST /members/webhooks/grant-manual` body `{mode:'course',userId,courseRef,sourceId,expiresAt}`; a chamada S2S exige curso kids publicado, devolve `COURSE_UNAVAILABLE` se não estiver pronto.
- Preserves: admin `mode:'course'` behavior and existing S2S `mode:'offer'` callers.

- [ ] **Step 1: Write failing tests.** Extend the integration test with a `seedSampleCourse(courses, 'cade-todo-mundo', 'published', 'kids')` course. Assert that a signed availability GET returns `{available:true}`, draft/missing returns `{available:false}`, a course-only POST grants one entitlement with `courseRef:'cade-todo-mundo'`, `offerId:null` and `sourceId:'scholarship:red-1'`, and draft POST fails without marking delivery. Assert unsigned GET is 401. Extend route-registry test to assert the new gateway route requires HMAC consumer `referrals` and `resign`.
- [ ] **Step 2: Verify red.** Run `bun test tests/integration/grant-manual-webhook.test.ts` from `packages/members` and `bun test tests/unit/route-registry.test.ts` from `packages/api-gateway`; expect missing endpoint/course-mode failures.
- [ ] **Step 3: Implement the narrow contract.** Use a discriminated union DTO, keeping the existing offer shape:

  ```ts
  const GrantManualWebhookBody = t.Union([
    t.Object({ mode: t.Literal('offer'), userId: UUID, offerRef: t.String({ minLength: 1, maxLength: 200 }), sourceId: t.Optional(t.String({ minLength: 1, maxLength: 120 })), expiresAt: t.Optional(t.Union([t.String({ maxLength: 40 }), t.Null()])) }),
    t.Object({ mode: t.Literal('course'), userId: UUID, courseRef: t.String({ minLength: 1, maxLength: 200 }), sourceId: t.Optional(t.String({ minLength: 1, maxLength: 120 })), expiresAt: t.Optional(t.Union([t.String({ maxLength: 40 }), t.Null()])) }),
  ])
  ```

  Add `requirePublishedKids?: boolean` only to the course command. The S2S handler sets it to `true`; the admin path leaves it unset. The service checks `course.status === 'published' && course.audience === 'kids'` before saving, and exposes `isPublishedKidsCourse(slug): Promise<boolean>` for the signed GET. Map unavailable to an explicit non-success response; do not mark delivery or notify the hub. Register the GET gateway route next to `members-webhook-grant-manual` with the same HMAC/re-signing security profile.
- [ ] **Step 4: Verify green.** Rerun both focused tests and `bun run typecheck` in members and api-gateway.
- [ ] **Step 5: Commit only Task 1 files.** `git add -- <explicit Task 1 paths>`; inspect `git diff --cached --check` and the staged file list, then commit `feat: permitir presente de curso publicado por indicacao`.

### Task 2: Referrals troca a oferta pelo curso sem criar conta cedo

**Files:**
- Modify: `packages/referrals/src/domain/ports/gateway.port.ts`
- Modify: `packages/referrals/src/infrastructure/gateways/gateway.client.ts`
- Modify: `packages/referrals/src/application/redeem-scholarship/redeem-scholarship.service.ts`
- Modify: `packages/referrals/src/interfaces/http/internal.routes.ts`
- Modify: `packages/referrals/src/infrastructure/config/env.ts`
- Modify: `packages/referrals/src/composition-root.ts`
- Modify: `packages/referrals/tests/fakes/in-memory.ts`, `tests/application/redeem.test.ts`, `tests/integration/http.test.ts`, `tests/unit/gateway-client.test.ts`, `tests/unit/env.test.ts`
- Modify: `packages/referrals/CLAUDE.md`

**Interfaces:**
- Consumes: `GET /members/webhooks/gift-course/:slug` and S2S course grant from Task 1.
- Produces: `GET /referrals/internal/codes/:code` with `giftAvailable:boolean` for an active code; upstream failure remains a temporary error.
- Produces: `POST /referrals/internal/redemptions` with 503 `GIFT_UNAVAILABLE` before any claim/account while draft; other response statuses stay stable.

- [ ] **Step 1: Write failing tests.** In application tests, when `getGiftAvailability()` says unavailable, assert `ensureBuyer` and `insertRedemption` have zero calls. When ready, assert `grantManualCourse` receives `courseRef:'cade-todo-mundo'`, stable delivery/source IDs and no `offerRef`. Test a failed availability check as temporary error, and a 503 grant race as retryable/unavailable without welcome. In the real-client test, assert the exact signed GET path and `mode:'course'` JSON body. In HTTP test, assert `giftAvailable:false` and 503 on POST. Update env default assertion.
- [ ] **Step 2: Verify red.** Run the five focused test files with `bun test <path>` from `packages/referrals`; expect the old offer grant/old env assertions to fail.
- [ ] **Step 3: Implement the new port and flow.** Rename the grant input to `GrantManualCourseInput` and send `JSON.stringify({ mode:'course', userId, courseRef, sourceId, expiresAt })`. Add `getGiftAvailability(courseRef)` using signed `GET`; use `SCHOLARSHIP_COURSE_SLUG` with default `cade-todo-mundo` and pass `courseSlug` to the service. After active-code validation but before `insertRedemption`, call availability; `false` returns `gift_unavailable`, non-200 returns `upstream_error`. Expose the same check for the resolve-code route. Keep completed old redemptions unchanged; pending retries use the new course. Treat `COURSE_UNAVAILABLE` from grant as non-success without welcome. Preserve claim/lease/dedupe logic. The client request body and service guard should have these shapes:

  ```ts
  const rawBody = JSON.stringify({ mode: 'course', userId, courseRef, sourceId, expiresAt })
  const availability = await gateway.getGiftAvailability(this.opts.courseSlug)
  if (availability.status !== 200) return { kind: 'upstream_error' }
  if ((availability.body as { available?: unknown }).available !== true)
    return { kind: 'gift_unavailable' }
  ```
- [ ] **Step 4: Verify green.** Run focused tests, then `bun run typecheck`, `bun test` and `bun run check` in `packages/referrals`.
- [ ] **Step 5: Commit only Task 2 files.** Inspect staged paths and commit `feat: conceder Cade Todo Mundo por indicacao`.

### Task 3: Página de resgate vende o resultado real e respeita disponibilidade

**Files:**
- Modify: `packages/funnel/src/pages/bolsa/[codigo].astro`
- Modify: `packages/funnel/src/islands/BolsaResgate.tsx`
- Modify: `packages/funnel/src/server/referrals.ts`
- Modify: `packages/funnel/tests/unit/referrals-handlers.test.ts`
- Create: `packages/funnel/tests/unit/referral-gift-copy.test.ts`
- Modify: `packages/funnel/CLAUDE.md`

**Interfaces:**
- Consumes: `giftAvailable` from Task 2 and 503 `GIFT_UNAVAILABLE` on race.
- Preserves: route `/bolsa/<codigo>`, responsible-adult form, phone optional, existing invalid-link/error states.

- [ ] **Step 1: Write failing tests.** Assert the page contains `Cadê Todo Mundo?`, `Sistema Zero`, `Liberar o curso para minha família` and transparent course-only wording, but not `Desafio do Primeiro Jogo`, `5 dias` or `a partir de 9 anos`. Assert the server handler passes through 503 `GIFT_UNAVAILABLE` and the form maps it to a preparing message. Add a source or rendered-page check that unavailable gift hides the form.
- [ ] **Step 2: Verify red.** Run `bun test tests/unit/referrals-handlers.test.ts tests/unit/referral-gift-copy.test.ts` from `packages/funnel`.
- [ ] **Step 3: Implement the approved copy.** Use this hero verbatim: `Seu filho pode criar um jogo de procurar personagens.` Follow with the embaixador sentence in the spec. Explain what Sistema Zero is, the three-course-step result, age 8–15, how a parent claims without card, and that only this course is included. Render the form only when `giftAvailable === true`; otherwise show `Este presente está sendo preparado. Guarde seu link e volte em breve.` Keep gateway-down separate from invalid code. The submit button reads `Liberar o curso para minha família`; the success message names the course, not the Desafio. Pass through the new 503 status and map it to the same preparing text.

  ```astro
  {referrerName && giftAvailable ? (
    <BolsaResgate client:load code={codigo} referrerName={referrerName} />
  ) : referrerName ? (
    <p>Este presente está sendo preparado. Guarde seu link e volte em breve.</p>
  ) : null}
  ```
- [ ] **Step 4: Verify green.** Run both focused tests, `bun test`, `bun run typecheck`, `bun run check` in `packages/funnel`. Inspect mobile-width layout with an available preview if feasible.
- [ ] **Step 5: Commit only Task 3 files.** Inspect staged paths and commit `feat: explicar presente do curso na pagina de indicacao`.

### Task 4: Convites, áreas de embaixador e mensagens dizem a mesma coisa

**Files:**
- Modify: `packages/funnel/src/pages/embaixador/[token].astro`, `packages/funnel/src/islands/EmbaixadorPainel.tsx`
- Modify: `packages/community-kids/src/app/perfis/ambassador-card.tsx`
- Modify: `packages/admin/src/app/admin/embaixadores/embaixadores-client.tsx`
- Modify: `packages/messaging/scripts/seed-templates.ts`
- Preserve: `packages/referrals/src/application/redeem-scholarship/redeem-scholarship.service.ts` email keys for historical resends
- Add focused copy/template tests in the corresponding package test directories.
- Update `packages/messaging/CLAUDE.md` for template contract.

**Interfaces:**
- Consumes: completed course-only grant from Task 2.
- Produces: course-specific `referrals-ambassador-link` and `referrals-scholarship-invite`; course-neutral `referrals-scholarship-welcome` and `new-access` for historical resends and shared purchase flows.

- [ ] **Step 1: Write failing tests.** Verify that each ambassador surface names `Cadê Todo Mundo?`, and the share text says the child creates a game of finding characters, not a five-day Desafio. Verify invitation templates name the new course and both welcome paths remain course-neutral for historical resends. Search the target files for legacy promises as a regression check.
- [ ] **Step 2: Verify red.** Run focused tests in funnel, community-kids, admin, messaging and referrals.
- [ ] **Step 3: Implement copy and template changes.** Keep the embaixador bonus/conversion language unchanged. Invite names the new course and its concrete outcome. Welcome stays course-neutral because an old completed Desafio resgate can retry its email. Existing accounts keep the shared `new-access` template pointing to `/cursos`; remove the purchase assertion so it truthfully covers both purchase and indication. Do not imply that the family got every Community course or tool. Keep the no-WhatsApp-automation rule.
- [ ] **Step 4: Verify green.** Run `bun run typecheck`, `bun test`, `bun run check` in each touched package. Inspect rendered HTML email content; verify template variables match sender payloads.
- [ ] **Step 5: Commit only Task 4 files.** Inspect staged paths and commit `feat: alinhar comunicacao da indicacao ao novo curso`.

### Task 5: Revisão final e staging

**Files:** no new code except fixes found by review.

- [ ] **Step 1: Review the complete diff and run regression checks.** Check authorization of both S2S routes, no claim before availability, course-only entitlement, retry semantics, email truthfulness, existing links and residual legacy copy. Run all touched packages' tests/typechecks/checks, then the root verification commands relevant to the diff.
- [ ] **Step 2: Verify workspace boundaries.** `git status --short`; compare committed paths with the pre-existing dirty worktree. Do not stage unrelated course files or push production.
- [ ] **Step 3: Deploy to staging only after checks pass.** Push the verified staging commits when in-scope, trigger/observe the affected services and run the messaging template upsert in staging. Check public page and backstage with a valid code. The gift must show as preparing until the course is published; record that a real grant cannot yet be proven. After course publication, run a test-account end-to-end resgate and inspect the single course entitlement and e-mail.
