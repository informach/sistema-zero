# Gamificação Kids — manual mestre (operação + desenvolvimento)

> Fonte da verdade da **gamificação da plataforma infantil** (`@sistemazero/community-kids`):
> XP, sequência (streak), conquistas, moeda **Zappy Coins**, avatar, quarto virtual,
> missões, proteção de sequência, ligas semanais e perfil público. Cobre o "porquê"
> (ética/filosofia), o "onde mora" (arquitetura) e — o mais importante — **como ALTERAR
> cada regra** (qual constante, em qual arquivo).
>
> O "como funciona por dentro" detalhado de cada serviço também está nos `CLAUDE.md` dos
> pacotes ([members](../packages/members/CLAUDE.md) — dono das regras, [auth](../packages/auth/CLAUDE.md) —
> identidade/perfis, [hub](../packages/hub/CLAUDE.md) — fórum/Mural). Este documento é a
> visão TRANSVERSAL: uma regra atravessa vários pacotes, e aqui ela está inteira.
>
> Convenção deste doc: cada regra cita `arquivo:símbolo` e o **valor exato**. Quase tudo
> é constante calibrável — mudar é trivial e o deploy é atômico (catálogos em código).

---

## 1. Visão geral & filosofia

A gamificação kids foi desenhada com ética **embutida no código**, não como política
externa. Os princípios (travados com a usuária em 06/2026) e onde cada um se materializa:

| Princípio | Como o código garante |
|---|---|
| **Gasto é SÓ cosmético — zero pay-to-win** | A moeda Zappy só compra peça de avatar, item de quarto e protetor de sequência. Não há item que afete aprendizado/nota/acesso. O `CoinSpendReason` (`gamification-repository.port.ts`) só tem `spend_cosmetic`/`spend_room`/`spend_streak_freeze`. |
| **Identidade nunca custa** | Rosto, olhos, sobrancelha e nariz do avatar são **100% grátis** (`AVATAR3D_PARTS` em `avatar3d-catalog.ts`) — "ninguém paga para ser alguém". O hook de moeda está em cabelo/barba/óculos/chapéu/roupas/acessórios. |
| **Teto diário de ganho** (anti-grind/anti-compulsão) | `DAILY_COIN_CAP = 100` (`coins.ts`) limita o GANHO de rotina por dia civil SP — **nunca o saldo**. Marcos raros (streak) são EXEMPTOS. |
| **Sem loot box / sem aleatoriedade no ganho** | Tudo é determinístico: preço fixo no catálogo, missão sorteada por hash estável (sem `Math.random`), nenhuma "caixa surpresa". |
| **Nunca envergonhar a quebra de sequência** | Freeze grátis mensal + freeze comprável + **modo férias** (guilt-free). A sequência só QUEBRA quando NEM férias NEM protetores cobrem (`advanceStreak`). |
| **Ranking/liga amigável e opcional** | A coorte do ranking só existe com matrícula; o board da liga **nunca expõe userId de terceiros** (só posição/XP + `isMe`); abaixo de 5 jogadores a semana é AMISTOSA (ninguém cai). |
| **Sem PII no perfil público** | O perfil público só mostra dado de JOGO (XP/ranking/conquistas/avatar/quarto). E-mail, telefone, nascimento e conta **nunca** passam pela rota. O nome só aparece se os pais ligarem o opt-in. |

Princípio de design que sustenta tudo: **o domínio é PURO** (sem I/O, sem `Date.now`) — o
"dia" e o "agora" entram sempre de fora (clock injetado), o que torna as regras testáveis e
o comportamento reprodutível.

---

## 2. Arquitetura — onde tudo vive

A gamificação atravessa 6 pacotes, cada um com um papel ÚNICO:

| Pacote | Papel | O que NÃO faz |
|---|---|---|
| **`@sistemazero/members`** (porta 3004) | **Dono das REGRAS e do ESTADO.** Calcula XP/streak/moeda/badge, guarda carteira/inventário/quarto, valida compra/equipar. Fonte da verdade do "existe + custa + possui". | Não renderiza nada; não conhece roles (vêm do auth via header). |
| **`@sistemazero/community-kids`** | **APRESENTAÇÃO.** Rótulo PT, emoji, animação CSS, render 3D do avatar (R3F), widgets de XP/streak/missões/liga/quarto/avatar. Casa pelo MESMO `id` do members. | Nunca decide preço/posse; o servidor é o portão. |
| **`@sistemazero/member-shell`** | **BFF** (Backend-for-Frontend). Shims `/api/members/*` e `/api/crianca/*` que o app kids chama; injeta sessão e repassa ao gateway. | Não tem regra de negócio. |
| **`@sistemazero/api-gateway`** (porta 3000) | **Borda.** Autentica JWT, aplica RBAC + rate limit, injeta `X-Auth-User-*` + `x-internal-token` confiáveis e remove os de entrada (anti-spoof). | Não calcula gamificação. |
| **`@sistemazero/auth`** (porta 3002) | **Identidade + perfis** (estilo Netflix). Dona da flag `public_profile_enabled` (opt-in dos pais) e do nome do perfil; emite o claim `pfl {accountId, name, pub}`. | Não guarda XP/moeda. |
| **`@sistemazero/hub`** (porta 3010) | **Fórum + Mural.** Autor das threads/comentários; guarda o snapshot de nome + flag pública por post (nomes clicáveis). | Não calcula gamificação; só transporta o snapshot. |

Decisões arquiteturais transversais (valem para TODOS os subsistemas):

- **Catálogos EM CÓDIGO, sem seed em prod.** Badges, peças de avatar, itens de quarto e
  missões são arrays em código (`BADGE_SLUGS`, `AVATAR3D_PARTS`, `ROOM_ITEMS`/`ROOM_THEMES`,
  `DAILY_MISSIONS`/`WEEKLY_MISSIONS`). O `preDeployCommand` de produção roda **só
  `db:migrate`** (sem seed) — o catálogo muda JUNTO com o código que o detecta. Deploy
  atômico, zero drift. As tabelas só guardam **quem destravou/possui/comprou** (`user_badges`,
  `avatar_inventory`, `room_inventory`).
- **Tudo segregado por AUDIÊNCIA** (`kids` ≠ `adult`). Toda linha de gamificação carrega
  `audience`; perfil/streak/badges/moeda/missões/liga/ranking kids e adult **nunca se
  misturam**. A audiência vem do CURSO no momento do award.
- **Sem `Date.now` no domínio.** O instante entra como `clock()`/`now`/`today`; o "dia" é
  sempre a **data civil de São Paulo** (`localDateSaoPaulo`, fuso fixo, vira às 03:00Z).
- **Advisory lock POR ALUNO.** Toda escrita de gamificação (award/spend/claim/buy-freeze)
  roda em transação serializada por `pg_advisory_xact_lock(hashtextextended('gamification:'+userId, 0))`
  — namespace `gamification:` distinto do lock de quiz. Serializa o read-then-write do perfil.

---

## 3. XP & sequência (streak)

Núcleo PURO em `packages/members/src/domain/gamification/gamification.ts`.

### Valores de XP

| Atividade | XP | Constante (`XP_VALUES`, `gamification.ts`) |
|---|---|---|
| Aula concluída | **10** | `XP_VALUES.LESSON_COMPLETE` |
| Quiz aprovado (base) | **20** | `XP_VALUES.QUIZ_PASSED_BASE` |
| Bônus de nota do quiz (cap) | **+10** | `XP_VALUES.QUIZ_SCORE_BONUS_MAX` |
| Baú de fim de unidade (módulo 100%) | **25** | `XP_VALUES.UNIT_COMPLETE` |
| Pensa: etapa Z/E/R concluída (advance) | **15** | `XP_VALUES.PENSA_STAGE_COMPLETE` |
| Pensa: ciclo lançado (o→done) | **30** | `XP_VALUES.PENSA_CYCLE_COMPLETE` |
| Clube: tópico aprovado pela equipe | **+5** | `XP_VALUES.CLUBE_THREAD` |
| Clube: comentário aprovado pela equipe | **+3** | `XP_VALUES.CLUBE_COMMENT` |

**Pensa (07/2026):** o award roda DENTRO do `advance-stage` do Pensa (fail-open, delta na
resposta como o complete). Moedas: 5 por etapa / 15 por ciclo (`COIN_VALUES`, contam no teto
diário). Idempotência: `xp_events.source_id` é uuid, então cada ETAPA usa um uuid
DETERMINÍSTICO derivado de `(cycleId, stage)` (`pensaStageSourceId`, uuid v5-like em
`domain/pensa/gamification.ts`); o ciclo usa o próprio `cycleId`. O fechamento o→done credita
SÓ `pensa_cycle_complete` (sem stage duplicado). Migration `0032_zippy_runaways` (ADD VALUE nos
enums `xp_source_type` E `coin_source_type`).

