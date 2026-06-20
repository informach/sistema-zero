# CLAUDE.md — @sistemazero/auth

> **⚠️ Antes de QUALQUER mudança, consulte a doc ATUALIZADA via MCP do Context7**
> (`resolve-library-id` → `query-docs`) para toda lib/framework/API/CLI (Elysia, Drizzle, Zod, jose,
> Bun, etc.) — não confie só na memória; APIs mudam. Para **pesquisa, exploração e entender padrões**,
> use o **MCP do Octocode** em repositórios GitHub relevantes. Faça certo e atualizado — não "de cabeça".

Guia operacional para trabalhar neste package. Leia antes de editar.

## O que é

**Serviço de identidade (IdP)**: cadastro/login, usuários, papéis (RBAC) e
**emissão de JWT** (access + refresh). É o emissor que o
**[@sistemazero/api-gateway](../api-gateway)** verifica (o gateway resolve o
usuário das claims e autoriza por rota). Runtime: **Bun**. Linguagem: **TS (ESM)**.

> Estado: **slices completos e testados** (registro/login/refresh/logout/me + JWKS;
> admin de usuários; reset/definição de senha + **OTP por e-mail** — login passwordless
> e recuperação por código — + self-service de perfil c/ avatar + rotas internas S2S),
> 105 testes passando (incl. `tests/db/` contra Postgres real — pulados sem banco).
> **1º full review (2026-06-05) com TODOS os achados implementados** (rotação
> atômica, fail-closed em prod, readyz/bind, purga, cooldowns — ver "Decisões").
> **2º full review (2026-06-05, prod-readiness) com TODOS os achados implementados**:
> `x-internal-token` TAMBÉM nas rotas admin (anti-spoof dos `X-Auth-User-*`),
> messaging+COMMUNITY_URL obrigatórios em prod (fail-fast), logout `allSessions`
> revoga TODAS as famílias, purga em LOTES + índices `expires_at`, revoke preserva
> timestamp, avatarUrl só http(s), log de login falho, stack no unhandled.
> Migrations `0000_*` (schema `auth`), `0001_*` (`password_reset_tokens`), `0002_*`
> (`otp_codes`), `0003_*` (`users.avatar_url`) e `0004_*` (índices `expires_at` da
> purga) **aplicadas** no Postgres compartilhado local.

## Arquitetura (DDD + Hexagonal)

Espelha o `payments`. A regra de dependência aponta sempre para dentro.

```
src/
├── domain/          # núcleo puro (SEM framework)
│   ├── shared/         # AggregateRoot, Entity, DomainEvent
│   ├── user/           # user.aggregate + role/status/events/errors
│   ├── value-objects/  # email (normaliza+valida), password-policy
│   └── ports/          # user-repository, password-hasher, token-issuer, refresh-token-repository
├── application/     # casos de uso: register, login, refresh, logout, get-me
│   ├── admin/          # gestão de usuários pelo painel: list-users, get-user, update-user
│   ├── tokens/         # auth-token.service (emite access+refresh, rotação)
│   └── mappers/        # user-view (público; SEM passwordHash) + admin-user-view (admin)
├── infrastructure/
│   ├── config/env      # Zod fail-fast
│   ├── persistence/drizzle/  # schema (users, refresh_tokens), db, repositórios, migrations
│   └── security/       # bun-password-hasher (argon2id), jose-token-issuer, keys (HS256/RS256+JWKS)
├── interfaces/http/ # Elysia: server, routes/{auth,admin}.routes, dtos (TypeBox), auth (bearer/ip + resolveGatewayActor), error-handler
├── composition-root.ts  # injeção de dependências (ÚNICO lugar que instancia adapters) — ASSÍNCRONA
└── index.ts             # loadEnv → createApplication → start (+ sinais)
```

## Comandos (de dentro de `packages/auth`)

| Comando | O quê |
|---------|-------|
| `bun run dev` / `start` | servidor (watch / produção), porta 3002 |
| `bun run typecheck` | `tsc --noEmit` |
| `bun test` | testes (rode com **sandbox off** — gotcha do monorepo). Inclui `tests/db/` contra Postgres REAL (banco dedicado `sistemazero_test` na :5433, criado pelo próprio teste; sem banco → PULADOS, suite segue verde) |
| `bun run db:generate` / `db:migrate` | migrations (Drizzle) |
| `bun run db:seed --email <e> --password <p> [--first <n>] [--last <s>] [--role admin\|staff\|superadmin\|customer]` | cria/atualiza usuário |
| `bun run check` / `check:fix` | Biome |

