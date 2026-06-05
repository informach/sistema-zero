# @sistemazero/api-gateway — Guia do Agente

> **⚠️ Antes de QUALQUER mudança, consulte a doc ATUALIZADA via MCP do Context7**
> (`resolve-library-id` → `query-docs`) para toda lib/framework/API/CLI (Elysia, jose, Zod, Bun,
> ioredis/RedisClient, etc.) — não confie só na memória; APIs mudam. Para **pesquisa, exploração e
> entender padrões**, use o **MCP do Octocode** em repositórios GitHub relevantes. Faça certo e
> atualizado — não "de cabeça".

> API Gateway do monorepo `sistema-zero`: roteamento/proxy, auth plugável, rate limiting, load balancing, CORS, transformação e observabilidade.
> **Stack:** Bun + TypeScript + Elysia + Zod + jose. **Arquitetura:** Hexagonal (Ports & Adapters) + Chain of Responsibility no caminho da requisição.
> **Design:** config-driven (uma config declarativa) e **stateless** (todo estado mutável atrás de uma porta) → N réplicas sem líder.

---

## 1. Visão geral & contexto

O gateway é a **borda** do sistema. Ele NÃO tem lógica de negócio: recebe a requisição do cliente, aplica políticas (auth, rate limit, CORS, transforms) e encaminha (proxy) para o upstream certo, com resiliência (LB, circuit breaker, health, retry).

Hoje ele é o **BFF de pagamentos do funil** (`@sistemazero/funnel`):
1. O funil autentica-se no gateway por **HMAC de borda** (consumer `funnel`).
2. O gateway **re-assina** a chamada ao `payments` como seu próprio consumer (`upstreamAuth: 'resign'`) → o segredo do payments vive SÓ no gateway; o funil nunca fala com o payments.
3. O webhook `payment.paid` (payments → gateway → funil): o gateway **valida a assinatura** (`verify-webhook`), injeta um token interno e reescreve o path.

Também expõe o **admin de pagamentos** ao painel (`payments-admin-*`: `GET /payments/admin/{payments,subscriptions}[/:id]`, `/stats`, `/stats/daily` (série diária do painel de vendas — rota PRÓPRIA: o matcher não faz prefix matching, `/stats` não cobre), `/ops`; `POST /payments/admin/payments/:id/refund`; `DELETE /payments/admin/subscriptions/:id`) — **JWT + RBAC** (superadmin/admin/staff), injetando `X-Auth-User-*` (SEM `resign`/HMAC). Caminho `/payments/admin/*` (≥3 segmentos) não colide com as rotas consumer `/payments`,`/payments/:id`. Espelha o admin do catálogo (que também tem o GET-one `catalog-admin-product-get` p/ a página de edição de produto do painel).

Também é o **ponto de verificação/autorização de usuários**: roteia `/auth/*` para o **[@sistemazero/auth](../auth)** (IdP), verifica os JWT que ele emite (HS256/RS256), resolve o usuário das claims, aplica **RBAC** por rota e injeta `X-Auth-User-*` confiável ao upstream (ver §4.5). As rotas públicas de identidade (`/auth/login|register|refresh|logout|me|jwks`, + **`/auth/forgot-password`** 5/min/IP, **`/auth/reset-password`** 20/min/IP, **OTP**: **`/auth/otp/request`** 5/min/IP, **`/auth/otp/verify`** e **`/auth/password/reset-otp`** 20/min/IP — login por código e recuperação de senha por código do community —, **`PATCH /auth/me`** e **`POST /auth/me/password`** — self-service do app community) são `public` + `passthrough`; já as de **gestão admin de usuários** (`auth-admin-*`: `GET /auth/admin/users[/:id]` + `POST /auth/admin/users/batch` → superadmin/admin/staff; `POST /auth/admin/users` criar (convite) + `PATCH /auth/admin/users/:id` → superadmin/admin; o POST de criação tem o MESMO path literal do GET list — o matcher distingue pelo método) são **JWT + RBAC** e injetam `X-Auth-User-*` (NÃO `passthrough`) **+ `authInternalTransforms`** (06/2026: o auth exige o `x-internal-token` TAMBÉM no admin, igual ao members — sem ele os `X-Auth-User-*` seriam forjáveis por quem alcançasse o serviço direto na rede interna) — o `auth` lê o ator daí e aplica os guards hierárquicos. O `batch` hidrata identidade em lote (usado pelo admin de membros). Espelham o admin do catálogo. Há ainda as rotas S2S **`POST /auth/internal/password-tokens`** e **`POST /auth/internal/ensure-buyer`** (HMAC de borda — funil — + injeção de `x-internal-token` via `authInternalTransforms`/`AUTH_INTERNAL_TOKEN`): a 1ª emite o token de definição de senha do 1º acesso pós-compra; a 2ª garante o usuário do comprador (create-or-get por e-mail) e devolve o `userId` — destrava a concessão de acesso ao comprador recorrente. O **auth também é consumer HMAC** (`AUTH_HMAC_SECRET`, cadastro condicional — sem a env o consumer não existe) para chamar `/messaging/send` (e-mail de reset).