**Clube dos Criadores (07/2026):** o Clube (fórum kids no hub) premia SÓ conteúdo **APROVADO
pela equipe** — nunca no envio (bloqueia farm de post e não paga o rejeitado). Tópico rende
**+5 XP** (`clube_thread`) e comentário **+3 XP** (`clube_comment`) — é **XP puro, SEM moeda
Zappy**: não há torneira para farmar, `clube_*` não entra em `coin_source_type`. Como é
`amount > 0`, **MOVE o streak** (voltar ao Clube conta como dia ativo, igual a uma aula).
Idempotente pelo `contentId` no ledger (`xp_events.source_id`) — re-aprovar (hide→approve) é
inerte. O award roda por **webhook**: o `ModerationService.approveThread`/`approveComment` do hub
dispara `POST /members/webhooks/clube` (HMAC + dedupe, padrão do `/showcase`/`/challenge`) SÓ para
audiência **kids**, e o members chama `AwardGamificationService.awardClubeContribution`
(`privileged: false`). Migration `0036` (ADD VALUE `clube_thread`/`clube_comment` só no
`xp_source_type` — **não** toca `coin_source_type`).

Fórmula do quiz (`quizPassedXp`): `20 + min(10, max(0, round(score/10)))`. Exemplos:
score 100 → 30; score 50 → 25; score 0 → 20.

**Como alterar:** editar o objeto `XP_VALUES` (linhas 4–11) — é `as const`, calibrado em
06/2026. Para mudar a curva do bônus, mexer no divisor `score/10` em `quizPassedXp`.

### O dia civil (timezone)

- `SP_DATE_FORMAT` (`gamification.ts:21`) = `Intl.DateTimeFormat('en-CA', {timeZone:'America/Sao_Paulo'})`.
  O `en-CA` é **deliberado** — é o locale que formata `YYYY-MM-DD`. O dia vira ~**03:00Z**
  (SP é UTC-3 fixo, sem DST desde 2019).
- `previousDay` usa aritmética **UTC pura** (`T00:00:00Z` + `setUTCDate -1`) para ser imune a DST.
- **Como alterar o fuso:** trocar `timeZone` em `SP_DATE_FORMAT`. **Não troque o locale
  `en-CA`** — quebraria o formato `YYYY-MM-DD` e toda a aritmética de comparação de datas
  (que compara strings lexicograficamente).

### Como o streak avança (`advanceStreak`)

O avanço acontece SÓ na **1ª atividade que rende XP do dia** (`amount > 0`):

| Caso | Resultado |
|---|---|
| Mesmo dia (`lastActivityDate === today`) | mantém; `extended=false`; não reconta |
| 1ª atividade da vida (`lastActivityDate === null`) | `current=1`; `extended=true` |
| Ontem, ou gap coberto por férias/freezes | `current+1`; consome `freezesNeeded` protetores; `extended=true` |
| Gap NÃO coberto (need > freezes) | **recomeça em 1**; `extended=true` |

Invariantes: `best` (recorde) **nunca regride** (`Math.max` em todo branch). `extended=true`
significa "ESTA atividade mexeu na sequência" (incluindo o reset para 1) — **não** que o
número subiu.

`effectiveStreak` é o streak de **EXIBIÇÃO**: projeta `0` quando a cobertura por férias/freezes
acabou, **sem zerar o valor persistido** (o reset real só ocorre na próxima atividade via
`advanceStreak`). É o que o `GET /gamification/me` devolve em `streak.current`.

**Como alterar a lógica:** editar os branches de `advanceStreak` (linhas 90–113). Ver §9 para
freezes/férias.

### Marcos de streak → conquistas

`STREAK_BADGES` (`gamification.ts:127`): `7→streak-7`, `30→streak-30`, `60→streak-60`,
`180→streak-180`, `365→streak-365`. `streakBadgeSlugs(current)` devolve todos com
`current >= days` (idempotente — o ledger `user_badges` dedupa).

**Como alterar:** editar o array `STREAK_BADGES`. O slug DEVE existir em `BADGE_SLUGS`
(`badges.ts`).

> ⚠️ **MARCO não move streak.** `course_complete`/`quiz_perfect` são eventos de **amount 0**:
> destravam badge (via contagem do ledger) mas NÃO chamam `advanceStreak` nem tocam
> `lastActivityDate`. Só evento de **amount > 0** move a sequência.

---

## 4. Zappy Coins (a moeda)

Domínio PURO em `packages/members/src/domain/gamification/coins.ts`. v1 é **earn-only** (compra
com dinheiro real pelos pais é fase futura). A moeda é o SINK gastável; **o XP continua sendo a
métrica de status/ranking** (gastar moeda não rebaixa ninguém).

### Faucets (de onde vem moeda)

| Origem | Moedas | Constante (`COIN_VALUES`, `coins.ts`) | Conta no teto? |
|---|---|---|---|
| Aula concluída | **5** | `COIN_VALUES.LESSON_COMPLETE` | sim |
| Quiz aprovado (base) | **10** | `COIN_VALUES.QUIZ_PASSED_BASE` | sim |
| Bônus de nota (cap) | **+5** | `COIN_VALUES.QUIZ_SCORE_BONUS_MAX` (nota 100 → +5; fórmula `round(score/20)`) | sim |
| Baú de unidade | **15** | `COIN_VALUES.UNIT_COMPLETE` | sim |
| Marco de streak | 7→**20**, 30→**50**, 60→**80**, 180→**150**, 365→**300** | `STREAK_COIN_MILESTONES` (`coins.ts:38`) | **NÃO** (exempto) |
| Resgate de missão | definido por missão | ver §8 | sim |

**Como alterar:** editar `COIN_VALUES` (faucets de rotina) ou `STREAK_COIN_MILESTONES` (marcos).
A fórmula do quiz mora em `quizPassedCoins`.

### Teto diário

`DAILY_COIN_CAP = 100` (`coins.ts:24`) — limita o GANHO de **rotina** por dia civil SP. Aplicado
por `applyDailyCap(amounts, earnedToday, cap)` no `award` e no `claimMission`. O excedente é
**descartado** (limite duro de ganho/dia). Marcos de streak NÃO passam pelo `applyDailyCap`
(são raros e não-grindáveis — capá-los perderia o bônus para sempre).

**Como alterar:** editar `DAILY_COIN_CAP`.

### Carteira & saldo

Persistida em `gamification_profiles` (1 linha por `user_id`+`audience`): `coin_balance` (a
verdade do saldo), `coins_earned_today`/`coins_earned_date` (controle do teto, reseta ao virar o
dia SP), `lifetime_coins_earned` (alimenta as badges de poupador). O ledger `coin_events`
(`balance_after` = auditoria) é a trilha; o saldo de verdade é a coluna do perfil.

### Gasto (`spendCoins`) e idempotência

`GamificationRepository.spendCoins({userId, audience, amount, reason, idempotencyKey, now})` é o
primitivo que as lojinhas consomem. **Fail-CLOSED** em saldo insuficiente (`INSUFFICIENT_BALANCE`).
**Idempotente por `(reason, idempotencyKey)`**: a mesma compra (duplo-clique/retry) nunca debita
2× — devolve `ALREADY_SPENT` (que o caller trata como sucesso). Roda sob o mesmo advisory lock
por aluno do award.

### Badges de poupador

`coinsSaverBadgeSlugs(lifetimeCoins)` (`gamification.ts:168`): `>=300 → coins-saver-300`,
`>=1000 → coins-saver-1000`. Contadas por `lifetime_coins_earned` (ganhas na vida, não o saldo).
São avaliadas em toda escrita que aumenta o lifetime: awards normais e `claimMission` quando as
moedas concedidas pela missão, depois do teto diário, cruzam um limiar. A inserção em `user_badges`
continua idempotente por `(user_id, audience, badge_slug)`.
**Como alterar:** editar os limiares em `coinsSaverBadgeSlugs`.

### Equipe interna = moedas VIRTUAIS ilimitadas (passe livre, 06/2026)

Espelho, para a moeda, da **chave-mestra virtual** dos cursos: `superadmin`/`admin`/`staff`
(`isPrivilegedActor` resolvido na ROTA a partir do `x-auth-user-role`, propagado como param
`privileged` aos services) têm Zappy Coins **ilimitadas e VIRTUAIS — nunca persistidas**. As
lojinhas (`BuyAvatarPartService`/`BuyRoomItemService`/`BuyStreakFreezeService`) passam
`amount/price: 0` ao `spendCoins`/`buyStreakFreeze`: a peça/item/protetor é concedido na mesma
transação atômica, **sem debitar** o saldo real (que fica 0) e **sem poluir o ledger/ranking**
(equipe já é excluída do ranking). As leituras de saldo (`GET /members/{avatar,room}` e
`/gamification/me`) marcam `balanceUnlimited`/`coins.unlimited` quando `privileged` → a UI kids
mostra **∞**. Numa sessão de perfil do Kids o token é da CONTA, então o `role` da equipe sobrevive
e o passe livre vale lá dentro. O `customer` segue limitado pelo saldo (402 sem moeda — sem
regressão). **Como mudar:** o gate é só `privileged`; para desligar, pare de propagar
`isPrivilegedActor` nessas rotas. Travado por `tests/integration/privileged-coins.test.ts`.