**Sempre** rode `typecheck` + `bun test` antes de concluir.

## Decisões & invariantes (leia antes de mexer)

1. **O contrato `null | usuário`** vive em dois lugares: `UserRepository.findById/findByEmail`
   (→ `null` no miss) e `GetMeService.execute` (→ `UserView | null`). A borda
   (`/auth/me`) traduz `null` em **401**. O `user-view` NUNCA expõe `passwordHash`.
2. **Senha:** `Bun.password` com **argon2id** (memory-hard). Verificação em tempo
   constante. O agregado guarda só o HASH (hashing é da infra). Login devolve erro
   **genérico** ("credenciais inválidas") + verifica um hash "isca" quando o e-mail
   não existe (anti-enumeração por timing).
3. **Refresh token:** valor opaco (32 bytes), guardado **só como sha256**. Rotação
   em cada `/refresh` via **claim ATÔMICO** (`claimForRotation`: `UPDATE ... WHERE
   rotated_at IS NULL AND revoked_at IS NULL RETURNING` — dois `/refresh`
   concorrentes com o MESMO token disputam e só um vence; o perdedor é tratado
   como REUSO). **Reuse-detection:** apresentar um refresh já rotacionado/revogado
   (ou perder o claim) → revoga a **família** (`family_id`) inteira (mitiga roubo).
   Logout revoga o token (ou a família). NÃO troque o claim por check-then-act:
   a corrida contornaria a reuse-detection para sempre (achado A1 do full review).
4. **Tokens (jose v6):** access JWT carrega `sub,email,firstName,lastName,role,status`
   (+ `phone`/`signupSource` opcionais). `JWT_ALG` = HS256 (segredo, default) ou
   RS256 (chave privada + JWKS público). O `verifyAccessToken` PINA o `alg` e valida
   `iss`/`aud`. JWKS só tem chaves em RS256.
5. **Papéis/Status:** `user_role` = superadmin/admin/staff/customer (default no
   cadastro: `customer`); `user_status` = active/pending/suspended/blocked (default:
   `active`; só `active` autentica/renova). `pending` reservado p/ verificação de
   e-mail (futuro).
6. **HTTP:** corpo validado por **TypeBox** (`t`, como o payments); erros de domínio
   → status no `error-handler` (EMAIL_ALREADY_IN_USE→409, INVALID_CREDENTIALS→401,
   USER_NOT_ACTIVE→403, etc.). Params `:id` das rotas admin e os `ids` do batch
   validam **uuid por pattern** (400 na borda, não 22P02→500 no banco).
   `composition-root` é **async** (carrega chaves + hash isca no boot) →
   `index.ts` faz `await createApplication(env)`. `verifyAccessToken` PINA também
   o **`typ: 'access'`** (JWT futuro de outro tipo assinado pela mesma chave não
   vale como access token). Bind em `HOST` (default `::`, dual-stack — IPv6 do
   private networking do Railway); `/health` = liveness, **`/readyz`** = readiness
   com probe de banco (healthcheck do Railway, como o payments).
   **Purga periódica** (composition-root, a cada 6h + boot, advisory lock
   `pg_try_advisory_xact_lock` próprio — chave `1635430504`, espaço GLOBAL ao
   banco compartilhado): apaga refresh/reset/otp expirados há > 7 dias (folga
   preserva a detecção tardia de reuso enquanto importa). O `deleteExpired` roda
   em **LOTES de 5k** (subquery LIMIT — uma DELETE única num backlog grande
   estouraria o `statement_timeout` de 30s e a purga NUNCA completaria) sobre os
   índices `*_expires_idx` (migration `0004`). `revoke`/`revokeFamily` filtram
   `revokedAt IS NULL` (preservam o timestamp ORIGINAL — trilha de auditoria).
   **Logout `allSessions: true` = `revokeAllForUser`** (TODAS as famílias/
   dispositivos — revogar só a família do token apresentado deixaria os outros
   dispositivos logados). **Fail-fast de produção no env:** além do
   `AUTH_INTERNAL_TOKEN`, produção exige `GATEWAY_URL` não-localhost + `AUTH_HMAC_SECRET`
   (sem eles o messaging é NO-OP silencioso — reset/OTP/convite responderiam 200
   sem nunca enviar e-mail) e `COMMUNITY_URL` não-localhost (links de e-mail).
   Login com senha errada loga `auth.login.failed` (userId + ip — auditoria de
   brute-force POR CONTA; a resposta segue genérica). `avatarUrl` no PATCH /me
   só aceita `http(s)://` (os apps renderizam como `src` — sem o pino,
   `javascript:`/`data:` armazenado viraria vetor). O `unhandled.error` loga
   `serializeError` (inclui stack).