E expõe **minhas compras** ao app community (`payments-my-*`: `GET /payments/my[/:id]`) — **JWT + `authorize.statuses:['active']` SEM roles** (qualquer conta ativa, inclusive `customer`); o gateway injeta `X-Auth-User-*` (inclui e-mail) e o payments filtra por `customer->>'email'`. O literal `my` vence o param `:id` na especificidade do matcher (coberto por teste em `route-registry.test.ts`).

E roteia mais dois upstreams: o **catálogo** (`@sistemazero/catalog`: leitura pública de ofertas/produtos + `quote`/`redeem` de cupom por HMAC + escrita admin por JWT/RBAC — as rotas admin/escrita E o `redeem` recebem `x-internal-token` injetado via `catalogInternalTransforms`/`CATALOG_INTERNAL_TOKEN`, defesa em profundidade igual ao members; o MESMO valor é o `INTERNAL_API_TOKEN` do catalog e o `CATALOG_INTERNAL_TOKEN` do members, que chama a rota S2S de entitlements direto) e a **área de membros** (`@sistemazero/members`: API do aluno — com `x-internal-token` injetado (`MEMBERS_INTERNAL_TOKEN`) como defesa em profundidade — + webhooks de concessão/assinatura por HMAC `resign`; inclui `members-catalog`: `GET /members/catalog`, o "Todos os cursos" do community; `members-video-position`: `PUT /members/courses/:slug/lessons/:lessonId/position`, posição do vídeo, 600/min; `members-quiz-attempt`: `POST /members/lessons/:lessonId/blocks/:blockId/quiz-attempts`, submit de quiz corrigido no servidor, 60/min; `members-attachment-resolve`: `GET /members/courses/:slug/lessons/:lessonId/attachments/:attachmentId/resolve`, resolução de download de anexo consumida SÓ pelo servidor do community (a storageRef nunca chega ao browser), 120/min; `members-block-ebook-resolve`: `GET /members/courses/:slug/lessons/:lessonId/blocks/:blockId/ebook/resolve`, resolução do PDF do bloco e-book (livro 3D), mesmo perfil do resolve de anexo, 120/min; e `members-course-rating-{get,put}`: `GET|PUT /members/courses/:slug/rating`, classificação do curso estilo Udemy (PUT é upsert incremental — cada passo do fluxo de modais persiste o estado acumulado), 300/120 por min — todas JWT + statuses `active`, mesmo perfil das demais rotas do aluno). O **admin de membros** (`members-admin-*`: `GET /members/admin/members[/:userId]` → superadmin/admin/staff; `POST /members/admin/entitlements` + `PATCH /members/admin/entitlements/:id` → superadmin/admin) é **JWT + RBAC** e injeta `X-Auth-User-*` — **COM** `membersInternalTransforms` (06/2026: o members exige o `x-internal-token` também no admin; sem ele, os `X-Auth-User-*` seriam forjáveis por quem alcançasse o serviço direto na rede interna). Caminho `/members/admin/*` não colide com `/members/courses…`. O painel hidrata identidade via `auth-admin-users-batch` (`POST /auth/admin/users/batch`, ≤100 ids). A **autoria de conteúdo** (`members-admin-courses-read|write`, `…-modules-write`, `…-lessons-read|write`, `…-blocks|attachments-write`) usa **wildcards `/*`** que casam o resto do path — inclusive o próprio `/courses` (cauda vazia) — e, por serem mais longas, ganham a especificidade e cobrem lista/criação sem rotas exatas separadas (LEITURA staff+, ESCRITA admin+). Espelha o admin do catálogo.