> **Estúdio Completo (produto vendável):** a mesma equipe também acessa o `/estudio` sem comprar —
> a rota `GET /members/access` curto-circuita todas as refs pedidas para `true` quando
> `isPrivilegedActor`. Ver o CLAUDE.md do members (§`/access`).

---

## 5. Conquistas (badges)

Catálogo EM CÓDIGO em `packages/members/src/domain/gamification/badges.ts:BADGE_SLUGS` (23 slugs).
Persiste só `user_badges` (UNIQUE `user_id, audience, badge_slug` — a "1ª aula" do kids é
independente da do adult). Título/ícone/copy vivem no app kids, não no banco.

| Família | Slugs | Derivação |
|---|---|---|
| 1ª aula | `first-lesson` | 1º `lesson_complete` da vitrine (`countByType === 1`) |
| 1º jogo no Mural | `first-showcase` (Fase 5) | `showcaseBadgeSlugs`, conta `course_showcased` (universal — todo comprador de curso alcança) |
| Streak | `streak-7/30/60/180/365` | `streakBadgeSlugs(current)` |
| Cursos 100% | `course-complete`, `-2`, `-3` (1/2/3 cursos) | `courseBadgeSlugs`, conta `course_complete` no ledger |
| Quiz nota mil | `quiz-perfect`, `-10`, `-30` (1/10/30) | `quizPerfectBadgeSlugs`, conta `quiz_perfect` |
| Maestria do Estúdio | `studio-first`, `studio-master-3`, `studio-master-10` (1/3/10) | `studioMasteryBadgeSlugs`, conta `studio_passed` |
| Pensa (planejamento) | `pensa-first-idea` (1ª etapa concluída = 1ª Carta), `pensa-first-launch`/`pensa-creator-3` (1/3 ciclos) | `pensaStageBadgeSlugs`/`pensaCycleBadgeSlugs`, contam `pensa_stage_complete`/`pensa_cycle_complete` |
| Desafio do mês | `challenge-first` (Fase 5) | `challengeBadgeSlugs`, conta `challenge_entry` |
| Clube dos Criadores (07/2026) | `clube-primeiro-post` | `clubeBadgeSlugs`, conta `clube_thread` no ledger (1ª conversa APROVADA — **só thread destrava; comentário não**) |
| Poupador | `coins-saver-300`, `coins-saver-1000` | `coinsSaverBadgeSlugs`, lê `lifetime_coins_earned` |

As contagens são **POR VITRINE** (`countByType` filtra `userId + audience + sourceType`). Os
marcos `course_complete`/`quiz_perfect` são eventos de **amount 0** no ledger (`xp_events`) — só
destravam badge, não dão XP/streak/moeda.

### Como adicionar uma badge

1. Adicionar o slug ao array `BADGE_SLUGS` (`badges.ts`) — vira o tipo `BadgeSlug`.
2. Fazer alguma função `*BadgeSlugs(...)` (ou um novo bloco no `award` do repositório)
   retorná-lo a partir de uma contagem do ledger ou de um valor do perfil. ⚠️ Espelhar o
   MESMO bloco no fake (`tests/fakes/in-memory.ts`) — ele é o oráculo dos testes.
3. Adicionar a apresentação (título/ícone/copy) no app `community-kids` (`BADGE_INFO`).
4. **Nenhuma migration** — catálogo em código; deploy atômico. Sem backfill (atividade anterior
   ao deploy não retroage).

### Troféus no quarto (Fase 5, 07/2026)

Conquista GRANDE vira um OBJETO 3D no quarto: `room-catalog.ts` (members) tem itens de tier
**`'trophy'`** (decor, preço 0, `BuyRoomItemService` RECUSA compra — `ROOM_ITEM_NOT_PURCHASABLE`)
e o mapa **`TROPHY_FOR_BADGE`** (badge → item). No `award` do repo, badge NOVA mapeada → o item
entra em `room_inventory` NA MESMA transação (`onConflictDoNothing`). Mapa atual:
`first-showcase`→`trofeu-primeiro-jogo`, `course-complete`→`trofeu-diploma`,
`streak-30`→`trofeu-chama`, `quiz-perfect-10`→`trofeu-medalha-mil`,
`pensa-first-launch`→`trofeu-foguete` (bônus de produto), `studio-master-3`→`trofeu-console`
(bônus). No kids: aba "🏆 Troféus" no room-builder (não-ganho = cadeado + dica `TROPHY_HINT`),
modelos low-poly em `furniture-models.tsx`, e a celebração de aula avisa "troféu novo no quarto"
via `TROPHY_BADGE_SLUGS`. Conformance test cobre badge↔item↔apresentação.

### Desafio do MÊS (game jam — Fase 5, 07/2026)

MENSAL (decisão da usuária: 1 semana é pouco p/ criança criar um jogo) e SÓ p/ quem possui
**Clube dos Criadores + Estúdio Completo** (produtos à parte — a escada de níveis NÃO depende).
Tema em CÓDIGO (`domain/gamification/challenges.ts`, 12 temas), DETERMINÍSTICO e GLOBAL por
`monthKey` `m:YYYY-MM` (mês civil SP). Fluxo: o kids mostra o card (home) e o checkbox no
Compartilhar SÓ com as duas refs (`/members/access?refs=clube-dos-criadores,estudio-completo`);
o publish standalone leva `challengeKey`; o HUB valida posse+mês (drop SILENCIOSO da tag — a
publicação nunca falha) e grava `threads.challenge_key`; thread com a tag → webhook
`POST /members/webhooks/challenge` → **XP 50** (`challenge_entry`, sourceId = uuid determinístico
do mês `challengeSourceId` — 1 marco/mês pelo UNIQUE do ledger) + badge `challenge-first`. O
Mural mostra a prateleira do mês (filtro `?challenge=`); a rota do aluno
`GET /members/gamification/challenge` devolve tema + `entered`. Sem julgamento/vencedor no v1
(follow-up: destaque via `is_pinned`). ⚠️ Risco aceito v1: o webhook não carrega role →
equipe testando entra no ranking kids.

---

## 6. Avatar 3D (configurador de personagem)

Catálogo no members: `packages/members/src/domain/avatar/avatar3d-catalog.ts`. Apresentação
(rótulo PT + URL do GLB) no kids: `community-kids/src/lib/avatar3d-catalog.ts`, PURA, chaveada
pelo MESMO `id` (travada por `members/tests/unit/catalog-conformance.test.ts`). O render 3D vive
no kids (`components/kids/avatar3d/*`, rota `/meu-avatar`) — **personagem GLB real (Quaternius CC0,
via pack do WawaSensei):** 1 esqueleto compartilhado (`Armature.glb`) + 1 GLB skinned por peça
(`avatar-rig.tsx`/`asset-part.tsx`; material `Color_*` tintável, `Skin_*` pele compartilhada). GLB
SIMPLES (sem Draco/KTX2/WASM, CSP-safe), assets em `community-kids/public/avatar3d/`.

### Categorias (`AVATAR_CATEGORIES`) + config

14 categorias: `head, hair, eyes, eyebrows, nose, faceDecor, facialHair, glasses, hat, top, bottom,
outfit, shoes, accessory` — uma peça **+ cor** por categoria (`head` = formato + tom de pele). Config v2: `{version:2, style:'char-v1',
slots: cat→{asset, color?}}` (`avatar_configs.equipped` jsonb). Removíveis (com peça `*-none` grátis
= "tirar"): `hair, faceDecor, facialHair, glasses, hat, outfit, accessory`. `AVATAR_HIDE_GROUPS = {hat:['hair']}` (chapéu
real esconde o cabelo — só render, o servidor NÃO gateia). Default grátis em `DEFAULT_AVATAR_SLOTS`.

### Peças (`AVATAR3D_PARTS`) + cores — livre vs pago

~96 peças; identidade (head/eyes/eyebrows/nose) **100% grátis**. Pagas 50–150 Zappy na maioria
das categorias (cabelo, barba, faceDecor, óculos, chapéu, top, bottom, outfit, shoes, acessório). `tier`
derivado (`free()`/`paid()`); peça grátis é **implicitamente possuída** (não vai ao inventário).
**COR é GRÁTIS** e irrestrita dentro da paleta da categoria (`AVATAR_CATEGORY_PALETTES`; pintar
não custa — a economia está nas PEÇAS). `nose`/`glasses` sem paleta (nariz segue a pele; óculos
têm cor embutida por variante).

### Equipar / comprar / foto

