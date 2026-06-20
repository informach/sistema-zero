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
`kids-lesson-blocks.tsx` (chips de atividade Assista/Escute/Brinque/Leia o livro/**Crie** + molduras;
o bloco **`studio`** (chip "Crie") REUSA o `StudioBlockView` do member-shell — editor embarcado,
rascunho local, "Enviar para o professor" + gate de conclusão `STUDIO_GATE_NOT_SUBMITTED` (mesmo do
quiz, tratado no `lesson-player-client`); exige `@sistemazero/studio` em transpilePackages + `@source`
+ `frame-src blob:`;
⚠️ invariantes de segurança COPIADOS do shell: URL canônica de vídeo, sandbox SEM
allow-same-origin, markdown controlado — mexeu na segurança de bloco, replique nos DOIS
renderers), `kids-lesson-attachments.tsx` (mesma mecânica de download) e **`kids-quiz.tsx`
estilo Duolingo** (intro c/ mascote → UMA pergunta por vez c/ segmentos de progresso e cartas
de resposta → correção verde/vermelho no FINAL — o gabarito só chega na resposta do submit,
grading é server-side; cooldown/passingScore preservados; ⚠️ enunciado/opções/explicação são
MARKDOWN — `renderMarkdown` (bloco) no enunciado/explicação e `renderInline` nas opções e no
recap, pois o `<button>` só aceita conteúdo inline; imagens limitadas por `[&_img]:max-h-*`).
**Gamificação REAL implementada
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

## Perfis estilo Netflix (PR5) — quem vai aprender hoje?

O RESPONSÁVEL faz login (sessão da CONTA) e a borda manda escolher um **perfil de criança**
antes de entrar na área de aprender. `src/proxy.ts` seta `requireProfileSelectPath: '/perfis'`
(conta sem a claim `pfl` → redireciona p/ a grade) e `/perfis` entra nos `protectedPrefixes`
(isenta do gate, é a rota de seleção). A **grade** (`app/perfis/page.tsx` — FORA do grupo
`(app)`, sem a sidebar kids — + `perfis-client.tsx`): rostinhos clicáveis (selecionar = 1
clique → `/api/profiles/:id/select` → reload da home), **Área dos pais** (numa sessão de perfil
pede a SENHA do responsável → `/api/profile-session/exit`; numa sessão da conta gerencia direto:
criar/editar/arquivar + **foto** via `/api/profiles/:id/avatar`, multipart, FORA do matcher + a
**troca de senha da CONTA** — `ParentPasswordChange` → `/api/auth/me/password`, só na sessão da
conta, pois senha é da CONTA, não do perfil). ⚠️ **Full review 19/06: TODA mutação da CONTA exige o
portão** — `PATCH /api/auth/me` (nome/telefone) e `POST /api/me/avatar` (foto da conta) agora são
`requireParentGate` (antes eram shims pelados → uma criança numa sessão de conta desfigurava a
identidade do responsável); a troca de senha **FECHA o portão no sucesso** (`withParentClearedOnPasswordChange`);
`/api/parents/verify` ganhou cooldown por conta (5 erros → 60s). O limite de perfis é do plano (criar acima → 409 no
toast). Toda a lógica do BFF vive no **member-shell** (`shell.routes.profile*` + `shell.profiles`);
os `route.ts` são shims de 1-3 linhas. `getSession().activeProfile` indica a sessão de perfil ativa.
A página **"Meu perfil"** (`app/(app)/perfil`, sempre em sessão de perfil) edita o PRÓPRIO perfil
(nome ≥ 3 / foto / telefone) via `/api/profiles/:id` — NUNCA a conta (full review F1: o auth recusa
`/auth/me` de escrita em sessão de perfil).

## Clube dos Criadores + Mural dos Criadores (hub/fórum + vitrine)

**Renome (06/2026):** a antiga "Turma" (`/comunidade`) virou **Clube dos Criadores**
(`/clube-dos-criadores`, modo fórum) e ganhou um irmão **Mural dos Criadores**
(`/mural-dos-criadores`, modo `wall` = vitrine). Ambos são SERVIDORES do hub `course_gated`
(produto à parte) com `teaserWhenLocked` ON → aparecem no menu (`nav.ts`: itens "Clube" e "Mural")
mesmo sem acesso, e a UI mostra `KidsLockedSpace` (recado gentil, sem conteúdo) quando
`space.locked`. A rota antiga `/comunidade` foi REMOVIDA sem redirect (não há usuário real em prod
ainda — decisão do usuário). O componente único `components/kids/kids-space-view-client.tsx` (movido
de `app/(app)/comunidade`)
recebe `slug` + `mode`: no `wall` esconde o composer/sidebar e renderiza CARDS de projeto (capa +
título + resumo + "por {authorDisplayName}"); a criança só comenta (moderado) e reage. **Vitrine
(Mural):** os posts são auto-publicados ao concluir a última aula de um projeto — a
`LessonCelebration` ganha o botão "Publicar no Mural" (`PublishToMural`) que captura o print do jogo
no cliente (`@sistemazero/studio` `captureCoverFromProject` lendo o rascunho local
`sz-lesson-studio:<blockId>`) e faz `POST /api/hub/showcase` (multipart, FORA do matcher do proxy —
guard próprio via `requireUploadSession`); `lesson-player-client` propaga o `showcase` da resposta do
complete. **Compartilhar do Estúdio + link público jogável (06/2026):** o `StudioBlockView` da aula é
renderizado com `enableShare` (kids-only) → o editor ganha o botão **"Compartilhar"** na Topbar (publica no
Mural com **descrição gerada por IA** que a criança edita + um **link público de jogar**; o post é um
SNAPSHOT imutável e independente do rascunho que ela continua editando). O card do Mural
(`kids-space-view-client.tsx` `ShowcaseCard`/`ThreadDetail`) ganhou, quando há `thread.playId`, os botões
**"Jogar"** (abre `/jogar/<playId>` em nova aba) + **"Copiar link"** (`navigator.share` com fallback
clipboard) — a raiz do card deixou de ser `<button>` (âncora não aninha em button). A **página PÚBLICA**
`app/jogar/[id]/page.tsx` (FORA do grupo `(app)`, sem login, igual a `/perfis`) renderiza o
`StudioProjectPlayer` (subpath `@sistemazero/studio/player`, `ssr:false`) buscando o projeto em
`/api/studio/play/:id` — mostra SÓ o jogo + título, NUNCA o nome da criança. As rotas `/api/studio/{describe,
publish,play/[id]}` são shims sobre `shell.routes.studio*`; o `proxy.ts` exclui `api/studio/publish`
(multipart) e `api/studio/play` (stream público) do matcher (`api/studio/describe` FICA no matcher — ganha
o anti-CSRF same-origin). **Data de nascimento (controle de idade):** os pais informam no `ProfileForm` da Área dos
pais (`app/perfis`) — `<input type=date>`; só a CONTA edita (o auth recusa em sessão de perfil).

### Hub/fórum (compartilhado)

Porta kids do fórum compartilhado (`@sistemazero/hub` via member-shell). A LÓGICA do
BFF (clients do hub, **redação do `authorId` de terceiros**, validação Zod de
título/corpo/emoji/motivo) vive no **member-shell** (`createHubRoutes`); os `route.ts`
em `src/app/api/hub/*` são shims de 3 linhas e `/clube-dos-criadores` +
`/mural-dos-criadores` entram nos `protectedPrefixes` do `proxy.ts`. A UI é PRÓPRIA
(tom kids): `app/(app)/clube-dos-criadores/page.tsx` e
`app/(app)/mural-dos-criadores/page.tsx` → `kids-space-view-client.tsx`
(canais, tópicos, respostas, reações OTIMISTAS com allowlist de emojis, "Avisar
professor" por modal — sem `window.prompt` —, anexos via `AttachmentUploader`/
`AttachmentList` do shell, paginação por cursor: query **`cursor`** p/ tópicos e
**`after`** p/ respostas — casam com os route handlers). **Privacidade (NÃO
regredir):** o BFF redige o `authorId` de terceiros; a UI só rotula "Você"/"Colega"
comparando com o `viewerId` da sessão (ninguém EXIBE id). Corpo de tópico/resposta =
**`renderUgcMarkdown`** (modo RESTRITO — full review 19/06: SEM `<img>` externo, que seria
pixel-rastreador entre crianças, e links só como TEXTO; o write do hub ainda strippa `![](…)` na
origem). Imagem legítima segue pelo anexo re-encodado. ⚠️ Em corpo de ALUNO use `renderUgcMarkdown`,
NUNCA `renderMarkdown` direto (este é p/ conteúdo do admin: rich_text/quiz, com imagem liberada). Item "Turma"
no `nav.ts` (sidebar + tab bar). ⚠️ **Corpo é OBRIGATÓRIO** no envio (schema do hub
`body.min(1)`): o botão "Responder" exige `replyBody.trim()` — não habilitar só com
anexo (o servidor recusaria).

## Diferenças deliberadas vs o community (decisões da v1, 06/2026)

1. **Compras só na ÁREA DOS PAIS** (não no menu da criança): NÃO há página `/compras` nem item
   de menu, mas o RESPONSÁVEL vê o histórico numa sub-tela de `/perfis` (modo gestão, atrás do
   portão de senha) — shim `app/api/payments/my` gateado por **`requireParentGateAccountOnly`**
   (estrito: a sessão de perfil herda o e-mail do responsável → a criança é RECUSADA, 403) sobre
   `shell.routes.paymentsMy`; UI `PurchasesView` no `perfis-client` (Fase 3b, 06/2026). Antes
   o kids não tinha NADA de compras; agora tem, mas escopado ao responsável.
2. **Classificação do curso INCLUÍDA (decisão do usuário, 06/2026)**: porta kids do fluxo de 5
   modais do community (`course-rating-flow.tsx` próprio, copy em tom kids + mascote; rota shim
   `/api/members/courses/[slug]/rating` compartilhada). Compartilhar usa SÓ `salesPageUrl` do
   curso (kids segue SEM `FUNNEL_URL`).
3. **Telefone agora é DO PERFIL** (decisão do usuário, 06/2026 — antes o perfil kids não tinha
   telefone): a criança edita nome/foto/**telefone** (`whatsapp` do perfil) na página "Meu
   perfil" via `/api/profiles/:id`. O telefone do RESPONSÁVEL segue na compra (não se mistura).
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
- **Perfil = "Meu perfil" da CRIANÇA (full review F1, 06/2026):** a página edita o PRÓPRIO
  PERFIL (não a conta). 1 card de identidade — foto CLICÁVEL (único caminho de troca, via
  `/api/profiles/:id/avatar`), nome + telefone do perfil + **colocação no ranking kids**
  (`getGamificationReadonly({withRanking: true})` → `ranking.position/totalStudents`; rankings
  adult/kids separados) — e botão "Editar perfil" abrindo um Dialog com nome (≥ 3) + telefone,
  que PATCHa `/api/profiles/:id`. O perfil ativo é resolvido de `listReadonly()` por `id ==
  session.id`. **E-mail e SENHA da conta saíram daqui** (são da CONTA): a troca de senha vive na
  **Área dos pais** (`/perfis`, sessão da conta → `ParentPasswordChange`).

**Backlog da gamificação:** ligas (precisa de massa de alunos), revisão de aula estende streak?,
vitrine no community adulto (campos já chegam — decisão de produto).

## Full review (segurança + desempenho — lente infantil) — 19/06/2026

Auditoria focada em segurança/desempenho de uma comunidade com área de membros para crianças
9–13. TODOS os achados corrigidos (a maioria no member-shell compartilhado → roda nos DOIS apps;
verde no typecheck/test/check dos três pacotes). Mudanças de COMPORTAMENTO/contrato:

- **UGC sem pixel-rastreador (HIGH):** corpo de tópico/comentário do hub renderiza por
  `renderUgcMarkdown` (sem `<img>` externo nem link clicável) + strip de imagem no write
  (`stripImageMarkdown`). Ver "### Hub/fórum".
- **Nada de PII de criança a terceiro:** o Sentry redige `path` (UUID do perfil → `:id`, sem query)
  e mensagem/stack — `redactPii`/`scrubPath` (member-shell).
- **Portão dos pais cobre TODA mutação da conta** (auth/me, me/avatar, me/password — que fecha o
  portão no sucesso —, payments/my + children-stats estritos, verify com cooldown). Ver "Perfis…".
- **`profileAvatar` autoriza ANTES de gravar no R2** (criança só troca a própria foto; UUID validado).
- **Borda:** UUID validado em todos os path ids de perfil/hub; headers **COOP/CORP** nos dois apps;
  `watermarkImage` com `limitInputPixels` (anti OOM da réplica única).
- **Desempenho:** `React.cache()` deduplica `getMeReadonly`/`getGamificationReadonly` por request; o
  **layout transmite o `loading.tsx` via `<Suspense>`** (chrome de avatar/gamificação carrega atrás,
  mantendo `withRanking` — o menu do avatar usa o ranking no lugar do e-mail); busca do catálogo com
  **debounce** (`use-catalog-filters` — estado local instantâneo, URL espelhada com atraso);
  `ReactionBar`/`CommentRow` memoizados; `<img>` de aula com `aspect-ratio` (sem CLS); "Avisar
  professor" com alvo de toque ≥44px + ícone.
- **Produto (não-bug, decisão pendente):** perfis irmãos NÃO têm PIN (1 clique troca de perfil);
  PIN numérico segue como futuro.

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
`SENTRY_DSN` opcional, **`OPENROUTER_API_KEY` + `OPENROUTER_MODEL`** (opcionais — descrição IA do
"Compartilhar"; ausentes → fallback, a criança escreve). **SEM FUNNEL_URL.** Porta 3008; réplica ÚNICA (globalThis no shell);
healthcheck `/api/healthz`.

**Pendências de infra (não bloqueiam):** domínio definitivo `kids.sistemazero.com.br`
(dashboard + CNAME Cloudflare; depois apontar o `KIDS_COMMUNITY_URL` de prod p/ ele) e projeto
Sentry `sistema-zero-community-kids` + DSN no host.

## Checklist antes de finalizar

- [ ] `typecheck` + `bun test` + `check` + `bun run build:kids` limpos.
- [ ] Mexeu no member-shell? Suítes/build do community TAMBÉM.
- [ ] Nenhum `server/*`/`env` importado por Client Component.
- [ ] Mudou contrato? Atualizou este CLAUDE.md (e o do member-shell se a mudança foi lá).