E roteia a **mensageria** (`@sistemazero/messaging`): envio S2S (`messaging-send`, `messaging-message-get` por **HMAC** + injeção de `x-internal-token` via `messagingInternalTransforms`/`MESSAGING_INTERNAL_TOKEN`, espelhando o members — SEM `resign`), **admin** por JWT+RBAC (`messaging-admin-read` staff+; `messaging-admin-write` admin+, wildcard `/messaging/admin/*`) **+ `messagingInternalTransforms` também no admin** (06/2026: o messaging exige o token p/ provar que os `X-Auth-User-*` vieram do gateway, igual members/catalog) e **webhooks de status** públicos (`messaging-webhook-{sendgrid,evolution}`: o serviço valida a assinatura ECDSA do SendGrid / o `?token=` da Evolution, aceito também via header `x-webhook-token`; corpo repassado intacto — lotes da SendGrid chegam a 768KB e o messaging aceita até 2MB nessas rotas).

Adicionar/expor um serviço = **editar `gateway.config.ts`**, não código.

---

## 2. Comandos essenciais (rode de dentro de `packages/api-gateway`)

| Ação | Comando |
| --- | --- |
| Dev (watch) | `bun run dev` |
| Start | `bun run start` |
| Rodar testes | `bun test` (rode com **sandbox off** — ver Gotchas) |
| Typecheck | `bun run typecheck` (ou, da raiz: `bun run --filter '@sistemazero/api-gateway' typecheck`) |
| Lint (Biome) | `bun run check` |
| Lint + fix | `bun run check:fix` |

> ⚠️ **Não** use `bun x tsc` direto: ele baixa um TypeScript global errado. Use o script `typecheck`, que resolve o `tsc` do workspace. **Sempre** rode `typecheck` + `bun test` antes de concluir uma mudança.

---

## 3. Arquitetura & camadas (Hexagonal)

```
src/
├── domain/           # Núcleo: PORTAS (interfaces) + tipos puros. Sem deps externas.
│   ├── ports/        #   GatewayStore (estado compartilhado)
│   ├── routing/      #   literais base (HttpMethod, LbStrategy, AuthKind) + RouteMatch
│   ├── load-balancing/ resilience/ proxy/ versioning/
├── application/      # Casos de uso: pipeline (CoR), auth chain, rate limiter, transforms.
├── infrastructure/   # Adapters concretos: store (memory/redis), proxy (fetch), LB, breaker,
│                     #   health, config (env + schema Zod), routing, upstream (resign).
└── interfaces/       # Entrada: Elysia app (gateway-plugin), health/metrics routes, error-handler.
```

**Regra de ouro (dependências apontam para dentro):** `interfaces → application → domain` e `infrastructure → (implementa portas de) domain`. O domínio NUNCA importa de infra/app.

**Composição:** `composition-root.ts` é uma **fábrica pura** (sem container de DI) que instancia e conecta tudo. Entrypoint `index.ts`: `loadEnv → createApplication → start`, com SIGINT/SIGTERM, watchdog de shutdown e **graceful drain** (`SHUTDOWN_DRAIN_MS`: `/readyz` vira 503 antes de parar).

---

## 4. Design distintivo (leia antes de mexer)

### 4.1 Pipeline = Chain of Responsibility (não middleware do Elysia)

O Elysia tem um único catch-all `.all('/*')` que monta o `GatewayContext` e roda um **`Stage[]` explícito**. Escolhemos isso (em vez de registro por-rota no Elysia) porque as rotas são dinâmicas e o repo bane anotar `: Elysia` em retornos.

**Ordem dos stages** (a 1ª `Response` curto-circuita):
```
route-resolve → cors → auth → user-resolution → authorization → global-rate-limit → rate-limit → request-transform → proxy (terminal)
```
(`user-resolution` resolve `ctx.user` das claims do JWT; `authorization` aplica o RBAC por rota. `global-rate-limit` roda **após** o auth — por isso isenta `principal`s — e só entra na cadeia quando `GLOBAL_RATE_LIMIT_PER_MINUTE > 0`.)
**Finalizers (SEMPRE rodam, mesmo em curto-circuito/exceção):**
```
response-transform → finalize
```
- `finalize` injeta `X-Request-Id` + headers `RateLimit-*`, **refunda** o contador em 5xx (não pune o cliente por falha do upstream), registra métricas e emite o **access log** (`gateway.access`).
- Uma exceção inesperada num stage vira **500** e os finalizers ainda rodam (log/métricas/refund nunca são pulados). Um finalizer que lança não derruba a resposta.