- **Equipar** (`EquipAvatarService` + `assertEquippableConfig`): ESTRITO — peça existe, na
  categoria certa, grátis OU possuída (`avatar_inventory` → senão `AVATAR_PART_NOT_OWNED`/403), e
  cor ∈ paleta (senão `AVATAR_INVALID`/400). Leitura TOLERANTE (`canonicalizeAvatarConfig`:
  categoria/peça/cor desconhecida → default; config DiceBear LEGADA sem `version:2` → default 3D
  inteiro, sem migração de dados).
- **Comprar** (`BuyAvatarPartService`): charge-first idempotente (`spend_cosmetic`,
  `avatar-buy:<user>:<part>`); já possuída → no-op; grátis → 400; sem saldo → 402.
- **Foto/snapshot** (`SetAvatarPhotoService`, `PUT /members/avatar/photo`, migration `0023`
  `avatar_configs.photo_url`): a "foto" do canvas 3D é a IMAGEM do avatar em todo o app. O BFF
  (member-shell `avatarSnapshot`) sobe o PNG p/ o R2 (namespace `avatar3d`) e grava a URL;
  `AvatarStateView.photoUrl` + `PublicProfileView.avatarPhotoUrl`. Config 3D (peças+cores) também
  persiste — base p/ uma futura "aventura" com o personagem.

### Como adicionar uma peça

1. `free(id, category)` ou `paid(id, category, price)` em `AVATAR3D_PARTS` (members).
2. Entrada `AVATAR_PART_INFO[id] = {category, labelPt}` no kids (mesmo `id`).
3. Render: dropar o GLB em `community-kids/public/avatar3d/parts/<id>.glb` (skinned no MESMO
   esqueleto do `Armature.glb`; material `Color_*` p/ tintável, `Skin_*` p/ pele; SEM Draco/KTX2).
4. Nenhuma migration (catálogo em código).

---

## 7. Quarto virtual

Catálogo no members: `packages/members/src/domain/room/room-catalog.ts`. Apresentação no kids:
`community-kids/src/lib/room-catalog.ts`, chaveada pelo MESMO `id`. É **sink cosmético puro** — sem
efeito de jogo.

> **🧊 Visual 3D isométrico (06/2026):** o quarto deixou de ser grid de emoji 2D e virou uma cena
> **react-three-fiber** isométrica (low-poly construído EM CÓDIGO, sem GLTF) — paredes pintáveis,
> pisos, móveis que GIRAM, iluminação/clima (dia/noite/neon/festa) e pet 3D andando. O renderer vive
> em `community-kids/src/components/kids/room/` (`room-canvas.tsx` = wrapper `dynamic ssr:false` →
> `room-canvas-3d.tsx` = `<Canvas>` ortográfico fixo; `furniture-models.tsx`, `walls/floor/room-lights`,
> `coords.ts` PURO/testado). `three`/`@react-three/fiber`/`drei` já vinham no kids (livro 3D do e-book).
> O emoji segue só como miniatura na lojinha.

> ⚠️ **Arcades de jogos no quarto foram DESCARTADOS deliberadamente** — não existem no código.
> Os jogos que a criança CRIA vivem no **Mural dos Criadores** (vitrine do Estúdio no hub),
> jogáveis em `/jogar/<playId>`. O quarto é só decoração.

### Grade & teto

`ROOM_GRID = { cols: 12, rows: 8 }` (`room-catalog.ts`). Itens ocupam `w×h` e devem caber
(`withinBounds`: `x+w<=12`, `y+h<=8`). Teto de itens posicionados: `ROOM_MAX_PLACED = 40`.

> ⚠️ `ROOM_GRID` e o `40` estão **duplicados** no kids: `ROOM_GRID` é re-declarado em
> `community-kids/src/lib/room-catalog.ts` e o `40` está HARDCODED em `room-builder.tsx:addItem`.
> Mudar o teto ou a grade exige tocar **os dois lados**.

### Catálogo de itens (`ROOM_ITEMS`)

| Categoria | Itens (preço / w×h) |
|---|---|
| **Móveis** (`furniture`, chão) | cama 0/2×3 (solteiro), cadeira 0/1×2, mesa 0/2×2, sofa 80/3×2, estante 70/2×3, bau 90/2×2, mesa-estudo 70/2×1, tv 90/2×1, beliche 120/2×3, pufe 50/1×1 |
| **Decoração de chão** (`decor`) | ursinho 70/1×1, balao 50/1×2, bandeira 50/1×2, globo 50/1×1, guitarra 80/1×2, bola 0/1×1 |
| **Decoração de PAREDE** (`decor`, `mount:'wall'`) | quadro 0/2×2, estrela 0/1×1, janela 60/2×2, relogio 60/1×1, prateleira 60/2×1, poster 50/1×2, espelho 60/1×2 |
| **Plantas** (`plant`, animadas) | planta 80/1×2, arvore 130/2×3 |
| **Luzes** (`light`, animadas) | luminaria 70/1×2, vela 60/1×1 |
| **Pets** (`pet`, 1 por quarto) | pet-gato 300, pet-cachorro 300, pet-passaro 250 (todos 1×1) |

Pets NÃO vão na grade — são o campo `pet` (string|null) do estado; UM por quarto. Itens
posicionáveis na lojinha = `furniture/decor/plant/light` (`PLACEABLE` no kids).

### Itens de PAREDE (sobem) + colisão (sem sobreposição) — 06/2026

Itens com `mount:'wall'` (janela, quadro, relógio, estrela, prateleira, pôster, espelho) **não vão no
chão** — penduram numa PAREDE e SOBEM. Reusam o `PlacedItem` com `wall:'left'|'right'` + `x` = posição
horizontal ao longo da parede + `y` = ALTURA (nível 0..`WALL_H_CELLS`=4). O renderer (`furniture-piece.tsx`)
os posiciona via `wallToWorld` (gira 90° na parede esquerda); modelos viraram PAINÉIS FLAT
(`furniture-models.tsx`). O drag faz raycast nos planos das 2 paredes (`room-canvas-3d.tsx`) e escolhe a
mais próxima. `canonicalizeRoomState` valida largura/altura da parede + posse; item de parede sem `wall`
→ assume `'right'`. Não giram (a rotação fica só p/ chão).

**Colisão "nada por cima de nada":** `canonicalizeRoomState` mantém sets de células ocupadas (chão e
por-parede via `occupies`) e DESCARTA o item que sobrepor um já posicionado. Namespaces SEPARADOS — chão,
parede esquerda e direita não colidem entre si. No editor, o drag só "solta" em célula livre (`isFree` em
`room-canvas-3d`) e o `addItem` acha o 1º vão livre (`freeFloorSpot`/`freeWallSpot` — parede prefere o
alto). `rectsOverlap`/`wallToWorld`/`worldToWallCell` (em `coords.ts`, PURO/testado) são a base. O pet
ignora itens de parede.

### Catálogo de temas (`ROOM_THEMES`)

`aconchego` (grátis, padrão — `DEFAULT_ROOM_THEME`), `floresta` 200, `oceano` 250, `espaco` 300,
`doce` 200. O tema agora é um **preset de aparência** (`THEME_PRESETS` no kids): paredes + piso + luz
default. `resolveRoomAppearance(state)` mistura o preset com os overrides explícitos do estado →
`{left,right,floorId,lightingId}` que o renderer consome. Selecionar um tema no editor RESETA os
overrides (mostra a aparência bundle; a criança ajusta depois). Miniatura = gradiente `ROOM_THEME_INFO`.

### Campos novos do estado (06/2026 — JSONB, SEM migração, retro-compatível)

`RoomState` ganhou campos OPCIONAIS (quarto legado só-`theme` segue válido; ausentes → default do tema):
- `placedItems[].rot?: 0|1|2|3` — quartos de volta. `effectiveFootprint` troca w↔h em 90°/270° e o
  `withinBounds` valida com o footprint GIRADO.
- `wallColors?: {left?,right?}` — **pintar é GRÁTIS**, cores da paleta curada `ROOM_WALL_PALETTE`
  (~18 cores, hex minúsculo; o kids espelha em `WallSwatch[]` com label). Cor fora da paleta é descartada.
- `floor?` (id de `ROOM_FLOORS`) e `lighting?` (id de `ROOM_LIGHTINGS`) — catálogos À PARTE (como os
  temas: fora da grade, posse pelo inventário).

### Pisos (`ROOM_FLOORS`) e Clima/luz (`ROOM_LIGHTINGS`)

| Pisos | `piso-madeira-clara` (grátis, default), `-escura` 60, `-tapete` 80, `-xadrez` 70, `-ladrilho` 70 |
| Clima | `dia` (grátis, default), `tarde` 60, `noite` 80, `neon-rosa` 90, `neon-ciano` 90, `festa` 150 |

Apresentação no kids: `ROOM_FLOOR_INFO` (cor/padrão p/ a CanvasTexture do chão) e `LIGHTING_PRESETS`
(ambiente/sol/fundo + flags `dark`/`neon`/`party`). Travados no teste de conformância (drift → CI vermelho).

