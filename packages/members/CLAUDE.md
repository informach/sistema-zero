# CLAUDE.md — @sistemazero/members

Guia operacional para trabalhar neste package. Leia antes de editar.

## O que é

**Área de membros** (só back-end/API; um front-end único consome via api-gateway).
Dois bounded contexts no mesmo serviço: **acesso** (matrícula/entitlement — visão
materializada de "o que o aluno PODE acessar agora") e **conteúdo+progresso**
(cursos → módulos → aulas polimórficas/compostas + conclusão por aluno). Runtime:
**Bun**. Linguagem: **TS (ESM)**. Porta **3004**.

> Estado: **Fatia 1 feita e testada** (22 testes). Motor de acesso (grant/revoke
> por webhook + checagem) + consumo do aluno (meus cursos, curso, aula com blocos,
> marcar concluída, progresso). Migration `0000_vengeful_the_stranger` (cria o
> schema `members`). **NÃO** aplicada num Postgres real ainda. Conteúdo entra por seed.

## Conceito central (decisões travadas com o usuário)

1. **Entitlement = direito de acesso, GENÉRICO por tipo de produto** (`course |
   community | download | …`), separado do "o que comprou" (isso é do payments). É
   uma **tabela materializada** alimentada pelos eventos do payments. Padrão Stripe
   Entitlements + "pedido imutável" do e-commerce.
2. **Checagem de acesso = leitura LOCAL** (`status='active' AND (expiresAt IS NULL OR
   expiresAt > now)`). Sem chamar ninguém no caminho quente. Vitalício → `expiresAt`
   null; assinatura → `expiresAt` estendido a cada ciclo + carência.
3. **Snapshot congelado no grant**: resolve no catálogo o que a oferta dá direito e
   **grava** (offer/product/sku/fulfillment/courseRef) na matrícula. Mudar a oferta
   depois NÃO altera quem já comprou.
4. **Aluno = usuário do auth** (`userId` = `x-auth-user-id` injetado pelo gateway).
   Sem identidade duplicada.
5. **Convenção**: `entitlement.courseRef === course.slug` (e === `fulfillment.courseRef`
   do produto no catálogo). É o elo oferta→curso.
6. **Aula = lista ordenada de BLOCOS** (`lesson_blocks`, união discriminada por
   `kind`: rich_text/video/image/audio/quiz/embed). Aula composta (vídeo + interativo
   + texto) = vários blocos. Comunidade só modelada (feature é fatia seguinte).

## Arquitetura (DDD + Hexagonal — espelha auth/catalog)

```
src/
├── domain/           # núcleo puro
│   ├── shared/          # re-export de erros do core
│   ├── course/          # course (tipos de leitura) + lesson-block (união) + errors
│   ├── entitlement/     # entitlement.aggregate (máquina de estados) + status/snapshot/fulfillment/errors
│   ├── progress/        # computeProgress (puro)
│   └── ports/           # entitlement/course/progress/processed-webhook repos + catalog-gateway
├── application/      # grant/revoke-entitlement, access/check-access, list-my-courses,
│   │                 #   get-my-course, get-lesson, mark-lesson-complete, get-course-progress
│   └── mappers/         # views.ts (DTOs de saída + Date→ISO)
├── infrastructure/
│   ├── config/env       # Zod fail-fast
│   ├── persistence/drizzle/  # schema (pgSchema('members')), db, repos, migrations
│   └── gateways/        # catalog-http.gateway (resolve /catalog/offers/:slug/entitlements)
├── interfaces/http/  # server, routes/{members(aluno),webhooks(grant/subscription),health}, dtos (TypeBox), auth, webhook-auth, error-handler, raw-body
├── composition-root.ts  # injeção de dependências (ÚNICA) — async
└── index.ts             # loadEnv → createApplication → start (+ sinais)
scripts/seed-course.ts   # curso publicado (aula composta + quiz + anexo); --grant-user concede matrícula de teste
```

## Comandos (de dentro de `packages/members`)

