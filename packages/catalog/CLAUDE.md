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
> **2º full review 06/2026 com TODOS os achados implementados**: view pública de produto sanitizada +
> `draft` 404 público, `x-internal-token` (entitlements S2S + admin/escrita + redeem, obrigatório em
> prod), 23505 via `cause` (drizzle ≥0.44), escape do ILIKE, uuid nas bordas, `/readyz` + `HOST ::`,
> `REQUIRE_ADMIN` fail-closed em prod. **3º full review (prod-readiness, 06/2026) idem**: ciclo
> INDIRETO de combo barrado na ESCRITA, invariante `compareAt ≥ preço` revalidado no PATCH só de
> preço, janela `availableFrom/Until` validada (create+update), cupom que ZERA o preço → 422 na
> quote, micro-cache TTL das leituras públicas (`PUBLIC_CACHE_TTL_MS`), log próprio do S2S de
> entitlements — **102 testes**.

## Modelo (decisões de design — leia antes de mexer)

> 📖 A explicação CONCEITUAL (produto × oferta × matrícula, chave-mestra, as 3 formas de bônus)
> está em [`docs/catalogo-e-entitlements.md`](../../docs/catalogo-e-entitlements.md) — voltada ao
> OPERADOR do painel. **Mudou regra de negócio aqui? Atualize o manual também.**

Validado contra Hotmart, Kiwify, Teachable, Thinkific, Kajabi, Gumroad, Podia (+ Stripe). Princípios:

1. **Produto ≠ Preço.** O `Product` é o entregável/conteúdo e **NÃO guarda preço**. O preço vive na `Offer`.
2. **1 Produto → N Ofertas.** Cada oferta tem seu próprio `slug`/`code` (link).
3. **Combo é um produto** (`kind: 'bundle'`) que inclui outros via `product_components`, um deles
   `is_primary` (o "principal" destacado na venda). Comprar o combo espalha o acesso para os filhos.
4. **NÃO existe "bônus" como entidade.** O que seria bônus-produto entra no **combo**; material extra que
   varia por oferta entra no que a **oferta concede** (`offer_items`). "BÔNUS" é só rótulo de copy no funil.
5. **`sellable=false`** = material entregue só dentro de combo/oferta (nunca vendido sozinho).
6. **Entitlement = registro durável por produto, desacoplado da cobrança** (insight Kajabi: revogar acesso ≠
   parar cobrança; apagar oferta ≠ revogar acesso). O catálogo resolve a **definição** de acesso
   (`resolve-entitlements`); os **grants por usuário** são materializados pelo **members**
   (tabela `members.entitlements`, snapshot congelado + idempotência).
7. **Entrega EXCLUSIVAMENTE via área de membros** (decisão 06/2026, modelo Hotmart Club):
   `FulfillmentSpec.accessType` = `'course'` (um curso, `courseRef` = slug no members) ou
   `'all_courses'` (**chave-mestra** — todos os cursos publicados, atuais E futuros; sem courseRef).
   Os antigos `download`/`external`/`none` + `assets` foram REMOVIDOS do cadastro (entregas mortas —
   criavam acessos invisíveis ao aluno); e-book avulso = curso com bloco de livro 3D. Linhas legadas
   no JSONB carregam sem erro (o type descreve o que se ESCREVE). `community` (tiers) é fatia futura.
8. **Coerência de cadastro validada no domínio** (`ProductAggregate.assertCoherent()`): produto
   `active` não-bundle exige fulfillment (`course`+courseRef OU `all_courses`); `bundle` exige
   fulfillment null e, `active`, ≥1 componente; não-bundle não aceita components; `draft`/`archived`
   livres (cadastro progressivo). Chamada no `create()` e UMA vez no fim do `UpdateProductService`
   (estado consolidado — validar por setter falharia em estados intermediários); NUNCA no `restore()`
   (legado precisa carregar p/ ser corrigido). `kind='bundle'` é a fonte do CADASTRO; o resolvedor
   segue usando `components.length` como sinal de expansão.

### Resolução de entitlements (`domain/services/resolve-entitlements.ts`)
Função PURA: dado a oferta (produto principal + `offer_items`), expande combos → folhas entregáveis,
deduplica e marca o principal. Combos são **containers** (expandem, não são entregues). Guarda de ciclo +
profundidade máxima. A aplicação (`ResolveOfferEntitlementsService`) carrega o fechamento do grafo
(`findNodesByIds`, iterativo) e chama o resolvedor.

**Ciclo INDIRETO de combo é barrado na ESCRITA** (`assertNoComponentCycle`, chamado no
`UpdateProductService` quando `components` muda — no create é impossível, o id é recém-gerado):
a guarda do resolvedor é só de leitura e DESCARTA o caminho cíclico silenciosamente — um combo
A→B→…→A resolveria para **zero entregáveis** e a falha só apareceria no grant do members, DEPOIS
do pagamento. BFS pelos componentes armazenados; alcançar o próprio id = 400.