### Comprar / montar / canonicalizar

- **Comprar** (`BuyRoomItemService`): charge-first idempotente, espelha o avatar —
  `spendCoins(reason:'spend_room', idempotencyKey:'room-buy:<user>:<item>')`. Resolve item OU tema
  pelo id (catálogos distintos, ids sem colisão). `ROOM_ITEM_NOT_FOUND`(404), `ROOM_ITEM_FREE`(400),
  sem saldo → 402.
- **Salvar** (`SaveRoomService`): last-write-wins. Canonicaliza o estado bruto contra o inventário
  e faz `upsertState`. `accountId` é imutável.
- **`canonicalizeRoomState`** é o ÚNICO portão (roda na leitura E na escrita): tema desconhecido/
  não-possuído → `DEFAULT_ROOM_THEME`; item desconhecido/`pet` na grade/não-possuído/fora-da-grade
  (footprint GIRADO) → descartado; `rot` fora de 0–3 → 0; cor de parede fora da paleta + piso/luz
  desconhecido ou não-possuído → omitido (cai no default do tema); corta no `ROOM_MAX_PLACED`. ⚠️ Os
  campos novos atravessam 4 camadas que precisam estar TODAS alargadas (Zod `RoomStateSchema` no
  member-shell, TypeBox `RoomStateBody` no members, o rebuild do handler em `members.routes.ts` e o
  próprio canonicalize) — senão o save dropa em silêncio. O cliente nunca "salva" o que não tem.

### Animações (3D)

No 3D as animações são `useFrame` gateadas pelo hook `useReducedMotion` (espelha
`prefers-reduced-motion`): pet andando (`pet-3d.tsx`) e ciclo de matiz do modo **festa**
(`room-lights.tsx`). `frameloop` é `demand` por padrão e vira `always` só quando há pet/festa E o
movimento é permitido (eficiência no tablet). Itens de luz (luminária/vela) BRILHAM por material
`emissive` (sem point light por peça); sem shadow map. As classes `@keyframes kid-room-*` 2D viraram
legado (o campo `RoomItemInfo.anim` segue tolerado, sem uso no renderer 3D).

**Câmera:** órbita REDUZIDA (drei `OrbitControls` travado num cone estreito — sem pan/zoom, sem dar a
volta nas paredes; **desligada enquanto arrasta uma peça** p/ não conflitar com o drag). **Pet com
COLISÃO:** anda em 4 direções e ao encontrar móvel ou parede LOGO À FRENTE vira p/ uma direção livre
(não atravessa) — usa uma grade de células OCUPADAS (`occupied` em `room-canvas-3d.tsx`, derivada dos
`placedItems` com o footprint girado) consumida no `useFrame` de `pet-3d.tsx`.

### Como adicionar um item / tema

1. Adicionar `item(id, category, price, w, h)` a `ROOM_ITEMS` (ou `{id,tier,price}` a `ROOM_THEMES`/
   `ROOM_FLOORS`/`ROOM_LIGHTINGS`) no members.
2. Adicionar a entrada espelhada no kids, **mesmo id**: `ROOM_ITEM_INFO` (label/emoji — w/h DEVEM
   casar) / `ROOM_THEME_INFO` / `ROOM_FLOOR_INFO` / `LIGHTING_PRESETS`. Um item POSICIONÁVEL novo
   precisa também de um `case` em `furniture-models.tsx` (senão cai na caixa neutra). O teste de
   conformância quebra o CI se faltar o espelho.
3. Animação nova de item → definir o `@keyframes`/classe `kid-room-*` no `globals.css` do kids e
   estender o union `RoomItemInfo.anim`.
4. Nenhuma migration.

---

## 8. Missões diárias/semanais

Domínio em `packages/members/src/domain/gamification/missions.ts`; serviços em
`application/gamification/{get-missions,claim-mission}.service.ts`; UI em
`community-kids/src/components/kids/missions-panel.tsx`. Estilo Duolingo: cada missão conta
**eventos REAIS do ledger** (`xp_events`) num período. Catálogo EM CÓDIGO (sem seed/tabela).

### Pools (reforma 07/2026 — cadências coerentes + mensal + novas fontes + gating do Clube)

Cadência recalibrada pela premissa **~1 aula/dia**: eventos frequentes são DIÁRIOS; fechar
módulo/projeto/publicar/decorar são SEMANAIS; metas grandes são MENSAIS. Antes "abra um baú"/"crie
um projeto" eram diárias e ficavam travadas em 0 (eventos one-shot fora da janela do dia).

**Diárias (`DAILY_MISSIONS`) — `DAILY_SET_SIZE = 3`:**

| slug | meta (`goalType`) | alvo | XP | moedas | gate |
|---|---|---|---|---|---|
| daily-aula | lesson_complete | 1 | 10 | 10 | — |
| daily-quiz | quiz_passed | 1 | 15 | 15 | — |
| daily-enviar | studio_submitted | 1 | 15 | 15 | — |
| daily-comentar | mural_comment | 1 | 10 | 10 | — |
| daily-clube | clube_thread | 1 | 10 | 10 | clube-dos-criadores |

**Semanais (`WEEKLY_MISSIONS`) — `WEEKLY_SET_SIZE = 3`:**

| slug | meta | alvo | XP | moedas | gate |
|---|---|---|---|---|---|
| weekly-aulas-5 | lesson_complete | 5 | 40 | 50 | — |
| weekly-quizzes-3 | quiz_passed | 3 | 35 | 40 | — |
| weekly-bau | unit_complete | 1 | 30 | 35 | — |
| weekly-enviar-2 | studio_submitted | 2 | 40 | 45 | — |
| weekly-publicar | course_showcased | 1 | 50 | 60 | — |
| weekly-quarto | room_item_buy | 1 | 30 | **0** | — |
| weekly-avatar | avatar_part_buy | 1 | 30 | **0** | — |
| weekly-clube-3 | clube_thread | 3 | 40 | 45 | clube-dos-criadores |
| weekly-lancar-jogo | studio_published | 1 | 50 | 60 | estudio-completo |
| weekly-remix | studio_remix | 1 | 40 | 45 | estudio-completo |

**Mensais (`MONTHLY_MISSIONS`, NOVA) — `MONTHLY_SET_SIZE = 2`:**

| slug | meta | alvo | XP | moedas | gate |
|---|---|---|---|---|---|
| monthly-aulas-20 | lesson_complete | 20 | 120 | 90 | — |
| monthly-baus-3 | unit_complete | 3 | 100 | 80 | — |
| monthly-enviar-3 | studio_submitted | 3 | 120 | 90 | — |
| monthly-publicar-3 | course_showcased | 3 | 150 | 100 | — |
| monthly-classificar | course_rated | 1 | 60 | 50 | — |
| monthly-avatar-3 | avatar_part_buy | 3 | 80 | **0** | — |
| monthly-clube-10 | clube_thread | 10 | 100 | 80 | clube-dos-criadores |
| monthly-lancar-2 | studio_published | 2 | 150 | 100 | estudio-completo |
| monthly-remix-3 | studio_remix | 3 | 100 | 80 | estudio-completo |

`MissionGoalType` = `lesson_complete | quiz_passed | unit_complete | studio_submitted |
course_showcased | course_rated | room_item_buy | avatar_part_buy | mural_comment | clube_thread |
studio_published | studio_remix`.

> **Novos goalTypes = MARCOS (amount 0, migration `0037`)** — só CONTAM p/ a missão; o prêmio vem
> do claim (não movem XP/streak, não refarmam): `studio_submitted` (enviar ao professor, por bloco),
> `course_rated` (classificar curso, por curso), `room_item_buy`/`avatar_part_buy` (comprar cosmético;
> sourceId = uuid determinístico do slug, `domain/gamification/source-id.ts` — o ledger é uuid; a missão
> dá SÓ XP p/ não fazer loop de moeda), `mural_comment` (comentar no Mural, na APROVAÇÃO — webhook
> hub→members). `course_showcased` reusa o marco de publicar jogo.
>
> **Gating de produto (`MissionDef.requiresAccess`):** as missões de Clube (`clube_thread`) só entram
> no pool de quem tem `clube-dos-criadores`, e as do Estúdio (`studio_published`/`studio_remix`) de quem
> tem `estudio-completo` — `Get/ClaimMissionService` resolvem a posse pela CONTA (`AccessCheckService`,
> as DUAS refs numa ida) e passam um predicado aos `assign*` (equipe libera tudo; default `() => false`
> não vaza produto). Antes apareciam travadas em 0 p/ quem não tinha o Clube. O `clube_thread`/
> `mural_comment` só entram no ledger na APROVAÇÃO pela equipe (§3) → anti-farm por moderação.

### Retenção pós-cursos (07/2026 — Estúdio Completo, migration `0038`)