| Comando | O quê |
|---------|-------|
| `bun run dev` / `start` | servidor (watch / produção), porta **3004** |
| `bun run typecheck` | `tsc --noEmit` |
| `bun test` | testes (rode com **sandbox off** — gotcha do monorepo) |
| `bun run db:generate` / `db:migrate` | migrations (Drizzle) |
| `bun run db:seed [--slug <s>] [--grant-user <userId>]` | popula curso (idempotente) + matrícula de teste |
| `bun run check` / `check:fix` | Biome |

**Sempre** rode `typecheck` + `bun test` + `check` antes de concluir.

## Fluxo de integração (como o acesso é concedido)

```
COMPRA: payments emite payment.paid → gateway → funil /api/webhooks/payments
  funil: markPaid → registra comprador no auth (obtém userId) → DEPOIS chama:
  funil → gateway POST /members/webhooks/grant (HMAC borda 'funnel' + resign 'gateway')
          { userId, offerRef, paymentId, paidAt, subscription? }
  members: resolve snapshot no catálogo (offerRef) → upsert matrícula(s)

ACESSO: browser logado → Bearer JWT → gateway (injeta x-auth-user-id) → members
        lê matrícula local (status + validade)

ASSINATURA cancelada/expirada → funil → POST /members/webhooks/subscription { subscriptionId }
        members acha as próprias matrículas por subscriptionId e revoga/expira.
```

- **Webhooks de entrada** verificam HMAC sobre o corpo BRUTO com `GATEWAY_HMAC_SECRET`
  (= segredo de resign do gateway), header `x-signature: t=,v1=`. Dedupe por
  `x-delivery-id` (tabela `processed_webhooks`). Falha de concessão → o funil devolve
  502 e o gateway re-entrega (members é idempotente pela `idempotencyKey`).
- **Catálogo** é chamado DIRETO (S2S, `CATALOG_BASE_URL`), fora do caminho quente — a
  rota de entitlements é pública de leitura.

## Convenções

- `verbatimModuleSyntax: true` → `import type` para tipos. Imports relativos sem extensão.
- **Não anote** `: Elysia` no retorno das factories de rota.
- Erros de domínio estendem `DomainError` (do core); mapeamento → HTTP no `error-handler`
  (ACCESS_DENIED→403, COURSE/LESSON_NOT_FOUND→404, VALIDATION_ERROR→400).
- DTOs de entrada (webhooks) em **TypeBox**. Saída via mappers (`Date`→ISO).
- Concorrência otimista na matrícula (`version` + `UPDATE … WHERE version = ?`).
- **Sem FK cross-schema**: `user_id`/`product_id`/`offer_id`/`subscription_id` são snapshots.

## Banco (schema `members`)

1 Postgres compartilhado (`sistemazero`, Docker porta **5433**), schema próprio via
`pgSchema('members')` + `schemaFilter:['members']`. **Journal próprio**
(`migrations: { table: 'members_migrations' }`) — NÃO compartilhe `__drizzle_migrations`
entre pacotes (a dedupe por `created_at` pularia migrations). A migration faz
`CREATE SCHEMA "members"`. Tabelas: `courses`, `modules`, `lessons`, `lesson_blocks`,
`lesson_attachments`, `entitlements`, `lesson_completions`, `processed_webhooks`.

## Pendente (fatias seguintes)

- Admin de autoria (CRUD de cursos/módulos/aulas) — hoje conteúdo é por seed.
- Feature de comunidade (fórum/feed) — hoje só modelada como kind/accessType.
- Concessão p/ comprador RECORRENTE (auth 409 não devolve userId; precisa lookup por e-mail).
- Drip/`fulfillment.release`; "acesso até o fim do período" no cancelamento (hoje corta na hora).
- `course_progress` materializado; fan-out direto payments→members (hoje passa pelo funil).
- Aplicar a migration num Postgres real + e2e ponta-a-ponta.

## Checklist antes de finalizar

- [ ] `bun run typecheck` limpo · `bun test` verde (sandbox off) · `bun run check` limpo.
- [ ] Sem `any` novo fora de testes; entradas validadas (TypeBox/Zod).
- [ ] Mudou schema? Gerou a migration (`db:generate`) e commitou.
- [ ] Mudou contrato de rota/webhook/config? Atualizou este `CLAUDE.md`.
