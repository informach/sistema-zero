# CLAUDE.md — @sistemazero/community-kids

> **⚠️ Antes de QUALQUER mudança, consulte a doc ATUALIZADA via MCP do Context7**
> (`resolve-library-id` → `query-docs`) para toda lib/framework/API/CLI (Next.js, React, Tailwind,
> jose, Zod, etc.). Para **pesquisa/exploração**, use o **MCP do Octocode**.

Plataforma de cursos **KIDS/infanto-juvenil (8–13 anos)** do Sistema Zero — segundo app de área
do aluno, irmão do [`@sistemazero/community`](../community/CLAUDE.md). Next.js 16 + React 19 +
Tailwind v4, porta **3008**. Visual "estilo Duolingo" (redesign 06/2026) com a **PALETA DA MARCA**
(mesma do comunidade-sistema-zero: light = cyan `oklch(0.52 0.14 200)` sobre off-white; dark =
lime neon `#C4F042` sobre `#0D1117`; acentos SÓ cyan/lime/vermelho — sem hues novos), radius 1rem,
fontes **Baloo 2** (display) + **Nunito** (corpo) + Geist Mono (código), CTA "botão 3D" (sombra
dura + afunda no clique), microinterações `kid-pop`/`kid-wiggle`/`kid-float` com
`prefers-reduced-motion` global. **Layout próprio (≠ community)**: sidebar fixa no desktop + top
bar/tab bar no mobile (`app-sidebar.tsx`/`mobile-nav.tsx`), home com mascote + card-herói
"Continuar" (`continue-hero.tsx`), **trilha serpenteante** no detalhe do curso
(`course-trail.tsx` + `trail-layout.ts` puro/testado: módulo = unidade temática
cyan→lime→gradiente via `unit-theme.ts`, aula = nó circular; trilha LIVRE — estado é só visual,
todos os nós clicáveis; sem ícone por tipo: a outline não expõe blocos) e **celebração** ao
concluir aula (`lesson-celebration.tsx`: mascote + confete CSS puro + barra antes→depois; o
`complete()` não-silent abre o overlay em vez de navegar; auto-complete a ~90% segue só com
toast). **Mascote-faísca** = estrela da logo com rosto (`mascot.tsx`, expressions
happy/celebrating/thinking/sleeping; `useId` p/ o gradiente). **Página de aula kids (2ª rodada
06/2026)**: header de "lição" (voltar em círculo + progresso + chip AULA N DE M), sidebar =
mini-trilha numerada por unidade, e FORKS DE APRESENTAÇÃO dos renderers do member-shell —
`kids-lesson-blocks.tsx` (chips de atividade Assista/Escute/Brinque/Leia o livro + molduras;
⚠️ invariantes de segurança COPIADOS do shell: URL canônica de vídeo, sandbox SEM
allow-same-origin, markdown controlado — mexeu na segurança de bloco, replique nos DOIS
renderers), `kids-lesson-attachments.tsx` (mesma mecânica de download) e **`kids-quiz.tsx`
estilo Duolingo** (intro c/ mascote → UMA pergunta por vez c/ segmentos de progresso e cartas
de resposta → correção verde/vermelho no FINAL — o gabarito só chega na resposta do submit,
grading é server-side; cooldown/passingScore preservados). **Gamificação REAL implementada
(11/06/2026)** — ver §"Gamificação estilo Duolingo" abaixo; nada fake, estado no members.

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
- `src/components/kids/*` → identidade (sidebar/tab bar, user-menu, logo, mascote, cards,
  trilha, celebração, catálogo, auth-shell).
- Route handlers = 1-3 linhas sobre `shell.routes.*` (idênticos ao community, MENOS payments).

## Diferenças deliberadas vs o community (decisões da v1, 06/2026)

1. **SEM `/compras`** (página, rota BFF e item do menu): compra é do RESPONSÁVEL — histórico
   financeiro não aparece na área da criança.
