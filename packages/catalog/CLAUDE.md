# CLAUDE.md — @sistemazero/catalog

> **⚠️ Antes de QUALQUER mudança, consulte a doc ATUALIZADA via MCP do Context7**
> (`resolve-library-id` → `query-docs`) para toda lib/framework/API/CLI (Elysia, Drizzle, Zod, jose,
> Bun, etc.) — não confie só na memória; APIs mudam. Para **pesquisa, exploração e entender padrões**,
> use o **MCP do Octocode** em repositórios GitHub relevantes. Faça certo e atualizado — não "de cabeça".

Guia operacional para trabalhar neste package. Leia antes de editar.

## O que é

**Serviço de catálogo**: a **fonte da verdade comercial e de fulfillment** do monorepo. Cadastra
**produtos**, **combos** e **ofertas**, e **resolve entitlements** (dado uma oferta, o conjunto exato de
produtos entregáveis). É consumido pelo **funil** (preço + "o que está incluído") e pela
**área de membros** (resolve, no grant, exatamente o que a oferta incluía). Runtime: **Bun**. Linguagem: **TS (ESM)**.

> Estado: **slice completo e testado** (produtos/combos/ofertas + cupons + leitura pública +
> escrita admin + resolução de entitlements). Migrations `0000`/`0001` aplicadas no Postgres
> compartilhado (cria o **schema `catalog`**). Seed do produto atual (No Comando da IA, R$37) disponível.

## Modelo (decisões de design — leia antes de mexer)

Validado contra Hotmart, Kiwify, Teachable, Thinkific, Kajabi, Gumroad, Podia (+ Stripe). Princípios:

1. **Produto ≠ Preço.** O `Product` é o entregável/conteúdo e **NÃO guarda preço**. O preço vive na `Offer`.
2. **1 Produto → N Ofertas.** Cada oferta tem seu próprio `slug`/`code` (link).
3. **Combo é um produto** (`kind: 'bundle'`) que inclui outros via `product_components`, um deles
   `is_primary` (o "principal" destacado na venda). Comprar o combo espalha o acesso para os filhos.
4. **NÃO existe "bônus" como entidade.** O que seria bônus-produto entra no **combo**; material extra que
   varia por oferta entra no que a **oferta concede** (`offer_items`). "BÔNUS" é só rótulo de copy no funil.
5. **`sellable=false`** = material entregue só dentro de combo/oferta (nunca vendido sozinho).
6. **Entitlement = registro durável por produto, desacoplado da cobrança** (insight Kajabi: revogar acesso ≠
   parar cobrança; apagar oferta ≠ revogar acesso). Hoje o catálogo resolve só a **definição** de acesso
   (`resolve-entitlements`); os **grants por usuário** (tabela `entitlement_grants`) virão com a área de
   membros — o modelo já está preparado.

### Resolução de entitlements (`domain/services/resolve-entitlements.ts`)
Função PURA: dado a oferta (produto principal + `offer_items`), expande combos → folhas entregáveis,
deduplica e marca o principal. Combos são **containers** (expandem, não são entregues). Guarda de ciclo +
profundidade máxima. A aplicação (`ResolveOfferEntitlementsService`) carrega o fechamento do grafo
(`findNodesByIds`, iterativo) e chama o resolvedor.

## Arquitetura (DDD + Hexagonal — espelha `auth`/`payments`)

```
src/
├── domain/           # núcleo puro (SEM framework)
│   ├── shared/          # AggregateRoot, Entity, ValueObject, DomainEvent, errors/result (re-export core), concurrency
│   ├── product/         # product.aggregate (+ kind/status/fulfillment/events/errors)
│   ├── offer/           # offer.aggregate (+ status/pricing-mode/events/errors)
│   ├── coupon/          # coupon.aggregate (+ type/status/events/errors) — desconto na oferta
│   ├── value-objects/   # money (centavos), slug, sku, coupon-code
│   ├── services/        # resolve-entitlements (puro)
│   └── ports/           # product-repository, offer-repository, coupon-repository
├── application/      # casos de uso: create/update product+offer+coupon, get-offer/-product,
│   │                 #   resolve-offer-entitlements, quote-offer (cupom), redeem-coupon
│   └── mappers/         # product-view, offer-view, entitlement-view, coupon-view, quote-view
├── infrastructure/
│   ├── config/env       # Zod fail-fast
│   └── persistence/drizzle/  # schema (products, product_components, offers, offer_items, coupons,
│                             #   coupon_offers), db, repositórios, migrations
├── interfaces/http/  # Elysia: server, routes/{catalog(público),admin(escrita),health}, dtos (TypeBox), auth (X-Auth-*), error-handler
├── composition-root.ts  # injeção de dependências (ÚNICO lugar que instancia adapters) — SÍNCRONA
└── index.ts             # loadEnv → createApplication → start (+ sinais)
```

