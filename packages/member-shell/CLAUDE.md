# CLAUDE.md — @sistemazero/member-shell

> **⚠️ Antes de QUALQUER mudança, consulte a doc ATUALIZADA via MCP do Context7**
> (`resolve-library-id` → `query-docs`) para toda lib/framework/API/CLI (Next.js, React, jose, Zod,
> sharp, etc.) — não confie só na memória; APIs mudam. Para **pesquisa, exploração e entender
> padrões**, use o **MCP do Octocode** em repositórios GitHub relevantes.

Núcleo COMPARTILHADO dos apps de área do aluno (**community** = adulto e **community-kids** =
infanto-juvenil). Extraído do `@sistemazero/community` em 06/2026 (regra do usuário: código
reutilizável NUNCA é cópia por app). Consumido como **TS source** via `exports` map (modelo do
`@sistemazero/core`); os apps precisam de `transpilePackages: ['@sistemazero/member-shell']` e
`@source "../../../member-shell/src"` no globals.css (Tailwind v4 só gera classes que o scanner vê).

## O que vive aqui vs no app

| Aqui (shell) | No app |
|---|---|
| BFF: sessão/gateway/refresh/clients/mídia/downloads (marca d'água) | `server/shell.ts` (1 chamada `createShell`) + shims |
| Route handlers (`createShellRoutes`) — a LÓGICA inteira de `/api/*` | `route.ts` de 1-3 linhas (`export const { POST } = shell.routes.x`) |
| `createMemberProxy` (anti-CSRF + gate + rotação pré-render) | `proxy.ts` com config do app + `matcher` LITERAL |
| Libs puras (csrf, download-mime, act, format, markdown, types, api, cn…) | — |
| Componentes de DOMÍNIO (vimeo-player, lesson-blocks, quiz-block, ebook 3D, anexos, progress-bar, impersonation-banner, user-avatar) — 100% em tokens CSS, vestem o tema do app | Componentes de IDENTIDADE (topnav, user-menu, cards, auth-shell) + globals.css/tokens |
| Helpers de cookie (`sessionCookieNames`/`prefixedCookieName`/`expireCookieOptions`) | CONSTANTES `sz_member_*`/`sz_kids_*` (compile-time POR APP — cookies não escopam por porta em dev) |
| `scripts/boot-check.mjs` (fail-fast REAL de prod — os Dockerfiles dos apps copiam DAQUI) | `instrumentation.ts` (fail-fast de dev, autocontido) |

## Invariantes (NÃO quebrar)

1. **Parametrização é por FACTORY, nunca por config em escopo de módulo**: o Turbopack separa
   proxy/RSC/handlers em bundles com cópias próprias dos módulos — cada app chama
   `createShell({ cookieBase, audience, serviceName })` no SEU `server/shell.ts` (re-executado por
   bundle com a MESMA config estática). O estado compartilhado REAL (single-flight do refresh,
   gate da marca d'água, JWKS) vive em **`globalThis` via `Symbol.for` DENTRO dos módulos daqui**
   — nunca em closure de factory.
2. **`createShell` NÃO pode tocar o `getEnv()` (zod) em module scope** — roda no import do
   wrapper de cada app e o `next build` (page data collection) explode com env de dev sob
   `NODE_ENV=production`. Cookie names usam `process.env.NODE_ENV` direto; o zod valida no
   primeiro USO real.
3. A única variação entre os apps no BFF é: nomes de cookie (`cookieBase`), vitrine do members
   (`audience: 'adult' | 'kids'` — SÓ listagens) e prefixos protegidos do proxy. Todo o resto lê
   `process.env` (por serviço no Railway) — NÃO adicione parametrização especulativa.
4. Segurança load-bearing herdada do community (ver `packages/community/CLAUDE.md` p/ o histórico
   completo): cookies `__Host-` em prod (remoção via `expireCookieOptions` — `delete()` pelado não
   desloga), single-flight do refresh (reuse-detection do auth revoga a família), anti-CSRF
   same-origin via Sec-Fetch-Site, guard de mídia ESTRITO (exp NÃO autoriza), gate de concorrência
   da marca d'água (OOM), arquivos >20MB = 302 pré-assinado (downloads-zumbi), storageRef NUNCA ao
   browser. **Fix aqui = fix nos dois apps; mudança aqui RODA NOS DOIS — rode as suítes dos dois.**
5. Réplica ÚNICA por app (single-flight/gate em `globalThis` são por processo).

## Comandos

`bun run typecheck` · `bun test` (10 suítes — as movidas do community) · `bun run check[:fix]`.
Os railway.json do community (e do kids) têm `/packages/member-shell/**` nos watchPatterns e o
ci.yml mapeia `packages/member-shell/*` → deploy dos apps consumidores — mudou aqui, redeploya lá.

## Checklist antes de finalizar

- [ ] `typecheck` + `bun test` AQUI **e nos apps consumidores** (community; kids quando existir) + `check` limpos.
- [ ] `bun run build:community` passa (e `build:kids` quando existir).
- [ ] Mudou contrato (factory/handler/componente)? Atualizou este CLAUDE.md e o(s) do(s) app(s).