7. **Opcionais `phone`/`signupSource`:** fluem do DTO de registro → agregado →
   colunas nullable → claims do token → `user-view`. `signupSource` = app/canal do
   cadastro (funnel/web/mobile/admin).
8. **Reset/definição de senha (`password_reset_tokens`):** token opaco (32 bytes),
   guardado **só como sha256**, single-use (`consumed_at`), TTL `RESET_TOKEN_TTL_MINUTES`
   (60); emitir um novo **consome os pendentes** (1 token vivo/usuário).
   `POST /auth/forgot-password` responde **SEMPRE 200** (anti-enumeração) e envia o
   e-mail `password-reset` via **gateway → messaging** (HMAC de borda, consumer `auth`
   — `GATEWAY_URL`+`AUTH_HMAC_SECRET`; timeout por `GATEWAY_REQUEST_TIMEOUT_MS`;
   sem URL/segredo o envio é no-op) com link
   `${COMMUNITY_URL}/redefinir-senha?token=...` — envio **best-effort** (falha só loga).
   `POST /auth/reset-password` troca a senha e **revoga TODAS as sessões**.
   `POST /auth/internal/password-tokens` (S2S; HMAC do funil no gateway +
   `x-internal-token` = `AUTH_INTERNAL_TOKEN` — **OBRIGATÓRIO em produção**, ≥ 16
   chars, fail-fast no boot; sem ele a checagem fica fail-open) emite o token do
   **1º acesso pós-compra** — o funil monta o link e envia o e-mail `welcome`.
   O forgot-password público tem **cooldown POR CONTA**
   (`RESET_REQUEST_COOLDOWN_SECONDS`, 60; 0 desliga): re-pedido na janela é no-op
   silencioso (não re-envia nem invalida o token vigente — fecha spam de inbox /
   DoS do token legítimo por IPs distribuídos; o limit do gateway é só por IP).
   Os fluxos S2S/convite chamam o `CreatePasswordTokenService` SEM cooldown.
   `POST /auth/internal/ensure-buyer` (mesma proteção S2S) é **create-or-get por
   e-mail**: SEMPRE devolve `{ userId, created }` (201 criou / 200 reaproveitou) — é
   o que destrava o COMPRADOR RECORRENTE (que no `register` recebia 409 e ficava sem
   `userId`, logo sem concessão de acesso). NÃO emite tokens (S2S, sem sessão).
   **Backfill de telefone (06/2026):** usuário pré-existente SEM `phone` (ex.: conta
   criada por convite do admin) ganha o telefone do comando na compra — best-effort
   (falha só loga `ensure_buyer.phone_backfill_failed`, nunca quebra a compra) e
   NUNCA sobrescreve telefone já salvo (o self-service do `/me` prevalece).