Cenário: a criança terminou todos os cursos e precisa de razão para voltar TODO DIA até sair curso
novo. Fontes novas (todas do fluxo standalone do `/estudio` + Mural):

- **`studio_published`** (MARCO amount 0, sourceId = playId do post): publicou jogo standalone no
  Mural — alimenta `weekly-lancar-jogo`/`monthly-lancar-2`. Nasce no hub (`createStandaloneShowcase`
  → webhook `POST /members/webhooks/showcase-standalone`). Republicar = post novo = marco novo
  (deliberado).
- **`studio_publish_day`** (XP REAL **25** + **15 moedas** no teto, sourceId = uuid determinístico do
  DIA civil SP — `studioPublishDaySourceId`): o XP diário de publicar, **máx. 1×/dia** — é o que
  mantém streak/liga de quem só CRIA (spam de republicação não infla). Mesmo webhook.
- **`studio_remix`** (MARCO amount 0, sourceId = playId do jogo ORIGINAL): "Fazer a minha versão" no
  Mural — alimenta `weekly-remix`/`monthly-remix-3`. Rota de aluno `POST /members/gamification/remix`
  (`RecordStudioRemixService`): exige posse do Estúdio, **valida o playId no hub** (S2S
  `POST /hub/internal/play-check` → anti-farm de uuid aleatório) e recusa SELF-remix. Sem XP direto
  (sem moderação — o prêmio vem do claim).
- **`play_milestone_10`/`play_milestone_100`** (MARCOS amount 0, sourceId = playId): um jogo do AUTOR
  cruzou 10/100 jogadas no `/jogar` público — badges **`plays-10`/`plays-100`** (universais) e a de
  100 concede o troféu **`trofeu-estrela-do-mural`** no quarto. Crossing EXATO detectado no hub
  (RETURNING do UPDATE atômico do plays_count em `isPlayable`) → webhook
  `POST /members/webhooks/plays-milestone`. Anti-farm natural: dedupe ip:playId do BFF + volume real.
- **Sorteio 2 fases (`pickWithGuaranteedStudio`):** p/ quem TEM o Estúdio, o set semanal E o mensal
  têm **1 vaga garantida** de missão do estúdio (semente derivada `userId:periodo:studio`) — sem isso
  o Fisher–Yates uniforme podia dar uma semana só de missões de aula, estruturalmente travadas p/
  quem já terminou os cursos. Determinístico; pool sem missão do estúdio → sorteio uniforme normal.
- **"Jogar jogo de colega" segue FORA** (decisão da dona mantida — play anônimo + TTL 30min do dedupe
  = farmável); a recompensa de plays é pelo lado de quem RECEBE (limiar por jogo).

### Atribuição determinística

`assignDailyMissions(userId, dayKey)` = `pick(DAILY_MISSIONS, DAILY_SET_SIZE, fnv1a('userId:dayKey'))`;
semanal análogo com `fnv1a('userId:weekKey')`. `fnv1a` é FNV-1a 32-bit puro (offset `0x811c9dc5`,
prime `0x01000193`) — **sem `Date.now`/random**. `pick` é um **embaralho parcial de Fisher–Yates
semeado** (`xorshift32` a partir da seed): determinístico e distinto, mas alcança QUALQUER
subconjunto de tamanho `count` (06/2026). Antes era rotação circular contígua, que só atingia
`pool.length` subconjuntos (p.ex. 5 dos 10 trios diários possíveis) — distribuição enviesada.
Mudar `fnv1a`/`pick`/a composição da seed **re-embaralha os sets de TODOS os alunos**.

Janelas de tempo (ancoradas em 03:00Z, SP fixo): `dayBoundsUtc(dayKey)` = `[dayKey T03:00Z, +1 dia)`;
`weeklyPeriodKey(dayKey)` = segunda-feira civil SP no formato `w:YYYY-MM-DD` (**semana começa na
segunda**, `sinceMonday=(dow+6)%7`); `weekBoundsUtc` = `[segunda T03:00Z, +7 dias)`;
`monthlyPeriodKey(dayKey)` = `m:YYYY-MM` (mês civil SP, mesma régua do Desafio do mês); `monthBoundsUtc`
= `[dia 1 T03:00Z, dia 1 do mês seguinte T03:00Z)`. `periodBoundsFor`/`periodKeyFor` roteiam por
`cadence` (`daily`/`weekly`/`monthly`). A cadência mensal NÃO exigiu migração (`mission_claims.period_key`
é text).

### Progresso derivado + resgate idempotente

- **Progresso** (`GetMissionsService`): `countEventsInPeriod` conta linhas de `xp_events` por
  `sourceType` na janela `[from,to)`. `progress = min(count, target)`; `completed = count >= target`.
  **Sem hook no award** — puramente derivado da leitura.
- **Resgate** (`ClaimMissionService` → `claimMission`): REVALIDA no servidor (reconta `count >= target`;
  o cliente nunca decide). Idempotente por `(userId, audience, missionSlug, periodKey)` em
  `mission_claims`. Credita **XP direto no perfil** (`xp += rewardXp`; a idempotência é o claim único,
  não há ledger de XP para o prêmio) + **moedas com teto diário** (`applyDailyCap` →
  `coin_events.source_type='mission_reward'`). Se as moedas efetivamente concedidas cruzarem
  `lifetime_coins_earned >= 300/1000`, também destrava as badges de poupador. **NÃO move o streak**
  (resgatar missão não estende sequência — deliberado).

### Como adicionar/ajustar uma missão

1. Editar/adicionar um objeto em `DAILY_MISSIONS` ou `WEEKLY_MISSIONS` (`missions.ts`). `slug`
   único (entra em `MISSIONS_BY_SLUG`); `goalType` deve ser um `xp_source_type` já emitido pelo award.
2. Ajustar `DAILY_SET_SIZE`/`WEEKLY_SET_SIZE` se quiser que o novo item apareça.
3. Adicionar o label PT em `missionLabel` (kids), senão cai no fallback "Complete a missão".
4. Nenhuma migration para a missão em si (só se mexer no schema/enums). O campo `rewardBadge`
   existe em `MissionDef` mas **nenhuma missão v1 o usa**; o claim não concede badge arbitrária de
   missão, só badges derivadas já existentes (ex.: poupador por `lifetime_coins_earned`).

---

## 9. Proteção de sequência (streak-freeze + férias)

Contrato **guilt-free**: a criança nunca é envergonhada por faltar. Duas redes:

### Protetores (freezes)

- **Grátis mensal** (lazy/idempotente): +1 protetor na 1ª atividade de cada mês civil SP
  **em que houver espaço no teto**. `monthKey = today.slice(0,7)`; persistido em
  `gamification_profiles.freeze_granted_month`. O marcador do mês **só avança quando o grátis
  ENTRA** (06/2026): aluno já no teto (`MAX_STREAK_FREEZES`) na 1ª atividade NÃO tem o mês
  queimado — `freeze_granted_month` preserva o anterior e o grátis fica disponível numa
  atividade futura em que haja espaço (antes o marcador avançava com o +1 descartado pelo
  teto → o benefício do mês se perdia ao gastar freezes depois).
- **Comprável** (`buyStreakFreeze`): `STREAK_FREEZE_PRICE = 80` moedas (`coins.ts:27`),
  `reason:'spend_streak_freeze'`. Idempotente; barra no teto `MAX_STREAK_FREEZES = 5`
  (`gamification-repository.port.ts:257`) → `MAX_FREEZES`; sem saldo → `INSUFFICIENT_BALANCE`(402).
- **Como entram no streak:** `advanceStreak` consome 1 protetor por **dia perdido fora de férias**
  (`freezesNeeded` = `missedDaysBetween` filtrando os em férias; cap interno de 400 dias). Se
  `need <= freezes`, a sequência ESTENDE e o repositório debita `freezesConsumed`.

**Como alterar:** `STREAK_FREEZE_PRICE` (preço), `MAX_STREAK_FREEZES` (teto). O freeze grátis
mensal mora na lógica de `grantsFreeFreeze`/`freezesBefore`/`freezeGrantedMonthNext` no `award`
do repositório (espelhada no fake `in-memory.ts`).

### Modo férias (`setVacation`)

Janela inclusiva `[vacationFrom, vacationTo]` em `gamification_profiles`. `inVacation(d)` =
`from!=null && to!=null && d>=from && d<=to`. Dias dentro da janela **não exigem freeze e não
quebram a sequência**. `from=to=null` limpa. Rota `PUT /members/gamification/vacation`.

**Como alterar:** `inVacation`/`freezesNeeded` em `gamification.ts`.

> A sequência só QUEBRA (reset para 1) quando NEM férias NEM protetores cobrem o gap — é o
> coração do contrato guilt-free. Não inverter esse default.

---

## 10. Ligas semanais

Domínio em `packages/members/src/domain/gamification/league.ts`; serviço em
`application/gamification/get-league.service.ts`. Métrica = **XP GANHO na semana**, derivado do
ledger (como as missões — sem coluna acumulada nem hook no award).