### 4.2 Stateless via `GatewayStore` (a porta mais importante)

Todo estado mutável compartilhado (rate limit, cache de sessão/JWKS, estado do circuit breaker) fica atrás de **uma** porta `GatewayStore`. Dois adapters:
- **in-memory** (dev/single-replica) — default.
- **redis** (escala) — `STATE_BACKEND=redis` + `REDIS_URL`. Usa o **`RedisClient` NATIVO do Bun** (não ioredis) e Lua atômico via `send('EVAL', [...])`.

Métodos: `slidingWindow` / `slidingWindowRefund(key, windowResetMs?)` (rate limit), `increment` (gate de tentativa do breaker), `recordOutcome(key, ok, windowMs)` (contadores total+fail do breaker, **atômico**), `get/set/del`, `reset`, `init/kill`.

### 4.3 Resiliência (`ProxyEngine` orquestra)

`LB → circuit breaker → timeout por tentativa → forward (stream) → health/stats/breaker → retry`.
- **LB:** `round-robin` / `least-connections` / `weighted` (SWRR do Nginx) / `p2c-ewma`, + decorator **sticky** (rendezvous/HRW hashing — só ~1/N das sessões remapeiam quando um alvo entra/sai). Ligado por rota via `sticky: { by, header? }`.
- **Health:** probe ativo periódico + registro passivo (ejeta após N falhas consecutivas, fail-open). `isHealthy` é leitura pura (hot path).
- **Circuit breaker:** estado no store (TTL) + cache local ~250ms. `closed → open → half-open → closed/open`. Half-open libera **uma** tentativa via gate atômico (`increment`, vence quem fizer `count===1`, vale entre réplicas) com **token único por tentativa**. **Fail-open** em qualquer erro do store.
- **Retry:** SÓ métodos idempotentes (GET/HEAD/PUT/DELETE), nunca POST, e nunca com corpo em stream. Full jitter; `perTryTimeoutMs` capado pelo `budgetMs` restante (latência ponta-a-ponta limitada). Latência medida com `performance.now()` (monotônico).

### 4.4 Proxy é streaming (zero-copy)

`onParse` devolve o stream do corpo → o Elysia NÃO consome → o proxy encaminha intacto via `fetch` (`duplex: 'half'`, `redirect: 'manual'`). O teto do corpo é o **`maxRequestBodySize` do Bun.serve** (413 automático) — **nunca** por pipe do stream de entrada (ver Gotcha ⑥). O corpo da RESPOSTA pode ser piped com segurança (`idleTimeoutStream`).

### 4.5 Auth plugável (Strategy + Chain) + Autorização (RBAC)

**Autenticação** por rota: `any`/`all` sobre `hmac` (core `verifyHmacSignature` + IP CIDR + consumer registry da config), `session` (token opaco no store), `jwt` (jose). Mensagem canônica do HMAC (06/2026): `"<MÉTODO>.<path>.<idem>.<corpo>"` via `canonicalHmacMessage` do core — método+path amarrados impedem replay cross-endpoint (GET→DELETE de corpo vazio); o verificador usa `ctx.url.pathname` (o path que o CONSUMIDOR chamou no gateway). Em rotas `resign`, o gateway re-assina a chamada de saída como consumer do upstream — assinando o **`ctx.upstreamPath` FINAL sem query** (o resign roda DEPOIS dos path-rewrites no request-transform stage), que é exatamente o pathname que o upstream verifica. ⚠️ O `verify-webhook` (entregas do payments) continua assinando/verificando SÓ o corpo — contrato público com consumidores.

**JWT (LIGADO)** — o emissor é o **[@sistemazero/auth](../auth)**. A `jwt.strategy` verifica **HS256** (segredo compartilhado `JWT_HS256_SECRET`) **e/ou RS256 via JWKS** (`JWT_JWKS_URL`); a chave é escolhida pelo `alg` do token e os algoritmos são **pinados**. A strategy liga quando `JWT_JWKS_URL` OU `JWT_HS256_SECRET` existe.