## Comandos (de dentro de `packages/catalog`)

| Comando | O quê |
|---------|-------|
| `bun run dev` / `start` | servidor (watch / produção), porta **3003** |
| `bun run typecheck` | `tsc --noEmit` |
| `bun test` | testes (rode com **sandbox off** — gotcha do monorepo) |
| `bun run db:generate` / `db:migrate` | migrations (Drizzle) |
| `bun run db:seed` | popula o produto + oferta atuais (idempotente) |
| `bun run check` / `check:fix` | Biome |

**Sempre** rode `typecheck` + `bun test` + `check` antes de concluir.

## HTTP

**Leitura (pública via gateway — dados de marketing):**
- `GET /catalog/offers/:slug` → preço, condições, garantia + `includes` (itens resolvidos, com `isPrimary`).
  O `includes` é **labels-only** (`EntitlementItemView`, SEM `fulfillment`) — seguro p/ exibição pública.
- `GET /catalog/products/:slug` → detalhe do produto.

**Leitura interna (S2S, NÃO exposta no gateway):**
- `GET /catalog/offers/:slug/entitlements` → definição de acesso completa, **com `fulfillment`**
  (asset url/ref, courseRef). Consumida pela **área de membros** direto na rede interna (`CATALOG_URL`),
  no momento do grant. NÃO tem rota pública no gateway (evita vazar o manifesto de entrega à internet).
- `POST /catalog/offers/:slug/quote` → preço com cupom opcional (`{ couponCode? }` → preço/desconto/total).
  Público + rate-limit por IP; é o valor AUTORITATIVO que o funil cobra. **Só cota oferta disponível**
  (`isAvailable()`: status `active` + dentro da janela) — pausar/arquivar interrompe a venda
  (`OFFER_NOT_AVAILABLE`→409). A resolução de entitlements (pós-pagamento) NÃO é gated por isso.

**Cupons:** desconto (percentual ou fixo) sobre o preço da oferta, com escopo (todas/ofertas específicas),
validade, mínimo e limite de usos. `POST/PATCH /catalog/coupons` (admin). `POST /catalog/coupons/:code/redeem`
(HMAC do funil) registra um uso ATÔMICO na confirmação do pagamento. O funil consome: `quote` no checkout
(valor final) + `redeem` na confirmação; cobra o final no payments e passa `metadata.offerId`/`couponCode`.

**Escrita (admin):** `POST/PATCH /catalog/products` e `/catalog/offers`. O RBAC real é do **gateway**
(JWT + `authorize.roles: [superadmin,admin,staff]`); o serviço confere os headers `X-Auth-User-Role`/
`X-Auth-User-Status` (anti-spoof, injetados pelo gateway) como **defesa em profundidade** (`REQUIRE_ADMIN`).

**Leitura admin (listagens paginadas — painel `@sistemazero/admin`):** `GET /catalog/admin/{products,offers,coupons}`
(`?q&status&limit&offset`; offers aceita `?productId`) + `GET /catalog/admin/products/:id` (GET-one da página
de edição do painel — `ProductView` completa com `fulfillment`/`components`; non-UUID → 404 direto). Mesmo
gating (JWT+RBAC no gateway, `requireAdmin` defesa em profundidade). Caminho `/catalog/admin/*` é **distinto**
das leituras públicas `/:slug` p/ gating inequívoco no gateway. Serviços `List{Products,Offers,Coupons}Service`;
repos ganharam `list(query)` (batch dos filhos p/ evitar N+1). Ofertas listadas trazem o nome do produto
principal (sem resolver entitlements) **e os `items` crus** (extras/bônus — o painel precisa deles p/ editar
sem apagar, já que o PATCH substitui a coleção inteira).

