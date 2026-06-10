# CLAUDE.md — @sistemazero/community-kids

> **⚠️ Antes de QUALQUER mudança, consulte a doc ATUALIZADA via MCP do Context7**
> (`resolve-library-id` → `query-docs`) para toda lib/framework/API/CLI (Next.js, React, Tailwind,
> jose, Zod, etc.). Para **pesquisa/exploração**, use o **MCP do Octocode**.

Plataforma de cursos **KIDS/infanto-juvenil (8–13 anos)** do Sistema Zero — segundo app de área
do aluno, irmão do [`@sistemazero/community`](../community/CLAUDE.md). Next.js 16 + React 19 +
Tailwind v4, porta **3008**. Visual vibrante (vibe Duolingo×Brilliant): light default, paleta
verde/laranja/roxo/azul-céu OKLch, radius 1rem, fontes **Baloo 2** (display) + **Nunito** (corpo)
+ Geist Mono (código), CTA "botão 3D" (sombra dura + afunda no clique), microinterações
`kid-pop`/`kid-wiggle` com `prefers-reduced-motion` global.

## A regra de ouro: quase tudo vem do member-shell

TODO o BFF (sessão/gateway/refresh/mídia/marca d'água/clients), a LÓGICA dos route handlers, o
proxy e os componentes de DOMÍNIO (player Vimeo, blocos, quiz, ebook 3D, anexos, progress-bar,
banner de impersonação, user-avatar) vêm do **[`@sistemazero/member-shell`](../member-shell/CLAUDE.md)**
— ver o CLAUDE.md de lá ANTES de mexer em qualquer comportamento de BFF/segurança (fix lá roda nos
DOIS apps). Este app define apenas:

- `src/server/shell.ts` → `createShell({ cookieBase: 'sz_kids', audience: 'kids', serviceName })`.
  **`audience: 'kids'`** = vitrine do members (listagens SÓ de cursos kids; curso kids fica FORA
  da chave-mestra adulta — acesso por matrícula específica, concedida pelo admin).
- `src/lib/cookies.ts` → **`sz_kids_*`** (≠ `sz_member_*`; compile-time DE PROPÓSITO — cookies não
  escopam por porta em dev, dá p/ logar nos dois apps lado a lado). `tests/cookies.test.ts` trava.
- `src/proxy.ts` → config + matcher literal. Prefixos protegidos: `/cursos`, `/perfil` (SEM
  `/compras` — não existe aqui).
- `src/app/globals.css` → tokens kids com os MESMOS NOMES do community (os componentes do
  ui/member-shell "vestem" o tema sozinhos) + `@source` do ui E do member-shell (obrigatório) +
  redefinições das classes consumidas pelos compartilhados (`lesson-prose` MAIOR, `.sz-progress`
  mais alta, `.sz-display` em Baloo 2, `sz-overlay/modal`, `scrollbar-subtle`).
- `src/components/kids/*` → identidade (topnav, user-menu, cards, catálogo, auth-shell).
- Route handlers = 1-3 linhas sobre `shell.routes.*` (idênticos ao community, MENOS payments).

## Diferenças deliberadas vs o community (decisões da v1, 06/2026)

1. **SEM `/compras`** (página, rota BFF e item do menu): compra é do RESPONSÁVEL — histórico
   financeiro não aparece na área da criança.
2. **SEM fluxo de classificação do curso** (course-rating-flow é community-only).
3. **Perfil SEM telefone** (aluno kids não tem telefone próprio; o contato é do responsável e
   vive na compra). A borda PATCH `/api/auth/me` do shell aceita OMITIR o campo.
4. **SEM `FUNNEL_URL`** (kids não tem funil na v1): curso bloqueado no catálogo sem
   `salesPageUrl` fica não-clicável — comportamento herdado.
5. **SEM `public/sw.js`** (kill-switch era cicatriz do domínio do community).
6. `/impersonar` EXISTE (suporte): o admin gera o handoff com `?platform=kids` no auth → a URL
   devolvida é a deste app. Gamificação (XP/streaks/badges) é fase 2 — NÃO improvisar.
7. **Branding em `public/` é PLACEHOLDER** (`logo_kids_dark|white.svg` = wordmark SVG de texto;
   favicons herdados do community) — trocar quando a marca kids existir.

## Comandos

`bun run dev` (:3008) · `build`/`start` · `typecheck` · `bun test` · `check[:fix]`.
Da raiz: `dev:kids`, **`build:kids` (package-local — gotcha do `--filter` quebrar o React)**,
`typecheck:kids`, `test:kids`. Mexeu no member-shell? Rode as suítes/builds DOS DOIS apps.

## Env / Deploy (Railway) — ⚠️ SERVIÇO AINDA NÃO CRIADO

Mesma matriz do community (ver o CLAUDE.md de lá): `GATEWAY_URL`, `JWT_JWKS_URL` (prod EXIGE; HS256
RECUSADO), `JWT_ISSUER/AUDIENCE`, `R2_*` (staging `testes`/`testes-privado`; prod
`comunidade-sistema-zero`/`-privado` — MESMOS buckets, avatar compartilhado por usuário),
`SENTRY_DSN` opcional (criar projeto `sistema-zero-community-kids` quando for a prod). **SEM
FUNNEL_URL.** Porta 3008; réplica ÚNICA (globalThis no shell); RAM como a do community (marca
d'água). `railway.json` pronto (Dockerfile, healthcheck `/api/healthz`, watchPatterns incl.
member-shell/ui).

**Passos pendentes de AUTORIZAÇÃO DO USUÁRIO (infra):**
1. Criar o serviço no Railway (fluxo GraphQL anti-config-errada do railway-deploy:
   `serviceCreate` SEM source → `serviceInstanceUpdate{railwayConfigFile:
   "packages/community-kids/railway.json"}` nos DOIS ambientes → `serviceConnect` repo@main →
   vars de staging → `serviceInstanceDeployV2` com sha da staging → `serviceDomainCreate`
   (targetPort 3008)).
2. `KIDS_COMMUNITY_URL` no serviço **auth** (staging = domínio staging do kids; prod =
   `https://kids.sistemazero.com.br` quando existir) + redeploy do auth.
3. ci.yml: somar `community-kids=<service-id>` ao mapa `SVC_ID` e trocar o no-op do case
   `packages/community-kids/*` por `add community-kids` (e somar kids aos cases member-shell/ui).
4. 1º deploy: verificar `sharp` no container (gotcha do tracing standalone — igual admin/community).
5. Domínio prod `kids.sistemazero.com.br` (dashboard + CNAME Cloudflare) — aí sim setar o
   KIDS_COMMUNITY_URL de prod.

## Checklist antes de finalizar

- [ ] `typecheck` + `bun test` + `check` + `bun run build:kids` limpos.
- [ ] Mexeu no member-shell? Suítes/build do community TAMBÉM.
- [ ] Nenhum `server/*`/`env` importado por Client Component.
- [ ] Mudou contrato? Atualizou este CLAUDE.md (e o do member-shell se a mudança foi lá).