### Invariantes da oferta (06/2026)
- **`compareAt ≥ preço` sempre**: o PATCH que só sobe o preço REVALIDA contra o `compareAt`
  existente (sem isso, "de R$X por R$Y" invertia — precificação enganosa).
- **Janela coerente**: `availableUntil > availableFrom` validado no create E no `updateDetails`
  (estado consolidado) — janela invertida tornava a oferta indisponível sem nenhum erro.

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
  Oferta **`draft` é inexistente ao público (404)** — rascunho não vaza preço/campanha por adivinhação
  de slug; `paused`/`archived` seguem legíveis (página existente degrada; a `quote` bloqueia a cobrança).
  **Micro-cache TTL** nas leituras públicas por slug (oferta E produto; `MicroCache`,
  `infrastructure/cache/`): sem cache cada render da página de vendas custa 6–8 queries. TTL via
  `PUBLIC_CACHE_TTL_MS` (ausente → **30s em produção, 0 fora dela**); por réplica, FIFO com teto de
  entradas, cacheia misses (negative cache anti slug-spam). Staleness máxima pós-edição = o TTL.
  A `quote` **NUNCA** é cacheada.
- `GET /catalog/products/:slug` → detalhe do produto em **view PÚBLICA sanitizada**
  (`PublicProductView`: id/sku/slug/name/kind/status/sellable/description/currency — **SEM
  `fulfillment`/`metadata`/`components`/`version`**, que são da view admin); `draft` → 404. Achado do
  full review 06/2026: a rota pública devolvia a `ProductView` completa (vazava o manifesto de entrega).

**Leitura interna (S2S, NÃO exposta no gateway):**
- `GET /catalog/offers/:slug/entitlements` → definição de acesso completa, **com `fulfillment`**
  (asset url/ref, courseRef). Consumida pela **área de membros** direto na rede interna (`CATALOG_URL`),
  no momento do grant. NÃO tem rota pública no gateway (evita vazar o manifesto de entrega à internet)
  **e o serviço exige `x-internal-token`** (= `INTERNAL_API_TOKEN`; o members envia via
  `CATALOG_INTERNAL_TOKEN`) — sem o token, qualquer processo que alcançasse o catálogo direto leria
  o manifesto. Como essa chamada NÃO passa pelo gateway (sem access log lá), a rota emite log próprio
  (`catalog.entitlements_read`).
- `POST /catalog/offers/:slug/quote` → preço com cupom opcional (`{ couponCode? }` → preço/desconto/total).
  Público + rate-limit por IP; é o valor AUTORITATIVO que o funil cobra. **Só cota oferta disponível**
  (`isAvailable()`: status `active` + dentro da janela) — pausar/arquivar interrompe a venda
  (`OFFER_NOT_AVAILABLE`→409). A resolução de entitlements (pós-pagamento) NÃO é gated por isso.
  **Cupom que ZERA o preço → 422 `COUPON_NOT_APPLICABLE`** (cobrança de R$ 0,00 não existe — a Efí
  rejeita; melhor 422 legível do que o checkout quebrar na criação da cobrança).

**Cupons:** desconto (percentual ou fixo) sobre o preço da oferta, com escopo (todas/ofertas específicas),
validade, mínimo e limite de usos. `POST/PATCH /catalog/coupons` (admin). `POST /catalog/coupons/:code/redeem`
(HMAC do funil no gateway **+ `x-internal-token`** — sem a prova de origem, acesso direto queimaria contador)
registra um uso ATÔMICO na confirmação do pagamento. O funil consome: `quote` no checkout
(valor final) + `redeem` na confirmação; cobra o final no payments e passa `metadata.offerId`/`couponCode`.

**Escrita (admin):** `POST/PATCH /catalog/products` e `/catalog/offers`. O RBAC real é do **gateway**
(JWT + `authorize.roles: [superadmin,admin,staff]`); o serviço confere os headers `X-Auth-User-Role`/
`X-Auth-User-Status` (anti-spoof, injetados pelo gateway) como **defesa em profundidade** (`REQUIRE_ADMIN`,
**não desligável em produção** — boot falha) **e exige o `x-internal-token`** (header-inject do gateway,
06/2026): os `X-Auth-User-*` só são confiáveis se a chamada passou pelo gateway — sem o token, qualquer
processo que alcançasse o serviço direto forjaria um admin. `:id` dos `PATCH` valida **uuid** (non-UUID →
404 direto, não 22P02→500); ids referenciados nos DTOs (`productId`, `componentProductId`, `items[].productId`,
`offerIds`) validam uuid por pattern (→ 400 na borda).