### Tiers & métrica

`LEAGUE_TIERS = ['bronze','prata','ouro','platina','diamante']` (`DEFAULT_LEAGUE_TIER = 'bronze'`).
A semana reusa `weeklyPeriodKey`/`weekBoundsUtc` das missões. `sumWeeklyXp(audience, cohort, from, to)`
soma o XP de cada perfil na janela `[from,to)`.

### Resolução lazy de tier (sem cron)

`GetLeagueService.ensureTier`: se ainda não há membership da semana corrente, fecha a semana
ANTERIOR — coloca o aluno pela XP da semana na coorte do mesmo tier (`listLeagueCohort`),
calcula a colocação (`rankOf`, competition rank) e promove/rebaixa 1 nível
(`resolveTier(prevTier, rank, cohortSize)`), depois cria a membership (`createLeagueMembership`,
idempotente). Tudo na 1ª leitura/atividade da semana.

### Promoção / rebaixamento

`promotionCount(n)` = `relegationCount(n)` = `n >= LEAGUE_MIN_PLAYERS ? max(1, round(n*0.2)) : 0`
(topo 20% sobe, base 20% cai, clamp de 1 nível, meio fica). **`LEAGUE_MIN_PLAYERS = 5`**: abaixo
disso a semana é **AMISTOSA** (`resolveTier` mantém o tier — ninguém cai com pouca massa).

**Como alterar:** `LEAGUE_TIERS` (tiers), `LEAGUE_MIN_PLAYERS` (massa mínima), o fator `0.2`
(faixa de promoção/rebaixamento) em `promotionCount`/`relegationCount`.

### Privacidade do board

O board (`LeagueMeView`) entrega `entries: {position, weeklyXp, isMe}` — **nunca expõe o userId de
terceiros**. Empate desempata pelo userId internamente (determinístico, sem vazar). A coorte é a
mesma do ranking (perfis-pares com matrícula na vitrine). Apresentação dos tiers (label+emoji) em
`community-kids/src/lib/league-info.ts`.

---

## 11. Perfil público + nomes clicáveis

Opt-in dos PAIS, OFF por default. Três pacotes cooperam.

### Flag (auth)

`auth.profiles.public_profile_enabled` (bool, **default `false`** — migration auth `0009`). Editável
**só pelos pais** (`setPublicProfileEnabled`, fora do `updateDetails`; `PATCH /auth/profiles/:id`
RECUSA 403 numa sessão de perfil/criança — mesmo guard do `birthDate`). A flag entra na sessão de
perfil como o claim **`pfl.pub`** (`{accountId, name, pub}`), re-derivado na rotação do refresh.

### Claim/headers

O gateway, com a sessão de perfil, injeta: `x-auth-account-id` (a CONTA), `x-auth-profile-name`
(`pfl.name` — nome da criança) e `x-auth-profile-public` (`pfl.pub`). São confiáveis porque passaram
pela borda (anti-spoof) e acompanham o `x-internal-token`.

### O que aparece (e o que NUNCA aparece)

`GET /members/profiles/:profileId/public` (`GetPublicProfileService` no members) devolve só **dado de
jogo**: `{profileId, xp, ranking, badges[] (só as conquistadas), avatar, room}`. Identidade S2S vem do
auth (`GET /auth/internal/profiles/:id/public` → só `{name, publicProfileEnabled}`). **NUNCA** passam
por aqui: e-mail, telefone, data de nascimento, id da conta. O BFF GATEIA pela flag: perfil com
`publicProfileEnabled=false` → 404 ao visitante (não vaza nem o nome).

### Nomes clicáveis no fórum (hub)

Todo tópico/comentário guarda no CREATE um snapshot do **primeiro nome** (`author_display_name`) e da
**flag** (`author_public`) — migration hub `0004`. A fonte é SEMPRE o header confiável
(`x-auth-profile-name` com fallback `x-auth-user-name`; `x-auth-profile-public === 'true'`, default
`false`), nunca o corpo. **O hub só transporta o snapshot — quem decide se o nome vira LINK para o
perfil público é o BFF** (expõe o link só quando `author_public === true`). É SNAPSHOT no create:
renomear/trocar a privacidade depois NÃO reescreve posts antigos (histórico imutável, como `authorId`).

---

## 12. Encanamento ponta-a-ponta

Como uma regra de gamificação atravessa os pacotes:

```
App kids (community-kids)
  → GET/POST /api/members/gamification/... (BFF member-shell — injeta sessão)
    → api-gateway (JWT + RBAC + rate limit; injeta X-Auth-User-* + x-internal-token)
      → members /members/gamification/... (calcula com o domínio puro; persiste no schema members)
```

Exemplo (a moeda de uma aula): o aluno conclui a aula → `POST /members/courses/:slug/lessons/:id/complete`
→ `AwardGamificationService.award` (XP+streak+badges+moeda, **fail-open**: erro só loga
`gamification.award_failed`, nunca derruba o complete) → a resposta carrega o delta
`gamification:{xpAwarded, totalXp, streak, badgesUnlocked, ...}` para a UI celebrar **sem round-trip**.

Endpoints do aluno (members, todos JWT + `x-internal-token`, `?audience=` default `kids` salvo
`/gamification/me` que é `adult`):

| Método | Path (members) | Serviço |
|---|---|---|
| GET | `/gamification/me[?ranking=true]` | `GetGamificationService` |
| GET | `/gamification/missions/me` | `GetMissionsService` |
| POST | `/gamification/missions/:slug/claim` | `ClaimMissionService` |
| POST | `/gamification/streak-freeze/buy` | `BuyStreakFreezeService` |
| PUT | `/gamification/vacation` | `SetVacationService` |
| GET | `/gamification/league/me` | `GetLeagueService` |
| GET / PUT | `/avatar` | `GetAvatarService` / `EquipAvatarService` |
| PUT | `/avatar/photo` | `SetAvatarPhotoService` (URL do snapshot 3D) |
| POST | `/avatar/parts/:partId/buy` | `BuyAvatarPartService` |
| GET / PUT | `/room` | `GetRoomService` / `SaveRoomService` |
| POST | `/room/items/:itemId/buy` | `BuyRoomItemService` |
| GET | `/profiles/:profileId/public` | `GetPublicProfileService` |

### Como adicionar uma rota nova

1. **members**: criar o service em `application/gamification/` (ou `avatar/`/`room/`), registrar no
   `composition-root`, expor em `interfaces/http/routes/members.routes.ts` com DTO TypeBox
   (`AudienceQuery` etc.) e mapear erros novos no `error-handler`.
2. **api-gateway**: adicionar a rota em `gateway.config.ts` (id, `pathPattern`, método, `authorize`,
   rate limit). ⚠️ Cuidado com a contagem de segmentos para não colidir com rotas existentes/wildcards
   (`/members/admin/*`).
3. **member-shell** (BFF): adicionar o shim `/api/members/...` em `src/routes/index.ts` (objeto de
   config por endpoint) que repassa ao gateway com a sessão.
4. **community-kids**: consumir client-side (degradar em silêncio se a gamificação estiver indisponível).

---

## 13. Tabela de KNOBS (constantes tunáveis)

Todas residem em `packages/members/src/domain/...` salvo indicação contrária. "Default" = valor atual
no código (06/2026).