**Resolução de usuário** (`user-resolution.stage` + `createClaimsUserResolver`): lê a identidade das claims do JWT verificado → `ctx.user` = `{id,email,firstName,lastName,role,status,phone?,signupSource?}` ou nada (HMAC = sistema-a-sistema, sem usuário; claims faltando → não resolve). Stateless (sem consultar o `auth` no caminho quente).

**Autorização / RBAC** (`authorization.stage`): a rota pode declarar `authorize: { roles?, statuses?, scopes? }`. A presença do bloco exige um **usuário resolvido** (senão 401); `status` deve estar em `statuses` (default `['active']`); `roles`/`scopes` (se definidos) precisam casar (senão 403). Rotas sem `authorize` só exigem autenticação.

**Identidade confiável ao upstream:** o `request-transform.stage` injeta `X-Auth-User-*` (id/email/name/role/status/phone/source) a partir de `ctx.user` e **remove** quaisquer `X-Auth-*` de entrada (anti-spoof). O upstream confia neles (vêm só do gateway). As rotas `/auth/*` são públicas + `passthrough` (o IdP cuida da própria auth; o `/me` precisa do Bearer chegando ao upstream). **Consumer HMAC ao upstream (06/2026):** em rotas não-`passthrough`, após o strip das credenciais de borda, o gateway **re-injeta `x-consumer-id` com o `ctx.principal.subject` AUTENTICADO** quando `principal.kind === 'hmac'` (nunca o valor cru do cliente; rotas `resign` sobrescrevem depois com o consumer do próprio gateway). É o que dá ao upstream a identidade do consumer p/ escopo de idempotência — sem isso a `Idempotency-Key` do messaging chegava sem consumer e o dedupe NUNCA engatava (achado crítico do 1º full review do messaging).

### 4.6 Padrões GoF presentes
Proxy, Facade (`route-registry` + `gateway-plugin` + `gateway.config.ts`), Decorator (transforms, sticky), Chain of Responsibility (pipeline), Strategy (auth + LB).

---

## 5. Configuração

- **`gateway.config.ts`** (`export default`): config declarativa (services, routes, consumers, cors, versionHeaders). Validada por Zod no boot (**fail-fast**). Origem alternativa: `GATEWAY_CONFIG_JSON` (inline) ou `GATEWAY_CONFIG_PATH`.
- **`src/infrastructure/config/gateway-config.schema.ts`**: fonte única dos tipos (os tipos de domínio/app importam os inferidos como `import type`).
- **`src/infrastructure/config/env.ts`**: env vars (Zod, fail-fast). Veja `.env.example`.
- **`load-gateway-config.ts` → `validateReferences`**: validações cruzadas (route-ids únicos, serviço/grupo existem, jwt→JWKS, resign→creds, **tipo de transform conhecido**, **valor de `header-inject` não vazio**, **jwt em prod → `JWT_ISSUER`+`JWT_AUDIENCE` obrigatórios**).
- **CORS por rota é SÓ `{ origins }`** (`routeCorsConfigSchema`, estrito): a checagem roda na requisição real (`cors.stage` → 403). O preflight (OPTIONS) e os demais headers CORS são da config **global** (plugin no `onRequest`, antes da resolução de rota) — declarar `methods`/`credentials`/etc. por rota **falha no boot** (prometeria um comportamento que não existe).
- **Versionamento:** `versions[].upstreamGroup` troca o grupo de destino e `versions[].rewritePrefix` sobrepõe o prefixo de path da rota para aquela versão (aplicado no `route-resolve`).

**Segredos** (`hmacSecret` ≥ 16 chars, validado no boot): defina em prod `FUNNEL_HMAC_SECRET`, `GATEWAY_CONSUMER_ID`/`GATEWAY_HMAC_SECRET`, `FUNNEL_INTERNAL_TOKEN`, `MEMBERS_INTERNAL_TOKEN`, `CATALOG_INTERNAL_TOKEN`, `MESSAGING_INTERNAL_TOKEN`, `AUTH_INTERNAL_TOKEN`, `METRICS_TOKEN`. Vazio/curto **falha no boot** (evita auth com chave efetivamente vazia).