2. **Classificação do curso INCLUÍDA (decisão do usuário, 06/2026)**: porta kids do fluxo de 5
   modais do community (`course-rating-flow.tsx` próprio, copy em tom kids + mascote; rota shim
   `/api/members/courses/[slug]/rating` compartilhada). Compartilhar usa SÓ `salesPageUrl` do
   curso (kids segue SEM `FUNNEL_URL`).
3. **Perfil SEM telefone** (aluno kids não tem telefone próprio; o contato é do responsável e
   vive na compra). A borda PATCH `/api/auth/me` do shell aceita OMITIR o campo.
4. **SEM `FUNNEL_URL`** (kids não tem funil na v1): curso bloqueado no catálogo sem
   `salesPageUrl` fica não-clicável — comportamento herdado.
5. **SEM `public/sw.js`** (kill-switch era cicatriz do domínio do community).
6. `/impersonar` EXISTE (suporte): o admin gera o handoff com `?platform=kids` no auth → a URL
   devolvida é a deste app. Gamificação é a fase 2 (ver seção própria) — NÃO improvisar
   contadores fake no meio-tempo.
7. **Branding (06/2026)**: logo = wordmark OFICIAL (`public/logo_dark|white.svg`, copiados do
   community) + selo "kids" composto em HTML (`kids-logo.tsx` — SVG via `<img>` não carrega
   webfont, por isso o selo vive no DOM); `public/logo_kids_*.svg` são o fallback ESTÁTICO de
   marca (letras desenhadas em paths, nunca `<text>`). Favicons herdados do community DE
   PROPÓSITO (decisão: mesmo favicon).

## Gamificação estilo Duolingo (Fase 2 — IMPLEMENTADA 11/06/2026)

Streak diário + XP + badges + baús, **estado 100% no members** (tabelas/regras/idempotência no
[CLAUDE.md de lá](../members/CLAUDE.md), §Gamificação — fonte da verdade do contrato). Decisões
do usuário: **SEM corações/vidas**; XP = aula 10 · quiz aprovado 20+bônus por nota (cap +10) ·
baú de unidade 25; ligas/lojinha = fora. Streak em **America/Sao_Paulo**, SEMPRE no backend;
conta qualquer atividade que rende XP.

**Fluxo de dados:** o delta vem NA RESPOSTA das ações (complete/quiz →
`gamification: {xpAwarded, totalXp, streak, badgesUnlocked[], unitCompleted}`; `null` = award
falhou, fail-open — a UI degrada para o comportamento antigo) + `GET /members/gamification/me`
p/ widgets. Server Components usam **`getGamificationReadonly()`** (best-effort, mesmo padrão
do avatar: 401 → widget some); rota BFF `/api/members/gamification/me` = 1 linha sobre
`shell.routes.gamificationMe`. Rota nova no gateway: `members-gamification-me`.

**Onde a UI vive (tudo com tokens da marca + `prefers-reduced-motion`):**
- `badges.ts` — APRESENTAÇÃO das badges (`BADGE_INFO` título/copy/ícone por `BadgeSlug`); o
  catálogo/detecção é do members. Slug desconhecido → `badgeInfo()` devolve null e a UI ignora
  (forward-compat).
- `lesson-celebration.tsx` — overlay ganhou `gamification` (chip +XP, fogo do streak com
  destaque quando `extended`, "abriu o baú da unidade", badges); `xpAwarded: 0`/`null` →
  overlay antigo. O `lesson-player-client` agora LÊ a resposta do complete (estado
  `celebration = {progress, gamification}`); auto-complete a ~90% vira toast `+N XP`.
- `kids-quiz.tsx` — tela de aprovado mostra chip +XP e badges destravadas (vêm na resposta do
  submit).