| Constante | Default | Arquivo | Efeito |
|---|---|---|---|
| `XP_VALUES.LESSON_COMPLETE` | 10 | `gamification/gamification.ts` | XP por aula |
| `XP_VALUES.QUIZ_PASSED_BASE` | 20 | `gamification/gamification.ts` | XP base do quiz aprovado |
| `XP_VALUES.QUIZ_SCORE_BONUS_MAX` | 10 | `gamification/gamification.ts` | Cap do bônus de nota (XP) |
| `XP_VALUES.UNIT_COMPLETE` | 25 | `gamification/gamification.ts` | XP do baú de unidade |
| `XP_VALUES.CLUBE_THREAD` | 5 | `gamification/gamification.ts` | XP por tópico do Clube aprovado (XP puro, sem moeda) |
| `XP_VALUES.CLUBE_COMMENT` | 3 | `gamification/gamification.ts` | XP por comentário do Clube aprovado (XP puro, sem moeda) |
| `SP_DATE_FORMAT` (timeZone) | America/Sao_Paulo | `gamification/gamification.ts` | Fuso do "dia civil" do streak |
| `STREAK_BADGES` | [7,30,60,180,365] | `gamification/gamification.ts` | Marcos de badge de streak |
| `STREAK_BADGES`/cursos/quizzes | 1/2/3 · 1/10/30 | `gamification/gamification.ts` | Limiares das badges derivadas |
| maestria estúdio | 1/3/10 | `gamification/gamification.ts:studioMasteryBadgeSlugs` | Badges de projeto aprovado |
| poupador | 300/1000 | `gamification/gamification.ts:coinsSaverBadgeSlugs` | Badges de moeda lifetime |
| `missedDaysBetween` cap | 400 | `gamification/gamification.ts` | Limite do laço de dias perdidos |
| `COIN_VALUES.LESSON_COMPLETE` | 5 | `gamification/coins.ts` | Moeda por aula |
| `COIN_VALUES.QUIZ_PASSED_BASE` | 10 | `gamification/coins.ts` | Moeda base do quiz |
| `COIN_VALUES.QUIZ_SCORE_BONUS_MAX` | 5 | `gamification/coins.ts` | Cap do bônus de nota (moeda) |
| `COIN_VALUES.UNIT_COMPLETE` | 15 | `gamification/coins.ts` | Moeda do baú de unidade |
| `DAILY_COIN_CAP` | 100 | `gamification/coins.ts` | Teto diário de ganho de moeda |
| `STREAK_COIN_MILESTONES` | 7→20,30→50,60→80,180→150,365→300 | `gamification/coins.ts` | Bônus de moeda dos marcos (exemptos do teto) |
| `STREAK_FREEZE_PRICE` | 80 | `gamification/coins.ts` | Preço do protetor comprável |
| `MAX_STREAK_FREEZES` | 5 | `ports/gamification-repository.port.ts` | Teto de protetores acumuláveis |
| `BADGE_SLUGS` | 23 slugs | `gamification/badges.ts` | Catálogo de conquistas |
| `AVATAR3D_PARTS` (preços) | ver §6 | `avatar/avatar3d-catalog.ts` | Catálogo + preços das peças |
| `AVATAR_CATEGORIES` | 14 categorias | `avatar/avatar3d-catalog.ts` | Categorias do avatar 3D |
| `DEFAULT_AVATAR_SLOTS` | conjunto grátis | `avatar/avatar3d-catalog.ts` | Avatar inicial (peça+cor) |
| `AVATAR_CATEGORY_PALETTES` | paletas de cor | `avatar/avatar3d-catalog.ts` | Cores grátis por categoria |
| `ROOM_GRID` | {cols:12,rows:8} | `room/room-catalog.ts` (+ espelho no kids) | Tamanho da grade |
| `ROOM_MAX_PLACED` | 40 | `room/room-catalog.ts` (+ hardcoded no kids) | Teto de itens na grade |
| `DEFAULT_ROOM_THEME` | aconchego | `room/room-catalog.ts` (+ literal no kids) | Tema padrão |
| `ROOM_ITEMS` (preços) | ver §7 | `room/room-catalog.ts` | Catálogo + preços dos itens |
| `ROOM_THEMES` (preços) | aconchego 0,floresta 200,oceano 250,espaco 300,doce 200 | `room/room-catalog.ts` | Catálogo + preços dos temas |
| `DAILY_MISSIONS` | 5 missões | `gamification/missions.ts` | Pool diário |
| `WEEKLY_MISSIONS` | 8 missões | `gamification/missions.ts` | Pool semanal |
| `MONTHLY_MISSIONS` | 7 missões | `gamification/missions.ts` | Pool mensal (07/2026) |
| `DAILY_SET_SIZE` | 3 | `gamification/missions.ts` | Missões diárias por criança |
| `WEEKLY_SET_SIZE` | 3 | `gamification/missions.ts` | Missões semanais por criança |
| `MONTHLY_SET_SIZE` | 2 | `gamification/missions.ts` | Missões mensais por criança |
| `LEAGUE_TIERS` | bronze→diamante | `gamification/league.ts` | Tiers das ligas |
| `DEFAULT_LEAGUE_TIER` | bronze | `gamification/league.ts` | Tier inicial |
| `LEAGUE_MIN_PLAYERS` | 5 | `gamification/league.ts` | Massa mínima (abaixo = semana amistosa) |
| fator de promoção/rebaixamento | 0.2 | `gamification/league.ts` (`promotionCount`/`relegationCount`) | Faixa de quem sobe/cai (20%) |
| `public_profile_enabled` (default) | false | `auth` migration `0009` + agregado de perfil | Opt-in do perfil público |

---

## 14. Migrations da expansão

A expansão é segregada por pacote (cada um tem journal próprio). Aplicadas no Postgres
compartilhado (`sistemazero`, :5433); o `preDeployCommand` de prod roda só `db:migrate`.

**members** (`packages/members/.../drizzle/migrations/`):

| Migration | Cria / altera |
|---|---|
| `0018_add_zappy_coins` | enum `coin_source_type` (`lesson_complete`, `quiz_passed`, `unit_complete`, `studio_passed`, `streak_milestone`, `mission_reward`, `league_reward`, `spend_cosmetic`, `spend_room`, `spend_streak_freeze`, `admin_adjust`) + tabela `coin_events` (UNIQUE `user_id,audience,source_type,source_id`) + colunas `coin_balance`/`coins_earned_today`/`coins_earned_date`/`lifetime_coins_earned` em `gamification_profiles` |
| `0019_add_avatar_wardrobe` | tabelas `avatar_configs` (UNIQUE `user_id,audience`; `equipped` jsonb) e `avatar_inventory` (UNIQUE `user_id,audience,part_id`) |
| `0023_add_avatar_photo` | coluna `avatar_configs.photo_url` (URL pública do snapshot do avatar 3D) |
| `0020_add_room` | tabelas `room_state` (UNIQUE `user_id,audience`; `state` jsonb) e `room_inventory` (UNIQUE `user_id,audience,item_id`) |
| `0021_add_missions_and_freeze` | tabela `mission_claims` (UNIQUE `user_id,audience,mission_slug,period_key` + índice por período) + colunas `streak_freezes`/`freeze_granted_month`/`vacation_from`/`vacation_to` em `gamification_profiles` |
| `0022_add_league` | tabela `league_membership` (UNIQUE `user_id,audience,week_key` + índice de coorte `audience,week_key,tier`) |
| `0036` (Clube dos Criadores, 07/2026 — EM PRODUÇÃO) | `ALTER TYPE xp_source_type ADD VALUE 'clube_thread'` + `'clube_comment'` (XP puro do Clube; **não** mexe em `coin_source_type`) |

> Pré-requisitos já no banco (fatia de gamificação anterior): `0009` (enum `xp_source_type` +
> `gamification_profiles`/`xp_events`/`user_badges`), `0010`/`0011` (marcos `course_complete`/
> `quiz_perfect` + coluna `privileged`), `0012` (coluna `audience` — segregação por vitrine),
> `0014`/`0015` (`account_id` + índices de ranking).

**auth**: `0009_add_public_profile_enabled` — `ALTER TABLE auth.profiles ADD COLUMN
public_profile_enabled boolean DEFAULT false NOT NULL` (opt-in do perfil público).

**hub**: `0004_add_author_display_public` — `ADD COLUMN author_display_name` em `comments`,
`author_public boolean DEFAULT false` em `comments` e `threads` (snapshot de nome+flag para os nomes
clicáveis). Idempotente (`IF NOT EXISTS`, padrão do hub).

**Fase 5 (07/2026, geradas — FALTA aplicar):** members `0034_thick_misty_knight`
(`ALTER TYPE xp_source_type ADD VALUE 'challenge_entry'`) e hub `0005_plays_challenge`
(`threads.plays_count` + `threads.challenge_key` + índices parciais `play_id` e
`channel_id, challenge_key`). Troféus NÃO precisam de migration (reusam `room_inventory`).

---

## 15. Testes (o fake in-memory é o oráculo)

Os testes do members são a especificação executável. O **fake in-memory das portas**
(`packages/members/tests/fakes/in-memory.ts`) é o ORÁCULO do comportamento: implementa
`GamificationRepository`/`AvatarRepository`/`RoomRepository` com a mesma semântica do Drizzle
(idempotência, teto, lock conceitual, canonicalização) — ao mudar uma regra, ajuste o fake junto.

| Subsistema | Testes |
|---|---|
| XP/streak/coins/badges (domínio puro) | `tests/unit/gamification.test.ts`, `tests/unit/coins.test.ts` |
| Award/streak/ranking (integração) | `tests/integration/gamification.test.ts` |
| Missões | `tests/unit/missions.test.ts`, `tests/integration/gamification.test.ts` (claim + poupador) |
| Ligas | `tests/unit/league.test.ts`, `tests/integration/league.test.ts` |
| Avatar | `tests/unit/avatar.test.ts`, `tests/integration/avatar.test.ts` |
| Quarto | `tests/unit/room.test.ts`, `tests/integration/room.test.ts` |
| Perfil público | `tests/integration/public-profile.test.ts` |

Rode com **sandbox off** (gotcha do monorepo): `bun test` em `packages/members`. As suítes passam
sem nenhum `.env` (fakes). Sempre `typecheck` + `bun test` + `check` antes de concluir; mexeu em
schema → gere a migration (`db:generate`) e atualize este documento + o `CLAUDE.md` do pacote.