**Leitura admin (listagens paginadas — painel `@sistemazero/admin`):** `GET /catalog/admin/{products,offers,coupons}`
(`?q&status&limit&offset`; offers aceita `?productId` — uuid validado na borda) + `GET /catalog/admin/products/:id`
(GET-one da página de edição do painel — `ProductView` completa com `fulfillment`/`components`; non-UUID → 404
direto). Mesmo gating da escrita (JWT+RBAC no gateway, `requireAdmin` + `x-internal-token` defesa em
profundidade). A busca `q` **escapa `%`/`_`/`\`** antes do ILIKE (literal, não padrão — `pg-errors.escapeLike`).
Caminho `/catalog/admin/*` é **distinto**
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
gateway** (devolve `fulfillment`; só a área de membros consome, S2S interno **enviando o
`x-internal-token`**). O `:slug`/`:id` no gateway é só placeholder de match — o path real é repassado
intacto. **`CATALOG_INTERNAL_TOKEN` no gateway** (06/2026): injeta `x-internal-token` (header-inject,
sobrescreve valor do cliente) nas rotas admin/escrita + `redeem` do catálogo — MESMO valor do
`INTERNAL_API_TOKEN` daqui (e do `CATALOG_INTERNAL_TOKEN` do members). Vazio em dev (injeção +
checagem desligadas); **obrigatório em produção** (o boot do catalog falha sem o token).

## Convenções

- `verbatimModuleSyntax: true` → `import type` para tipos. Imports relativos sem extensão.
- **Não anote** `: Elysia` no retorno das factories de rota.
- Dinheiro **sempre em centavos** (inteiro). `Money` (VO) valida.
- Concorrência otimista: `version` + `UPDATE ... WHERE version = ?` nos repositórios → 0 linhas =
  `ConcurrencyConflictError`.
- **⚠️ Gotcha do drizzle ≥ 0.44:** erros do driver chegam ENVELOPADOS em `DrizzleQueryError` — o
  `PostgresError` (com `code: '23505'`) fica em **`error.cause`**. Use o `isUniqueViolation` de
  `infrastructure/persistence/drizzle/pg-errors.ts` (caminha a cadeia de `cause`, com teto) em qualquer
  mapeamento novo de erro do Postgres; `escapeLike` (mesmo arquivo) para toda busca ILIKE.
- **Liveness/readiness**: `/health` (estático) + **`/readyz`** (probe `select 1`; 503 sem banco) —
  healthcheck do Railway aponta p/ `/readyz`. Bind **dual-stack `::`** (env `HOST`) — private networking
  do Railway é IPv6. Espelha o payments/members.

## Banco (schema `catalog`)

1 Postgres compartilhado (`sistemazero`, Docker porta **5433**), schema próprio via `pgSchema('catalog')` +
`schemaFilter:['catalog']`. Tabelas: `products`, `product_components` (auto-referencial), `offers`,
`offer_items`, `coupons`, `coupon_offers`. **Journal próprio** (`migrations: { table: 'catalog_migrations' }`)
— NÃO compartilhe `__drizzle_migrations` entre pacotes (dedupe por `created_at` pularia migrations). A
migration faz `CREATE SCHEMA "catalog"`.

## Pontos em aberto (futuro)

**Reconciliação de combo alterado pós-venda** (Teachable-style: adicionar curso a combo já vendido →
re-conceder aos compradores; hoje o snapshot é congelado — workaround: grant manual) ·
**estorno → revogação automática da matrícula** (hoje são 2 passos manuais no admin) ·
drip (`release` é armazenado mas o members não aplica) · tiers de comunidade (`accessType
'community'` volta ao union quando a comunidade real existir) · order bumps/upsells ·
**ledger de resgates de cupom** (`coupon_redemptions`, chave única por pagamento/lead): hoje
`max_redemptions` é **teto MOLE** — o desconto é aplicado na cobrança (`quote`) e contado só na
confirmação (`redeem`, best-effort, sem idempotência própria), então sob concorrência os descontos
concedidos podem passar do limite e o contador pode sub-contar (erro engolido). O ledger daria
garantia dura + idempotência. Mitigado hoje pelo gate exactly-once (`markPaid`) do funil ·
**rate-limit próprio na `quote`** (risco ACEITO no 3º review): o limite por IP vive só no gateway;
acesso direto na rede interna enumeraria códigos de cupom sem teto (rede privada do Railway +
cupons de baixo valor — não vale a complexidade hoje) · **`/metrics`** (espelhar o payments quando
houver dashboard; o gateway já loga/metrifica o tráfego roteado).

> O **funil já consome** o catálogo (preço/inclusões via gateway, `metadata.offerId`/`couponCode` no
> checkout, `quote`/`redeem` de cupom). A contagem de uso do cupom (`redeem`) é **best-effort** na
> confirmação (o desconto já foi aplicado na cobrança autoritativa) — `max_redemptions` é teto MOLE
> (ver "Pontos em aberto"). A `quote` é o gate de cobrança: só cota oferta **disponível**.

## Checklist antes de finalizar

- [ ] `bun run typecheck` limpo · `bun test` verde (sandbox off) · `bun run check` limpo.
- [ ] Sem `any` novo; entradas validadas (Zod/TypeBox).
- [ ] Mudou schema? Gerou a migration (`db:generate`) e commitou.
- [ ] Mudou contrato de rota/config/modelo? Atualizou este `CLAUDE.md`.