- `course-trail.tsx` + `trail-layout.ts` — nó de BAÚ no fim de cada unidade (`TrailUnit.chest`,
  derivado client-side: todas as aulas do módulo `completed`; o índice global do serpenteado
  avança TAMBÉM no baú — offsets consecutivos seguem diferindo de 1, travado em teste).
  Fechado = tracejado neutro; aberto = tema da unidade (`kids-node--chest-{open,closed}` no
  globals). Não-clicável. ⚠️ o label "+25 XP" do baú aberto espelha o XP_VALUES do members.
- `streak-widget.tsx` — sidebar (cheio) + `MobileTopbar` (compact): fogo aceso (vermelho
  `--sz-hot`) quando `activeToday` + XP total. O layout busca via `Promise.all` com o avatar.
- `streak-card.tsx` — card da home (só com cursos liberados E gamificação disponível).
- `badge-showcase.tsx` — vitrine do perfil: catálogo completo, bloqueada = tracejada+cadeado,
  desbloqueada = cor da marca + data.
- **Perfil (redesign 06/2026, decisão do usuário):** 1 card de identidade — foto CLICÁVEL
  (único caminho de troca, sem botão "Trocar foto" nem título), nome + e-mail + **colocação no
  ranking kids** (`getGamificationReadonly({withRanking: true})` → `ranking.position/totalStudents`;
  rankings adult/kids são separados — contrato no CLAUDE.md do members) — e botão "Editar
  perfil" abrindo o Dialog compartilhado com os DOIS cards (Dados pessoais + Alterar senha),
  que saíram da página.

**Backlog da gamificação:** ligas (precisa de massa de alunos), revisão de aula estende streak?,
vitrine no community adulto (campos já chegam — decisão de produto).

## Comandos

`bun run dev` (:3008) · `build`/`start` · `typecheck` · `bun test` · `check[:fix]`.
Da raiz: `dev:kids`, **`build:kids` (package-local — gotcha do `--filter` quebrar o React)**,
`typecheck:kids`, `test:kids`. Mexeu no member-shell? Rode as suítes/builds DOS DOIS apps.

## Env / Deploy (Railway) — EM PRODUÇÃO desde 12/06/2026

Serviço `community-kids` (id `fc8a1b29-ac14-4dc9-a7b3-03d497b8bf4f`) NO AR nos dois ambientes:
**staging** `https://community-kids-staging.up.railway.app` (deploy automático via job
`deploy-staging` do ci.yml — kids está no mapa `SVC_ID` e nos cases member-shell/ui) e
**produção** `https://community-kids-production.up.railway.app` (deploy manual, como os demais).
`KIDS_COMMUNITY_URL` SETADA no auth dos dois ambientes. Matriz de env = a do community (ver o
CLAUDE.md de lá): `GATEWAY_URL`, `JWT_JWKS_URL` (prod EXIGE; HS256 RECUSADO),
`JWT_ISSUER/AUDIENCE`, `R2_*` (staging `testes`/`testes-privado`; prod
`comunidade-sistema-zero`/`-privado` — MESMOS buckets, avatar compartilhado por usuário),
`SENTRY_DSN` opcional. **SEM FUNNEL_URL.** Porta 3008; réplica ÚNICA (globalThis no shell);
healthcheck `/api/healthz`.

**Pendências de infra (não bloqueiam):** domínio definitivo `kids.sistemazero.com.br`
(dashboard + CNAME Cloudflare; depois apontar o `KIDS_COMMUNITY_URL` de prod p/ ele) e projeto
Sentry `sistema-zero-community-kids` + DSN no host.

## Checklist antes de finalizar

- [ ] `typecheck` + `bun test` + `check` + `bun run build:kids` limpos.
- [ ] Mexeu no member-shell? Suítes/build do community TAMBÉM.
- [ ] Nenhum `server/*`/`env` importado por Client Component.
- [ ] Mudou contrato? Atualizou este CLAUDE.md (e o do member-shell se a mudança foi lá).