DTOs em **TypeBox**; erros de domínio → status no `error-handler` (PRODUCT_NOT_FOUND→404,
DUPLICATE_*→409, CONCURRENCY_CONFLICT→409, INVALID_STATE_TRANSITION→409, OFFER_NOT_AVAILABLE→409,
COUPON_NOT_APPLICABLE/COUPON_EXHAUSTED→422, VALIDATION_ERROR→400).

## Integração com o gateway

Rotas em `packages/api-gateway/gateway.config.ts` (serviço `catalog`, `CATALOG_URL`). As rotas de escrita
(produtos/ofertas/cupons) usam `auth: jwt` → o gateway **exige JWT configurado** (`JWT_HS256_SECRET` OU
`JWT_JWKS_URL`). Leituras (`offers/:slug`, `products/:slug`) + `quote` são `auth: 'public'` + rate limit
por IP. `redeem` usa `auth: hmac` (consumer `funnel`). **`offers/:slug/entitlements` NÃO tem rota no
gateway** (devolve `fulfillment`; só a área de membros consome, S2S interno). O `:slug`/`:id` no gateway
é só placeholder de match — o path real é repassado intacto.

## Convenções

- `verbatimModuleSyntax: true` → `import type` para tipos. Imports relativos sem extensão.
- **Não anote** `: Elysia` no retorno das factories de rota.
- Dinheiro **sempre em centavos** (inteiro). `Money` (VO) valida.
- Concorrência otimista: `version` + `UPDATE ... WHERE version = ?` nos repositórios → 0 linhas =
  `ConcurrencyConflictError`.

## Banco (schema `catalog`)

1 Postgres compartilhado (`sistemazero`, Docker porta **5433**), schema próprio via `pgSchema('catalog')` +
`schemaFilter:['catalog']`. Tabelas: `products`, `product_components` (auto-referencial), `offers`,
`offer_items`, `coupons`, `coupon_offers`. **Journal próprio** (`migrations: { table: 'catalog_migrations' }`)
— NÃO compartilhe `__drizzle_migrations` entre pacotes (dedupe por `created_at` pularia migrations). A
migration faz `CREATE SCHEMA "catalog"`.

## Pontos em aberto (futuro)

`entitlement_grants` (acesso por usuário, materializado na confirmação do pagamento — área de membros) ·
drip/duração de acesso · order bumps/upsells · UI de cadastro de produtos/ofertas/cupons ·
**ledger de resgates de cupom** (`coupon_redemptions`, chave única por pagamento/lead): hoje
`max_redemptions` é **teto MOLE** — o desconto é aplicado na cobrança (`quote`) e contado só na
confirmação (`redeem`, best-effort, sem idempotência própria), então sob concorrência os descontos
concedidos podem passar do limite e o contador pode sub-contar (erro engolido). O ledger daria
garantia dura + idempotência. Mitigado hoje pelo gate exactly-once (`markPaid`) do funil.

> O **funil já consome** o catálogo (preço/inclusões via gateway, `metadata.offerId`/`couponCode` no
> checkout, `quote`/`redeem` de cupom). A contagem de uso do cupom (`redeem`) é **best-effort** na
> confirmação (o desconto já foi aplicado na cobrança autoritativa) — `max_redemptions` é teto MOLE
> (ver "Pontos em aberto"). A `quote` é o gate de cobrança: só cota oferta **disponível**.

## Checklist antes de finalizar

- [ ] `bun run typecheck` limpo · `bun test` verde (sandbox off) · `bun run check` limpo.
- [ ] Sem `any` novo; entradas validadas (Zod/TypeBox).
- [ ] Mudou schema? Gerou a migration (`db:generate`) e commitou.
- [ ] Mudou contrato de rota/config/modelo? Atualizou este `CLAUDE.md`.