9. **Self-service (`/me`):** `PATCH /auth/me` edita nome/telefone/**foto**
   (`avatarUrl` — URL pública; o UPLOAD é do app cliente, ex.: community → R2;
   `null` remove; flui agregado → coluna `avatar_url` → `UserView.avatarUrl`,
   **fora das claims do JWT** — o front busca fresco via `GET /auth/me`). E-MAIL
   NÃO é editável (vínculo com as compras no payments; troca futura exigirá
   verificação). `POST /auth/me/password` troca a senha exigindo a atual; ambos
   revogam nada/todas as sessões respectivamente (troca de senha → re-login).
   **⚠️ `/me` é da CONTA — `PATCH /me` e `/me/password` RECUSAM sessão de PERFIL**
   (claim `pfl` → 403): no perfil-PADRÃO o `sub` colide com o id da conta, então
   sem esse guard a sessão de perfil escreveria na conta, furando o portão da "área
   dos pais" (full review F1). A criança edita o PRÓPRIO perfil em
   `PATCH /auth/profiles/:id` (ver Perfis); a senha da conta fica na área dos pais.
10. **Impersonação (06/2026 — admin "entra como" um usuário na COMMUNITY, p/ suporte):**
    dois passos, origens distintas (admin e community não compartilham cookies).
    (a) `POST /auth/admin/users/:id/impersonate` (gateway: JWT + roles
    superadmin/admin + `x-internal-token`): re-checa a MATRIZ no serviço
    (`superadmin` → qualquer um; `admin` → só customer/staff; a si mesmo → 400;
    alvo inativo → 409) e emite **token de HANDOFF** single-use (tabela
    `impersonation_tokens`, sha256, TTL `IMPERSONATION_TOKEN_TTL_SECONDS` 60s,
    consumo ATÔMICO espelhando o `claimForRotation`), devolvendo
    `{token, expiresAt, communityUrl}` (`COMMUNITY_URL` — o admin abre
    `<communityUrl>/impersonar?token=...`). (b) `POST /auth/impersonate/exchange`
    (pública, rate-limited por IP no gateway; token no CORPO): consome o handoff e
    emite sessão DO ALVO com claim **`act`** (RFC 8693 — `sub`=alvo,
    `act.sub/email/name`=ator) e refresh de família MARCADA
    (`refresh_tokens.impersonator_user_id`, migration `0005`) com TTL CURTO
    (`IMPERSONATION_REFRESH_TTL_SECONDS`, 2h). **A rotação re-deriva `act` e o TTL
    curto da família** (sem isso o /refresh re-emitiria do UserAggregate e
    "esqueceria" a impersonação); ator removido/desativado na rotação ou no
    exchange → revoga a família/nega. Erros de token são INDISTINGUÍVEIS
    (`INVALID_IMPERSONATION_TOKEN`→401); `IMPERSONATION_FORBIDDEN`→403,
    `TARGET_NOT_IMPERSONABLE`→409. Auditoria: `auth.impersonation.requested` /
    `.exchanged` / `.actor_gone` (ids, sem PII). Purga periódica inclui a tabela.
11. **OTP por e-mail (`otp_codes`):** código guardado **só como sha256**, single-use
    (`consumed_at`), TTL `OTP_TTL_MINUTES` (10); brute-force travado por `attempts`
    (`OTP_MAX_ATTEMPTS`, 5 — estourou → consome o código). Um código ativo por
    (usuário, finalidade): pedir outro consome os pendentes daquela finalidade.
    `POST /auth/otp/request` `{email, purpose: 'sign_in'|'password_reset'}` responde
    **SEMPRE 200** (anti-enumeração) e envia o template `otp` via gateway→messaging
    (o código CRU só trafega ao messaging — nunca é persistido; a `idempotencyKey`
    do envio vem do **uuid do registro** (`otp-<uuid>`), NUNCA do código — sha256 de
    um espaço de 10^6 é reversível por força bruta, viraria o código persistido no
    outbox do messaging). Cooldown POR CONTA (`OTP_REQUEST_COOLDOWN_SECONDS`, 60;
    0 desliga): re-pedido na janela = no-op silencioso (não re-envia nem invalida o
    código vigente). `POST /auth/otp/verify` = login passwordless (→ tokens);
    `POST /auth/password/reset-otp` consome o código, define a senha nova e
    **revoga TODAS as sessões**. É o fluxo do `/esqueci-senha` do community (o
    reset por LINK do item 8 continua p/ o 1º acesso pós-compra).

12. **⚠️ Gotcha do drizzle ≥ 0.44 (vale p/ o monorepo):** erros do driver chegam
    ENVELOPADOS em `DrizzleQueryError` — o `PostgresError` original (com
    `code: '23505'` etc.) fica em **`error.cause`**. Checar `code` só no topo
    NUNCA casa (a corrida de cadastro virava 500 em vez de 409 — pego pelo
    `tests/db/`). O `isUniqueViolation` do `user.repository` caminha a cadeia de
    `cause`; siga esse padrão em qualquer mapeamento novo de erro do Postgres.
    A busca `q` da listagem admin **escapa `%`/`_`/`\`** antes do ILIKE (busca
    literal, não padrão).

## Perfis (estilo Netflix) — fatia 06/2026 (PR1)

Uma CONTA do responsável tem **N perfis de crianças** (tabela `auth.profiles`,
migration `0006`): `id` (vira o `x-auth-user-id` EFETIVO na sessão de perfil — PR2),
`account_user_id`, `name`, `avatar_url` (http(s), fora das claims), `whatsapp`
(opcional), `birth_date` (data de nascimento `YYYY-MM-DD`, opcional — controle de
idade, migration `0008`; `mode:'string'` evita shift UTC), `public_profile_enabled`
(bool, **default `false`/OFF** — opt-in dos pais p/ o perfil público da criança no
hub/kids: nome clicável + página pública; migration `0009`), `status`
(`active|archived` — NUNCA DELETE físico, arquivar preserva o histórico keyado no id),
`sort_order`.
- **Data de nascimento é EDITÁVEL SÓ PELOS PAIS** (06/2026): tem caminho próprio no
  agregado (`setBirthDate`, fora do `updateDetails`) e a rota `PATCH /:id` RECUSA (403)
  qualquer `birthDate` numa **sessão de perfil** (a criança) — detectada pelo
  `x-auth-account-id`. O `CreateProfileBody`/`UpdateProfileBody` ganham `birthDate?`
  (`AAAA-MM-DD`); sanidade (data real, não-futura, faixa ≤18 anos) é do agregado
  (`assertBirthDate`). `ProfileView.birthDate` flui ao painel/apps.
- **Perfil público é OPT-IN dos pais e EDITÁVEL SÓ PELOS PAIS** (gamificação,
  06/2026): a flag `public_profile_enabled` nasce **OFF** (default `false`) e tem
  caminho próprio no agregado (`setPublicProfileEnabled`, fora do `updateDetails`) — a
  rota `PATCH /:id` RECUSA (403) qualquer `publicProfileEnabled` numa **sessão de
  perfil** (a criança), o MESMO guard do `birthDate` (detectado pelo
  `x-auth-account-id`). O `CreateProfileBody`/`UpdateProfileBody` ganham
  `publicProfileEnabled?`; `ProfileView.publicProfileEnabled` flui à área dos pais. Só
  com a flag LIGADA o nome da criança vira clicável e a página pública existe no
  hub/kids. Rotas `/auth/profiles` (`profilesRoutes`,
prefixo `/auth` com paths explícitos): `GET` lista os ativos, `POST` cria, `PATCH
/:id` edita, `DELETE /:id` arquiva. O ator é a CONTA (`resolveGatewayActor` →
`x-auth-user-id`) + `requireInternalToken` (defesa em profundidade); ownership por
`profile.belongsTo(accountUserId)` → perfil de outra conta = **404** (não vaza).
- **Teto vem do members** (matrícula = fonte da verdade): o `CreateProfileService`
  chama `GET /members/internal/profile-allowance?accountId=` (S2S direto, `MEMBERS_*`
  env) e o repositório faz a contagem + insert **atômicos** (advisory xact-lock por
  conta — dois creates simultâneos não furam o teto → 409 `PROFILE_LIMIT_REACHED`).
  `maxProfiles <= 0` = a conta não comprou. Validação de foto (http(s)) no agregado.
- **Equipe interna = perfis ILIMITADOS** (06/2026): se o ator é privilegiado
  (`superadmin`/`admin`/`staff` — `isPrivilegedRole`, detectado na borda da rota a
  partir do `x-auth-user-role`), o `CreateProfileService` recebe `privileged: true`,
  **pula o S2S** do members e usa teto ilimitado (mantendo o insert atômico). É o
  espelho, p/ perfis, do acesso irrestrito de conteúdo da equipe — testar/verificar o
  Kids sem matrícula. O `customer` segue limitado pelo plano (sem regressão).
- Envs novas (ver §env): `MEMBERS_BASE_URL`/`MEMBERS_REQUEST_TIMEOUT_MS`/
  `MEMBERS_INTERNAL_TOKEN` (obrigatório em prod — o members exige o token na rota S2S).

**Sessão de perfil (PR2 — claim `pfl`, espelha a impersonação):** selecionar um
perfil EMITE uma sessão de perfil onde o access token tem `sub` = **profileId**
(atribuição de dados — progresso/comunidade se atrelam ao perfil) e a claim **`pfl`**
`{accountId, name, pub}` (**`pub`** = `public_profile_enabled` do perfil, p/ o hub/kids
gatear nome clicável + perfil público sem round-trip; a rotação re-deriva `pub` do
perfil ativo); identidade/role/status seguem da CONTA (o perfil herda). O
`refresh_tokens.active_profile_id` (migration `0007`) é a sobreposição na FAMÍLIA: o
`userId` da linha é a CONTA, e a **rotação re-deriva `pfl`** do perfil ativo (perfil
arquivado/sumido → CAI para sessão da conta — a criança volta à grade). Rotas:
- `POST /auth/profiles/:id/select` — entra/troca de perfil (um clique, **sem PIN**);
  aceita sessão da conta OU de outro perfil (trocar de irmão). Devolve `{profile, tokens}`.
- `POST /auth/profile-session/exit` — volta à área dos pais; **gateado pela SENHA do
  responsável** (a decisão de produto permite "PIN ou a senha"; o PIN curto é futuro).
- `GET /auth/internal/profiles/:id/public` — **S2S** (gamificação/hub, mesma proteção
  `x-internal-token` = `AUTH_INTERNAL_TOKEN`; SEM sessão de usuário): resolve um perfil
  por id e devolve **só nome + flag** `{ name, publicProfileEnabled }` — o MÍNIMO p/ o
  hub/kids exibir o nome clicável de um autor/ranqueado SEM expor conta, foto, telefone
  ou nascimento. `publicProfileEnabled === false` → o consumidor anonimiza (não vaza o
  nome); perfil inexistente/arquivado → 404 (não enumera).
- **Guards:** **criar** e **arquivar** perfil RECUSAM a sessão de perfil (403) — detectada
  pela presença do `x-auth-account-id` que o gateway injeta só quando há `pfl`. Mas
  **editar** (`PATCH /:id`) usa `ownProfileEditContext`: a CONTA edita qualquer perfil
  dela; a **sessão de PERFIL edita SÓ o próprio** (auto-serviço da criança — nome/foto/
  telefone; o `:id` precisa ser o perfil ATIVO = `x-auth-user-id`, editar um IRMÃO → 403).
  Listar e selecionar aceitam ambas. Nome do perfil exige **≥ 3 caracteres** (DTO
  `PROFILE_NAME` + `assertProfileName` no agregado). (O gateway resolve `pfl.accountId` →
  header `x-auth-account-id`, stripado da entrada/anti-spoof — ver api-gateway.)
- **Impersonação propagada no select (full review F2):** se a sessão atual é de suporte
  (o gateway injeta `x-auth-impersonator-id` = claim `act.sub`), `SelectProfileService`
  re-deriva o `act` do ATOR e marca a família — a sessão de perfil HERDA o TTL curto e
  morre com o ator (a rotação re-checa). Ator sumido/inativo no select → 403. Sem isso, o
  select "lavaria" a impersonação numa sessão de perfil normal de 30 dias e sem rastro.
- **Migração de produção (PR6) — `scripts/backfill-default-profiles.ts`** (`bun run
  db:backfill-profiles [--dry-run]`): cria o **perfil-padrão por conta com matrícula KIDS
  ativa** com `id = id da conta` — o progresso/gamificação/comunidade histórico (keyado no
  `user_id` da conta, pré-perfis) fica atribuído ao perfil SEM re-keyar nada (migração
  ADITIVA). Idempotente (ON CONFLICT no PK) e re-executável; cross-schema (lê
  `members.entitlements`/`courses`, escreve `auth.profiles`). ⚠️ RODA UMA VEZ, MANUALMENTE,
  ANTES de habilitar a UI de perfis (validar em staging primeiro) — NÃO é preDeploy. O
  backfill de `gamification_profiles.account_id` já é da migration `0014` do members.

## Sentry (monitoramento de erros)

`@sentry/bun` (estável), ligado por `SENTRY_DSN` (ausente = no-op; projeto
`sistema-zero-auth` na org `informach-nucleo-de-aprendizag`, us.sentry.io).
Espelha o padrão do payments (3 camadas, `infrastructure/observability/sentry.ts`):
1. **Espelho de logs** (`withSentryMirror`, no composition-root): TODO log ERROR
   vira evento (fingerprint = nome do evento; contexto = extras) — cobre
   `otp.email_failed`/`forgot_password.email_failed`/`tokens.purge.failed` etc.
   `MIRROR_SKIP` evita duplicar o que já é capturado como exceção.
2. **`captureException` no error-handler** (500 `unhandled.error`) — evento
   canônico com stack.
3. **Process handlers/boot** (`index.ts`): init no TOPO (após `loadEnv`),
   captureException + `flushSentry()` no shutdown. `release` =
   `RAILWAY_GIT_COMMIT_SHA`, `sendDefaultPii: false` (PII-free — userId em vez
   de e-mail nos logs), `tracesSampleRate: 0` (só erros).

## Integração com o gateway

- **HS256:** defina o MESMO `JWT_HS256_SECRET` aqui e no gateway. O gateway verifica
  sem JWKS.
- **RS256:** o gateway aponta `JWT_JWKS_URL=<auth>/auth/.well-known/jwks.json` +
  `JWT_ISSUER`/`JWT_AUDIENCE`. O gateway nunca segura a chave privada.
- O gateway resolve o usuário das claims, aplica RBAC (`route.authorize`) e injeta
  `X-Auth-User-*` confiável ao upstream (e remove os de entrada — anti-spoof). As
  rotas `/auth/*` no gateway são **públicas + `passthrough`** (o IdP cuida da própria
  auth; o `/me` precisa do Bearer passando direto).
- **Rotas admin `/auth/admin/users*`** (gestão de usuários pelo painel) são a
  EXCEÇÃO: o gateway as protege com **JWT + RBAC** (`GET` listar/detalhe + `POST
  .../batch` hidratação em lote por ids → superadmin/admin/staff; `POST /auth/admin/users`
  criar + `PATCH` editar → superadmin/admin) e injeta `X-Auth-User-*` (NÃO `passthrough`)
  **+ o `x-internal-token`** (`authInternalTransforms`/`AUTH_INTERNAL_TOKEN` — o
  auth o EXIGE também no admin, igual ao members/catalog: é o que prova que os
  `X-Auth-User-*` vieram do gateway; sem isso, quem alcançasse o serviço direto
  na rede interna forjaria identidade de superadmin só com headers).
  O `batch` (`BatchGetUsersService` + `UserRepository.listByIds`, ≤100 ids) hidrata identidade
  p/ a área de membros (que lista `userId`s) — evita N+1. O serviço lê o ator desses
  headers (`resolveGatewayActor`),
  re-checa papel/status (defesa em profundidade) e aplica os GUARDS hierárquicos:
  ninguém altera o próprio papel/status; `admin` não toca/promove a admin/superadmin;
  suspender/bloquear revoga as sessões do alvo. Concorrência otimista por `version`.
- **Criação pelo painel (`POST /auth/admin/users`, fluxo CONVITE):**
  `CreateUserService` cria a conta **`active`** com **senha aleatória** de 32 bytes
  hasheada (impossível de usar; `active` é obrigatório — o token de senha exige
  `isActive()`), `signupSource: 'admin'`, e envia o e-mail **`welcome`** (mesmo
  template do 1º acesso pós-compra) com link `${COMMUNITY_URL}/redefinir-senha?token=...`
  — envio **best-effort** (falha NÃO desfaz a criação; resposta `{ user, inviteSent }`
  sinaliza). Guards: `admin` só cria staff/customer; `superadmin` qualquer papel.
  E-mail duplicado → 409.

## Dev local

- **Schema `auth` no Postgres compartilhado** (igual ao funnel com `funil`): banco
  COMPARTILHADO do monorepo (`sistemazero`, Docker porta **5433**), isolado por
  `pgSchema('auth')` + `schemaFilter:['auth']`. `.env`:
  `DATABASE_URL=postgres://postgres:postgres@localhost:5433/sistemazero`.
  **Não** precisa criar banco — a migration faz `CREATE SCHEMA "auth"`.
- `bun run db:migrate` aplica a migration; `bun run db:seed ...` cria o 1º admin.
- E2E manual: suba `auth` (3002) + `gateway` (3000) e:
  `POST /auth/register` → recebe tokens; rota protegida com `Authorization: Bearer
  <access>` → 200; token inválido → 401; role/status insuficientes → 403.

## Pontos em aberto (futuro)

Verificação de e-mail (status `pending`) · troca de e-mail com verificação (hoje o
e-mail é IMUTÁVEL no self-service — vínculo com as compras) · 2FA · lockout por conta.

## Checklist antes de finalizar

- [ ] `bun run typecheck` limpo · `bun test` verde (sandbox off) · `bun run check` limpo.
- [ ] Sem `any` novo; entradas validadas (Zod/TypeBox). `passwordHash` nunca exposto.
- [ ] Mudou schema? Gerou a migration (`db:generate`) e commitou.
- [ ] Mudou contrato de porta/claims/config? Atualizou este `CLAUDE.md`.