**Fail-fast de PRODUÇÃO** (`env.ts`, 06/2026): com `NODE_ENV=production` o boot **exige** (senão não sobe): `METRICS_TOKEN` + os 4 tokens internos (`MEMBERS/CATALOG/MESSAGING/AUTH_INTERNAL_TOKEN`, ≥16 chars — vazio = injeção silenciosamente desligada, só aceitável em dev) e **`TRUST_PROXY` definido EXPLICITAMENTE** (o default silencioso `false` atrás de proxy colapsaria todos os clientes no IP do edge → um único balde de rate limit). `FUNNEL_*`/resign/jwt já eram fail-fast por outros caminhos (consumer min 16, header-inject vazio, `validateReferences`).

**`MEMBERS_INTERNAL_TOKEN`** (defesa em profundidade da área de membros): quando setado, o gateway injeta `x-internal-token` (via `header-inject`, **sobrescreve** qualquer valor do cliente) nas rotas do **aluno** E do **admin** (`members-*` + `members-admin-*`; não nos webhooks que já têm HMAC), e o members o exige (`INTERNAL_API_TOKEN`, MESMO valor). Vazio → injeção desligada (só dev). É o que prova ao members que o `x-auth-user-id` veio do gateway. Em `gateway.config.ts` a injeção é condicional (array vazio quando não setado, p/ não falhar o boot do header-inject).

---

## 6. Convenções de código

- **Imports:** alias de pacote (`@sistemazero/core/...`) + relativos dentro do pacote. `import type` para tipos.
- **Tipos:** sem `any`; prefira `unknown` + narrowing. Não anote `: Elysia` em retornos (regra do repo).
- **Validação:** toda entrada externa (env, config, body, headers) passa por **Zod**, fail-fast.
- **Imutabilidade:** `readonly` em portas/DTOs; estado mutável só no `GatewayContext` (por requisição) e atrás do `GatewayStore`.
- **Nomes:** arquivos `kebab-case`; classes `PascalCase`; funções/vars `camelCase`.
- **Stateless:** NUNCA guarde estado de requisição em variável de módulo/instância de adapter — vai para o `GatewayStore` (senão quebra multi-réplica).
- **Segurança de borda:** credenciais do cliente (`authorization`, `cookie`, `x-session-token`, `x-consumer-id`, `x-signature`) são removidas antes do proxy (exceto `upstreamAuth: 'passthrough'`); em rotas HMAC o `x-consumer-id` é re-injetado com o principal AUTENTICADO (ver §4.5).

---

## 7. Gotchas (aprendido na marra)

1. **jose é v6** (não v5): `createRemoteJWKSet`, `jwtVerify`. JWT pina `algorithms` (default `['RS256']`) e rejeita token sem `sub`.
2. **zod v4:** schemas de objeto com defaults aninhados usam `.prefault({})`, **não** `.default({})`.
3. **Em testes use `Bun.sleep`**, não o `sleep` do app — o do app é `unref()`'d (pra não segurar o shutdown) e um timer unref'd trava sob `bun test`.
4. **Sandbox bloqueia `bun test` multi-arquivo** (trava sem output num prompt de permissão) — rode com sandbox desabilitado.
5. **`Application.stop()` guarda em `app.server`** (o `stop()` do Elysia lança se nunca houve `listen` — acontece nos testes via `app.handle`).
6. **NUNCA pipe o corpo da REQUISIÇÃO** (stream de entrada do Bun.serve) por um `TransformStream`. Sob latência do store (Redis), o pipe interno do Bun lança `TypeError` como `unhandledRejection` e o `index.ts` derruba o processo (só no caminho Redis, 1 erro por POST). Teto do corpo = `maxRequestBodySize`. O corpo da RESPOSTA PODE ser piped (`pipeTo(...).catch()`, nunca `pipeThrough`).
7. **ioredis quebra sob Bun** (TypeError de socket) → use o `RedisClient` nativo do Bun.
8. **`bun x tsc`** baixa um TS global errado → use `bun run typecheck` (de dentro do pacote) ou `bun run --filter '@sistemazero/api-gateway' typecheck` (da raiz).
9. **Logging:** o stage `finalize` emite `gateway.access` por requisição (requestId, traceId, method, path, route, service, version, principal, **clientIp**, **userAgent**, target, attempts, status, latencyMs) — SEMPRE, mesmo em 4xx/5xx/timeout. Não é middleware do Elysia, é finalizer da CoR. **Nível por status:** 5xx → `error` (aflora em queries `level>=error`); 2xx–4xx → `info` (4xx fica em info de propósito, evita spam de `warn` sob ataque/429). Com `LOG_LEVEL=debug`, emite também `gateway.headers` com os headers de req/upstream/resp **redigidos** (`redactHeaders` mascara `SENSITIVE_LOG_HEADERS` → `[REDACTED]`). Erros inesperados (`pipeline.stage_failed`/`finalizer_failed`, `gateway.unhandled`, crashes do `index.ts`) logam `error: serializeError(e)` (do core) → **inclui stack trace** (aninhado, nunca espalhado: o campo `message` colidiria com o do evento). Warns operacionais (`proxy.*`, `gateway.rate_limit_unavailable`) seguem só com `reason`/`message`.

---

## 8. Pontos em aberto (não feitos — decisão de design pendente)

- **Anti-replay HMAC/webhook por nonce:** hoje é só janela de tempo (`toleranceSeconds`); replay do MESMO método+path possível dentro da janela (o replay cross-endpoint foi fechado em 06/2026 — método+path entram na mensagem canônica). Precisa de store de assinatura de uso único.
- **Webhook assina só o corpo:** `x-event-type`/`x-delivery-id` ficam fora da assinatura (adulteráveis).
- **Rate-limit spoofável** se `TRUST_PROXY`/`TRUSTED_PROXY_HOPS` estiverem mal configurados atrás de PaaS. (Mitigado em parte pelo **safety-net global por IP** — `global-rate-limit.stage`, ligado por `GLOBAL_RATE_LIMIT_PER_MINUTE` — que limita flood anônimo agregado por IP através de TODAS as rotas; **isenta `principal`s autenticados** (não estrangula o funil, IP único de egress) e por isso roda após o auth e **não cobre 404s pré-rota** nem floods de auth-fail, que dependem de proteção na borda/PaaS. Desde 06/2026 o boot de prod **exige `TRUST_PROXY` explícito** — o erro silencioso de esquecer a env não sobe mais.)
- **LB cross-réplica:** least-connections/p2c/sticky são **por réplica** (sem coordenação entre réplicas) — trade-off documentado.
- **Observabilidade do fail-open:** quando o store de rate limit cai (fail-open libera), além do `warn` `gateway.rate_limit_unavailable` há a métrica `gateway_rate_limit_fail_open_total` em `/metrics` — alerte nela (fail-open silencioso = limites efetivamente desligados).

---

## 9. Deploy

- Serviço Railway separado via **`packages/api-gateway/railway.json`** (NÃO repontar o `railway.json` da raiz, que é do payments; tem `healthcheckPath: /readyz` + watchPatterns). Dockerfile `oven/bun:1`, build context = raiz do repo.
- Para escala: `STATE_BACKEND=redis` + `REDIS_URL` (provisione um Redis). Alcance o payments via `PAYMENTS_URL` (ex.: `http://payments.railway.internal:3001`).
- Liveness `/health` (sempre 200 se de pé), readiness `/readyz` (503 se store fora, sem upstream saudável, ou em drain). **O gateway é a borda pública:** `/metrics` (JSON ou `?format=prom`) exige `METRICS_TOKEN` (header `x-metrics-token` ou `Authorization: Bearer`; obrigatório em prod) e o `/readyz` só inclui o snapshot detalhado de upstreams com o mesmo token (o healthcheck anônimo do Railway recebe só o status).
- Em prod lembre de `SHUTDOWN_DRAIN_MS > 0` (o drain do `/readyz` no SIGTERM só vale com a espera ligada) e dos fail-fast do §5 (TRUST_PROXY explícito, tokens internos, METRICS_TOKEN, JWT_ISSUER/AUDIENCE).

---

## 10. Checklist antes de finalizar uma tarefa

- [ ] `bun run typecheck` limpo.
- [ ] `bun test` verde (sandbox off).
- [ ] `bun run check` (Biome) limpo.
- [ ] Sem `any` novo; entradas validadas com Zod; sem `: Elysia` em retornos.
- [ ] Estado mutável novo foi para o `GatewayStore` (não variável de módulo) — continua stateless?
- [ ] Mudou contrato de porta/config/comando? Atualizou este `CLAUDE.md`.
