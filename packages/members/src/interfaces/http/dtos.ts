import { t } from 'elysia'

// Ids que vão a colunas `uuid` validam o FORMATO na borda — um id lixo chegaria
// ao Postgres como 22P02 e viraria 500 INTERNAL_ERROR (padrão do catalog).
const UUID_PATTERN = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
const UUID = t.String({ pattern: UUID_PATTERN })

// Slug de curso/aula nos PARAMS de rota (MESMO formato da autoria): valida tamanho e
// caracteres na borda — um `:slug` cru era `t.String()` sem teto indo direto ao DB.
const SLUG = t.String({ minLength: 1, maxLength: 200, pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' })

// ── Params de rota com ids uuid (Elysia valida ANTES do handler → 400) ──────
export const IdParams = t.Object({ id: UUID })
export const CreationCleanupFailureBody = t.Object({
  error: t.String({ minLength: 1, maxLength: 1000 }),
  attempts: t.Integer({ minimum: 1, maximum: 1000 }),
})

export const AccountDeletionFinalizeBody = t.Object({
  accountId: UUID,
  userIds: t.Array(UUID, { minItems: 1, maxItems: 51 }),
})
export const UserIdParams = t.Object({ userId: UUID })
export const CourseIdParams = t.Object({ courseId: UUID })
export const ModuleIdParams = t.Object({ moduleId: UUID })
export const LessonIdParams = t.Object({ lessonId: UUID })
export const SlugParams = t.Object({ slug: SLUG })
export const SlugLessonParams = t.Object({ slug: SLUG, lessonId: UUID })
export const AttachmentResolveParams = t.Object({
  slug: SLUG,
  lessonId: UUID,
  attachmentId: UUID,
})
export const EbookResolveParams = t.Object({ slug: SLUG, lessonId: UUID, blockId: UUID })
export const QuizAttemptParams = t.Object({ lessonId: UUID, blockId: UUID })
export const CertificateParams = t.Object({ lessonId: UUID, blockId: UUID })

// Audiência da vitrine (plataforma): `adult` (community) | `kids` (community-kids).
const AUDIENCE = t.Union([t.Literal('adult'), t.Literal('kids')])

/**
 * Query das LISTAGENS do aluno (`GET /members/courses` e `/catalog`): qual vitrine
 * o BFF chamador quer. Ausente → `adult` (zero regressão no community atual);
 * valor inválido → 400 na borda.
 */
export const AudienceQuery = t.Object({ audience: t.Optional(AUDIENCE) })

/**
 * Query de `GET /members/gamification/me`: a gamificação é SEGREGADA por
 * vitrine — `?audience=adult|kids` escolhe o perfil (ausente → `adult`, como
 * nas listagens); `?ranking=true` pede TAMBÉM a colocação no ranking de XP da
 * MESMA vitrine (cálculo extra — os widgets omitem).
 */
export const GamificationQuery = t.Object({
  audience: t.Optional(AUDIENCE),
  ranking: t.Optional(t.Literal('true')),
})

// ── Uso de IA (quota por conta) ──────────────────────────────────────────────
/**
 * `feature` identifica o RECURSO que consome IA (`pensa-chat`/`pensa-synthesis`/
 * `studio-describe`/futuros) — string kebab validada na borda; recurso novo é só
 * uma string nova (zero migration). O consumo é sempre de 1 crédito.
 */
export const AiUsageConsumeBody = t.Object({
  feature: t.String({ minLength: 2, maxLength: 40, pattern: '^[a-z0-9][a-z0-9-]{1,39}$' }),
})

/** `?month=YYYY-MM` (ausente → mês civil SP corrente). Validação semântica no service. */
export const AiUsageStatsQuery = t.Object({
  month: t.Optional(t.String({ minLength: 7, maxLength: 7 })),
})

// ── Zappy do Studio ─────────────────────────────────────────────────────────
const STUDIO_LOCAL_PROJECT_ID = t.String({
  minLength: 1,
  maxLength: 128,
  pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$',
})
export const ZappyHistoryQuery = t.Object({
  projectId: STUDIO_LOCAL_PROJECT_ID,
  before: t.Optional(UUID),
})
const ZappyActor = t.Object({
  userId: UUID,
  accountId: UUID,
  privileged: t.Boolean(),
})
export const ZappyInternalQuestionBody = t.Object({
  actor: ZappyActor,
  projectId: STUDIO_LOCAL_PROJECT_ID,
  clientMessageId: UUID,
  question: t.String({ minLength: 1, maxLength: 1000 }),
})
export const ZappyQuestionParams = t.Object({ id: UUID })
export const ZappyInternalResponseBody = t.Object({
  actor: ZappyActor,
  projectId: STUDIO_LOCAL_PROJECT_ID,
  latencyMs: t.Integer({ minimum: 0, maximum: 600000 }),
  outcome: t.Optional(
    t.Union([
      t.Literal('normal'),
      t.Literal('refusal'),
      t.Literal('needs-context'),
      t.Literal('quota'),
      t.Literal('error'),
      t.Literal('rejected'),
    ]),
  ),
  /** Motivo da reprova da validação (auditoria; nunca volta à criança). */
  rejection: t.Optional(t.String({ minLength: 1, maxLength: 40 })),
  response: t.Object({
    id: UUID,
    text: t.String({ minLength: 1, maxLength: 8000 }),
    scope: t.Union([
      t.Literal('block'),
      t.Literal('mechanic'),
      t.Literal('error'),
      t.Literal('concept'),
      t.Literal('lesson'),
      t.Literal('needs-context'),
      t.Literal('redirect-pensa'),
      t.Literal('redirect-pinta'),
      t.Literal('unsupported'),
      t.Literal('project-review'),
      // Acabou a ajuda de IA da família. Persistido de propósito: sem ele, a
      // recusa volta do histórico com cara de aula (e com "isso ajudou?").
      t.Literal('quota'),
    ]),
    blockReferences: t.Array(
      t.Object({
        blockId: t.Optional(t.String({ minLength: 1, maxLength: 128 })),
        blockType: t.String({ minLength: 1, maxLength: 128 }),
        name: t.String({ minLength: 1, maxLength: 240 }),
        category: t.String({ minLength: 1, maxLength: 160 }),
        subcategory: t.Optional(t.String({ maxLength: 160 })),
        // ⚠️ Campo NÃO declarado aqui é REMOVIDO pelo `normalize` default do
        // Elysia — sem barulho, sem 422. Foi assim que o `palettePath` sumiu
        // entre o BFF e o banco desde que nasceu: o chip nunca mostrou a trilha
        // real, só o fallback categoria › subcategoria.
        palettePath: t.Optional(
          t.Array(t.String({ minLength: 1, maxLength: 80 }), { maxItems: 4 }),
        ),
        area: t.String({ minLength: 1, maxLength: 80 }),
      }),
      { maxItems: 12 },
    ),
    lessonReferences: t.Optional(
      t.Array(
        t.Object({
          courseId: UUID,
          courseSlug: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
          lessonId: UUID,
          title: t.String({ minLength: 1, maxLength: 240 }),
        }),
        { maxItems: 6 },
      ),
    ),
    suggestions: t.Optional(t.Array(t.String({ minLength: 1, maxLength: 60 }), { maxItems: 3 })),
    createdAt: t.String({ minLength: 20, maxLength: 40 }),
  }),
})
export const ZappyFeedbackBody = t.Object({
  projectId: STUDIO_LOCAL_PROJECT_ID,
  responseId: UUID,
  useful: t.Boolean(),
})

// ── Avatar (guarda-roupa por camadas) ───────────────────────────────────────
// `partId`/`parts` são SLUGS do catálogo em código (não uuid): `^[a-z0-9-]+$`.
const AVATAR_SLUG = t.String({ minLength: 1, maxLength: 64, pattern: '^[a-z0-9-]+$' })

export const AvatarPartParams = t.Object({ partId: AVATAR_SLUG })

/** Corpo de `PUT /members/avatar/photo` — URL do snapshot (só http(s); o BFF sobe o R2). */
export const AvatarPhotoBody = t.Object({
  photoUrl: t.String({ minLength: 1, maxLength: 2000, pattern: '^https?://' }),
})

/** Params de `GET /members/profiles/:profileId/public` (uuid na borda). */
export const PublicProfileParams = t.Object({ profileId: UUID })

/**
 * Query de `GET /members/avatars` (aluno, via gateway): avatar+nível em LOTE por
 * profileId, para o BFF do fórum kids pintar rosto+aura de cada autor de tópico/
 * comentário numa ida (sem N+1). `ids` = CSV de uuids de perfil (uuid validado + teto
 * 50 via `parseProfileIds`); `audience` ausente → `kids` (único consumidor é a vitrine kids).
 */
export const AvatarsBatchQuery = t.Object({
  ids: t.String({ minLength: 1, maxLength: 2000 }),
  audience: t.Optional(AUDIENCE),
})

// ── Missões + proteção de sequência ──────────────────────────────────────────
export const MissionSlugParams = t.Object({ slug: AVATAR_SLUG })

const ISO_DATE = t.String({ minLength: 10, maxLength: 10, pattern: '^\\d{4}-\\d{2}-\\d{2}$' })
/** Corpo de `PUT /members/gamification/vacation` — janela (ou null/null p/ limpar). */
export const VacationBody = t.Object({
  from: t.Union([ISO_DATE, t.Null()]),
  to: t.Union([ISO_DATE, t.Null()]),
})

// ── Quarto virtual ──────────────────────────────────────────────────────────
export const RoomItemParams = t.Object({ itemId: AVATAR_SLUG })

// Cor de parede: hex de 6 dígitos na BORDA; a PALETA curada é checada no domínio
// (`canonicalizeRoomState` descarta cor fora dela — borda valida formato, domínio semântica).
const HEX_COLOR = t.String({ pattern: '^#[0-9a-fA-F]{6}$' })

/** Corpo de `PUT /members/room` — estado montado (o serviço valida posse/grade/paleta). */
export const RoomStateBody = t.Object({
  theme: AVATAR_SLUG,
  placedItems: t.Array(
    t.Object({
      itemId: AVATAR_SLUG,
      x: t.Integer({ minimum: 0, maximum: 64 }),
      y: t.Integer({ minimum: 0, maximum: 64 }),
      // Rotação em quartos de volta (0–3). Ausente = 0; o domínio re-normaliza.
      rot: t.Optional(t.Integer({ minimum: 0, maximum: 3 })),
      // Item de PAREDE: em qual parede (x=horizontal, y=altura). Ausente = item de chão.
      wall: t.Optional(t.Union([t.Literal('left'), t.Literal('right')])),
      // EM CIMA de uma superfície (24/07): itemId do pai + nicho. ⚠️ o normalize do
      // Elysia REMOVE campo não declarado — sem estes dois aqui o filho chegava ao
      // domínio como item de chão em (0,0) e a colocação se perdia em silêncio.
      on: t.Optional(AVATAR_SLUG),
      slot: t.Optional(t.Integer({ minimum: 0, maximum: 32 })),
    }),
    { maxItems: 60 },
  ),
  pet: t.Union([AVATAR_SLUG, t.Null()]),
  // Pintar paredes (cada lado opcional). Piso/luz como slug do catálogo (posse no domínio).
  wallColors: t.Optional(t.Object({ left: t.Optional(HEX_COLOR), right: t.Optional(HEX_COLOR) })),
  floor: t.Optional(AVATAR_SLUG),
  lighting: t.Optional(AVATAR_SLUG),
})

/** Corpo de `PUT /members/avatar` — config 3D equipada (categoria → {peça, cor?}). */
export const AvatarConfigBody = t.Object({
  style: t.Optional(t.String({ maxLength: 40 })),
  // Record categoria→{asset, color?}; o serviço valida semanticamente (categoria/peça
  // desconhecida → 400; peça paga não possuída → 403; cor fora da paleta → 400). HEX_COLOR
  // valida só o FORMATO na borda; a PALETA curada é checada no domínio.
  // `maxProperties` limita o nº de categorias (o catálogo 3D tem 12) — paridade com o teto
  // de `QuizAttemptBody.answers`; o serviço já rejeita categoria desconhecida, mas a borda
  // não deve aceitar um Record gigante (defesa anti-DoS, mesmo bem abaixo do teto de corpo).
  slots: t.Record(
    t.String({ maxLength: 40 }),
    t.Object({ asset: AVATAR_SLUG, color: t.Optional(HEX_COLOR) }),
    { maxProperties: 32 },
  ),
})

/**
 * Corpo de `POST /members/webhooks/grant` — concessão de acesso (funil → gateway →
 * members). `subscription` presente = acesso por assinatura; `accessPeriodMonths`
 * presente = compra única POR PERÍODO (anual à vista Pix/boleto: validade fixa +
 * carência, sem assinatura); nenhum dos dois = compra única vitalícia.
 * `userId` vem do auth (ensure-buyer) e é sempre uuid — formato validado na borda.
 */
export const GrantWebhookBody = t.Object({
  userId: UUID,
  offerRef: t.String({ minLength: 1, maxLength: 200 }),
  paymentId: t.String({ minLength: 1, maxLength: 100 }),
  paidAt: t.Optional(t.String({ maxLength: 40 })),
  subscription: t.Optional(
    t.Object({
      subscriptionId: t.String({ minLength: 1, maxLength: 100 }),
      intervalMonths: t.Union([t.Integer({ minimum: 1, maximum: 120 }), t.Null()]),
    }),
  ),
  accessPeriodMonths: t.Optional(t.Integer({ minimum: 1, maximum: 120 })),
})

/**
 * Corpo de `POST /members/internal/access-check` (S2S — consumido pela comunidade):
 * resolve, num passo, quais `courseRefs` o usuário acessa + se tem chave-mestra.
 */
export const AccessCheckBody = t.Object({
  userId: UUID,
  courseRefs: t.Array(t.String({ minLength: 1, maxLength: 200 }), { maxItems: 200 }),
})

/**
 * Query de `GET /members/internal/profile-allowance` (S2S — consumido pelo `auth`
 * ao criar um perfil): quantos perfis de criança a CONTA (`accountId`) pode criar.
 */
export const ProfileAllowanceQuery = t.Object({ accountId: UUID })

/**
 * Query de `GET /members/access` (aluno, via gateway): "esta CONTA tem acesso a
 * estes produtos/refs?". `refs` = CSV de refs de curso/comunidade (slugs do
 * catálogo, ex.: `estudio-completo`); `audience` decide qual chave-mestra cobre
 * (ausente → `kids` — o único consumidor hoje é a vitrine kids).
 */
export const AccessQuery = t.Object({
  refs: t.String({ minLength: 1, maxLength: 2000 }),
  audience: t.Optional(AUDIENCE),
})

const ACCESS_REF_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
/** Uma ref tem formato de slug de catálogo válido? (só estas vão ao motor de acesso/DB). */
function isValidAccessRef(ref: string): boolean {
  return ref.length <= 200 && ACCESS_REF_RE.test(ref)
}
/**
 * Refs PEDIDAS no CSV (split/trim/não-vazias, teto de 50). Mantém TODAS as pedidas —
 * inclusive as de formato inválido — para a rota poder devolver `false` EXPLÍCITO a cada
 * uma, em vez de a ref sumir do mapa (deixando o chamador sem distinguir negado de descartado).
 */
export function splitRequestedRefs(csv: string): string[] {
  return csv
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 50)
}
/** Slugs VÁLIDOS do CSV (subconjunto de `splitRequestedRefs` — só estes vão à query). */
export function parseAccessRefs(csv: string): string[] {
  return splitRequestedRefs(csv).filter(isValidAccessRef)
}

/**
 * Query de `GET /members/parents/children-stats` (aluno, via gateway): resumo de
 * progresso dos filhos da CONTA. A conta vem do header confiável (`x-auth-user-id`),
 * NÃO do cliente. `profileIds` = CSV de uuids dos perfis (vindos do auth; o members
 * ainda filtra por `account_id`). `audience` ausente → `kids`.
 */
export const ChildrenStatsQuery = t.Object({
  profileIds: t.Optional(t.String({ maxLength: 2000 })),
  audience: t.Optional(AUDIENCE),
})

/** Corpo de `PUT /members/parents/report-prefs` — opt-out do resumo semanal. */
export const ParentReportPrefsBody = t.Object({
  disabled: t.Boolean(),
})

/**
 * Query da rota S2S `GET /members/internal/showcase-eligibility` (consumida pelo
 * `@sistemazero/hub` ao auto-publicar no Mural): elegibilidade + conteúdo AUTORITATIVO
 * do projeto. `accountId` resolve o ACESSO (conta), `userId` a ENTREGA (perfil).
 * `privileged` = `'true'` quando o HUB derivou que o ator é EQUIPE (chave-mestra
 * virtual) — o hub o repassa e o members honra (equipe publica no Mural p/ TESTAR o
 * fluxo, como já faz na rota de aluno `showcase-payload`). Ausente/≠'true' → `false`.
 */
export const ShowcaseEligibilityQuery = t.Object({
  accountId: UUID,
  userId: UUID,
  lessonId: UUID,
  blockId: UUID,
  privileged: t.Optional(t.Literal('true')),
})

/**
 * Query de `GET /members/admin/members/:userId` — CSV opcional dos ids dos perfis
 * (estilo Netflix) da conta, p/ o progresso POR PERFIL. O handler valida o formato
 * uuid e limita a quantidade (perfis lixo/exagerados são descartados na borda).
 */
export const MemberDetailQuery = t.Object({
  profileIds: t.Optional(t.String({ maxLength: 2000 })),
})

/** Query da listagem de crianças do painel (batch): perfis da página + vitrine. */
export const ProfilesOverviewQuery = t.Object({
  profileIds: t.Optional(t.String({ maxLength: 2000 })),
  audience: t.Optional(AUDIENCE),
})

const UUID_RE = new RegExp(UUID_PATTERN)
/** Quebra o CSV de `profileIds` em uuids válidos (descarta lixo; teto de 50). */
export function parseProfileIds(csv: string | undefined): string[] {
  if (!csv) return []
  return csv
    .split(',')
    .map((s) => s.trim())
    .filter((s) => UUID_RE.test(s))
    .slice(0, 50)
}

/** Corpo de `POST /members/webhooks/subscription` — ciclo de vida da assinatura. */
export const SubscriptionWebhookBody = t.Object({
  event: t.Union([t.Literal('canceled'), t.Literal('expired')]),
  subscriptionId: t.String({ minLength: 1, maxLength: 100 }),
})

/**
 * Corpo de `POST /members/webhooks/showcase` — o HUB avisa que o aluno PUBLICOU o
 * projeto de um curso no Mural dos Criadores. Grava o marco `course_showcased`
 * (sourceId = courseId) no ledger — combinado com `course_complete` define o curso
 * "qualificado" p/ o NÍVEL DO ALUNO. `accountId` vem do hub (a conta dona do perfil,
 * usada só se o perfil de gamificação ainda não existir — o marco é amount 0).
 */
export const ShowcaseWebhookBody = t.Object({
  userId: UUID,
  accountId: UUID,
  courseId: UUID,
  audience: AUDIENCE,
})

/**
 * Corpo de `POST /members/webhooks/challenge` — o HUB avisa que o aluno publicou no
 * Mural com a tag do DESAFIO do mês (posse Clube+Estúdio já validada lá). O members
 * revalida o MÊS e degrada com 200 sem award em mismatch (nunca 5xx — retry martelaria).
 */
export const ChallengeWebhookBody = t.Object({
  userId: UUID,
  accountId: UUID,
  audience: AUDIENCE,
  challengeKey: t.String({ pattern: '^m:\\d{4}-\\d{2}$' }),
})

/**
 * Corpo de `POST /members/webhooks/clube` — o HUB avisa que a equipe APROVOU um
 * tópico/comentário do Clube. Grava XP (thread 5, comment 3) + badge na 1ª thread.
 * `contentId` = id do conteúdo (chave de idempotência do ledger; re-aprovar é inerte).
 */
export const ClubeWebhookBody = t.Object({
  userId: UUID,
  accountId: UUID,
  audience: AUDIENCE,
  kind: t.Union([t.Literal('thread'), t.Literal('comment')]),
  contentId: UUID,
})

/**
 * Corpo de `POST /members/webhooks/mural-comment` — o HUB avisa que a equipe APROVOU
 * um comentário no Mural dos Criadores. Grava o MARCO `mural_comment` (amount 0, só
 * conta p/ a missão "comentar no Mural"). `commentId` = id do comentário (idempotência
 * do ledger; re-aprovar é inerte). Premiar só na aprovação bloqueia farm/rejeitado.
 */
export const MuralCommentWebhookBody = t.Object({
  userId: UUID,
  accountId: UUID,
  audience: AUDIENCE,
  commentId: UUID,
})

/**
 * Corpo de `POST /members/webhooks/mural-message` — o HUB avisa que a equipe MODEROU
 * um jogo publicado (escondeu/recusou) COM um motivo p/ a criança. Vira uma mensagem
 * `teacher` numa conversa de contexto `mural_publication` (canal de retorno). O
 * `contextRef` é o id do TÓPICO no hub (texto, NÃO uuid — snapshot de outro serviço);
 * `accountId` é a conta responsável (snapshot, pode faltar em posts legados).
 */
export const MuralMessageWebhookBody = t.Object({
  userId: UUID,
  accountId: t.Optional(UUID),
  audience: AUDIENCE,
  contextRef: t.String({ minLength: 1, maxLength: 200 }),
  reason: t.String({ minLength: 1, maxLength: 1000 }),
  /** Nome de EXIBIÇÃO do moderador (snapshot); ausente → a UI kids mostra "Professor(a)". */
  moderatorName: t.Optional(t.String({ maxLength: 200 })),
  /** Título do jogo/curso p/ a caixa renderizar (snapshot). */
  title: t.Optional(t.String({ maxLength: 200 })),
})

/**
 * Corpo de `POST /members/webhooks/showcase-standalone` — o HUB avisa que a criança
 * publicou um jogo STANDALONE (do /estudio, fora de curso) no Mural. Grava o MARCO
 * `studio_published` (amount 0, sourceId = playId — missões gated por estudio-completo)
 * + o XP DIÁRIO `studio_publish_day` (1×/dia — a âncora de streak de quem só cria).
 */
export const StandaloneShowcaseWebhookBody = t.Object({
  userId: UUID,
  accountId: UUID,
  audience: AUDIENCE,
  playId: UUID,
})

/**
 * Corpo de `POST /members/webhooks/plays-milestone` — o HUB avisa que um jogo do
 * AUTOR cruzou 10/100 jogadas no /jogar público (crossing exato no UPDATE atômico do
 * plays_count). Marco amount 0 (sourceId = playId) → badges plays-10/plays-100 (+ troféu).
 */
export const PlaysMilestoneWebhookBody = t.Object({
  userId: UUID,
  accountId: UUID,
  audience: AUDIENCE,
  playId: UUID,
  milestone: t.Union([t.Literal(10), t.Literal(100)]),
})

/**
 * Corpo de `POST /members/gamification/remix` — a criança remixou um jogo do Mural
 * ("Fazer a minha versão"). O service valida posse do Estúdio + o playId no hub.
 */
export const StudioRemixBody = t.Object({
  playId: UUID,
})

/** Corpo de `PUT /members/courses/:slug/lessons/:lessonId/position` (throttled no client). */
export const VideoPositionBody = t.Object({
  positionSeconds: t.Integer({ minimum: 0, maximum: 100_000 }),
})

/** Nota do curso: 1–5 em passos de 0.5 (a rota converte ×2 → `ratingHalf`). */
const RATING_VALUE = t.Union([
  t.Literal(1),
  t.Literal(1.5),
  t.Literal(2),
  t.Literal(2.5),
  t.Literal(3),
  t.Literal(3.5),
  t.Literal(4),
  t.Literal(4.5),
  t.Literal(5),
])

const FEEDBACK_ANSWER = t.Union([t.Literal('yes'), t.Literal('no'), t.Literal('unsure')])

/**
 * Corpo de `PUT /members/courses/:slug/rating` — cada passo do fluxo manda o
 * estado ACUMULADO (a nota está sempre presente; comment/feedback são opcionais).
 * Chaves de feedback espelham `COURSE_FEEDBACK_QUESTION_KEYS` (domain/rating).
 * Chave desconhecida é REMOVIDA pelo `normalize` default do Elysia (exact
 * mirror, não rejeita); VALOR inválido continua dando 400.
 */
export const CourseRatingBody = t.Object({
  rating: RATING_VALUE,
  comment: t.Optional(t.Union([t.String({ maxLength: 5000 }), t.Null()])),
  feedbackAnswers: t.Optional(
    t.Union([
      t.Object(
        {
          importantInfo: t.Optional(FEEDBACK_ANSWER),
          clearExplanations: t.Optional(FEEDBACK_ANSWER),
          engagingInstructor: t.Optional(FEEDBACK_ANSWER),
          enoughPractice: t.Optional(FEEDBACK_ANSWER),
          meetsExpectations: t.Optional(FEEDBACK_ANSWER),
          knowledgeable: t.Optional(FEEDBACK_ANSWER),
        },
        { additionalProperties: false },
      ),
      t.Null(),
    ]),
  ),
})

/**
 * Corpo de `POST /members/lessons/:lessonId/blocks/:blockId/quiz-attempts`:
 * questionId → choiceIds marcados. Score é calculado NO SERVIDOR.
 */
export const QuizAttemptBody = t.Object({
  answers: t.Record(
    t.String({ minLength: 1, maxLength: 64 }),
    t.Array(t.String({ minLength: 1, maxLength: 64 }), { maxItems: 20 }),
    { maxProperties: 100 },
  ),
})

// ── Pensa (planejamento guiado — rotas /members/pensa/*) ────────────────────
// Enums espelham os `pensa_*` do schema; params com uuid validados na borda.
const PENSA_STAGE = t.Union([
  t.Literal('z'),
  t.Literal('e'),
  t.Literal('r'),
  t.Literal('o'),
  t.Literal('done'),
])
// Etapas de TRABALHO (aceitam escrita/advance — `done` fica de fora).
const PENSA_WORK_STAGE = t.Union([t.Literal('z'), t.Literal('e'), t.Literal('r'), t.Literal('o')])
const PENSA_ARTIFACT_TYPE = t.Union([
  t.Literal('idea'),
  t.Literal('game_design'),
  t.Literal('visual_direction'),
  t.Literal('task_plan'),
  t.Literal('plan_review'),
])
const PENSA_PROJECT_NAME = t.String({ minLength: 2, maxLength: 120 })

export const PensaProjectParams = t.Object({ projectId: UUID })
export const PensaCycleParams = t.Object({ cycleId: UUID })
/** GET da stage view aceita qualquer etapa (inclusive `done`). */
export const PensaStageParams = t.Object({ cycleId: UUID, stage: PENSA_STAGE })
/** Escrita de conversa só em etapa de TRABALHO (não há chat em `done`). */
export const PensaConversationParams = t.Object({ cycleId: UUID, stage: PENSA_WORK_STAGE })
export const PensaArtifactValidateParams = t.Object({ cycleId: UUID, type: PENSA_ARTIFACT_TYPE })
export const PensaTaskParams = t.Object({ taskId: UUID })

/** Corpo de `POST /members/pensa/projects` — o serviço trima e revalida 2..120. */
export const PensaCreateProjectBody = t.Object(
  {
    name: PENSA_PROJECT_NAME,
  },
  { additionalProperties: false },
)

/** Corpo de `PATCH /members/pensa/projects/:projectId` (parcial). */
export const PensaUpdateProjectBody = t.Object(
  {
    name: t.Optional(PENSA_PROJECT_NAME),
    status: t.Optional(t.Union([t.Literal('active'), t.Literal('archived')])),
  },
  { additionalProperties: false },
)

/** Corpo de `POST /members/pensa/projects/:projectId/cycles`. */
export const PensaCreateCycleBody = t.Object({ goal: t.String({ minLength: 2, maxLength: 500 }) })

// Turno do chat guiado. O TETO da conversa (80 msgs / 262K chars) é do use case
// (trim); aqui só o formato + um teto folgado por mensagem (anti-DoS na borda).
const PENSA_CHAT_MESSAGE = t.Object({ content: t.String({ minLength: 1, maxLength: 100_000 }) })
/** Corpo de `PUT /members/pensa/cycles/:cycleId/stages/:stage/conversation`. */
export const PensaConversationBody = t.Object({
  userMessage: PENSA_CHAT_MESSAGE,
  assistantMessage: PENSA_CHAT_MESSAGE,
  /** Presente = SUBSTITUI o state inteiro (etapa z: PensaZState). */
  state: t.Optional(t.Record(t.String({ maxLength: 200 }), t.Unknown(), { maxProperties: 64 })),
  /** Sumarização (quando o cap cortou mensagens antigas). */
  summary: t.Optional(t.String({ maxLength: 20_000 })),
})

/**
 * Corpo de `POST /members/pensa/cycles/:cycleId/artifacts` — `content` é JSON
 * opaco; o TETO (262K chars stringificado) é validado no use case (TypeBox não
 * limita bytes de agregado), sob o teto de corpo de 1 MB da rota.
 */
export const PensaArtifactBody = t.Object({
  stage: PENSA_WORK_STAGE,
  type: PENSA_ARTIFACT_TYPE,
  content: t.Unknown(),
})

/** Corpo de `POST /members/pensa/cycles/:cycleId/advance`. */
export const PensaAdvanceBody = t.Object({ from: PENSA_WORK_STAGE })

const PENSA_TASK_DESTINATION = t.Union([t.Literal('pinta'), t.Literal('studio')])
const PENSA_TASK_CATEGORY = t.Union([
  t.Literal('art'),
  t.Literal('setup'),
  t.Literal('gameplay'),
  t.Literal('scene'),
  t.Literal('ui'),
  t.Literal('polish'),
])
const PensaGuideItemSchema = t.Object({
  id: t.String({ minLength: 1, maxLength: 100 }),
  text: t.String({ minLength: 1, maxLength: 500 }),
  hint: t.Optional(t.String({ maxLength: 500 })),
  required: t.Boolean(),
})
const PensaTaskGuideSchema = t.Object({
  steps: t.Array(PensaGuideItemSchema, { minItems: 1, maxItems: 20 }),
  criteria: t.Array(PensaGuideItemSchema, { minItems: 1, maxItems: 10 }),
})
const PensaPintaContextSchema = t.Object({
  kind: t.Literal('pinta'),
  assetId: t.String({ minLength: 1, maxLength: 100 }),
  artKind: t.Union([
    t.Literal('sprite'),
    t.Literal('background'),
    t.Literal('tileset'),
    t.Literal('tilemap'),
  ]),
  style: t.Union([t.Literal('pixel'), t.Literal('vector'), t.Literal('either')]),
  preset: t.Optional(t.String({ maxLength: 100 })),
  palette: t.Array(
    t.Object({
      role: t.String({ minLength: 1, maxLength: 80 }),
      color: t.String({ maxLength: 20 }),
    }),
    { maxItems: 16 },
  ),
  appearance: t.String({ minLength: 1, maxLength: 2000 }),
  animations: t.Array(t.String({ maxLength: 200 }), { maxItems: 20 }),
  states: t.Array(t.String({ maxLength: 200 }), { maxItems: 20 }),
  usage: t.String({ minLength: 1, maxLength: 2000 }),
  requiresStudioUse: t.Boolean(),
})
const PensaStudioBlockSchema = t.Object({
  id: t.String({ minLength: 1, maxLength: 160 }),
  label: t.String({ minLength: 1, maxLength: 200 }),
  category: t.String({ minLength: 1, maxLength: 100 }),
  subcategory: t.String({ minLength: 1, maxLength: 100 }),
  area: t.Union([
    t.Literal('structure'),
    t.Literal('appearance'),
    t.Literal('start'),
    t.Literal('events'),
    t.Literal('loops'),
    t.Literal('value'),
  ]),
  extension: t.Union([t.String({ maxLength: 100 }), t.Null()]),
})
const PensaStudioContextSchema = t.Object({
  kind: t.Literal('studio'),
  dimension: t.Union([t.Literal('2d'), t.Literal('3d')]),
  visualAssetIds: t.Array(t.String({ minLength: 1, maxLength: 100 }), { maxItems: 20 }),
  blockIds: t.Array(t.String({ maxLength: 160 }), { maxItems: 80 }),
  blocks: t.Array(PensaStudioBlockSchema, { maxItems: 80 }),
  mechanicDocumentIds: t.Array(t.String({ maxLength: 100 }), { maxItems: 10 }),
  extensionIds: t.Array(t.String({ maxLength: 100 }), { maxItems: 10 }),
})
const PensaTaskContextSchema = t.Union([PensaPintaContextSchema, PensaStudioContextSchema])

// REPLACE total das tasks. O teto de NEGÓCIO (≤60 → 409 PENSA_QUOTA_EXCEEDED) é
// do use case — o `maxItems` da borda é só anti-DoS (mais folgado, senão viraria 400).
export const PensaTasksReplaceBody = t.Object({
  tasks: t.Array(
    t.Object({
      title: t.String({ minLength: 1, maxLength: 200 }),
      summary: t.Optional(t.Union([t.String({ maxLength: 2000 }), t.Null()])),
      key: t.String({ minLength: 1, maxLength: 100 }),
      destination: PENSA_TASK_DESTINATION,
      category: PENSA_TASK_CATEGORY,
      estimatedMinutes: t.Integer({ minimum: 5, maximum: 240 }),
      dependencies: t.Optional(
        t.Array(t.String({ minLength: 1, maxLength: 100 }), { maxItems: 40 }),
      ),
      guide: PensaTaskGuideSchema,
      context: PensaTaskContextSchema,
    }),
    { maxItems: 200 },
  ),
})

/**
 * Edição do plano. Progresso vive numa rota separada e só é escrito pelas
 * ferramentas de destino.
 */
export const PensaTaskUpdateBody = t.Object({
  position: t.Optional(t.Integer({ minimum: 0, maximum: 1000 })),
  title: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
  summary: t.Optional(t.Union([t.String({ maxLength: 2000 }), t.Null()])),
  destination: t.Optional(PENSA_TASK_DESTINATION),
  category: t.Optional(PENSA_TASK_CATEGORY),
  estimatedMinutes: t.Optional(t.Integer({ minimum: 5, maximum: 240 })),
  dependencies: t.Optional(t.Array(UUID, { maxItems: 40 })),
  guide: t.Optional(PensaTaskGuideSchema),
  context: t.Optional(PensaTaskContextSchema),
})
const PensaTaskOutputRefSchema = t.Union([
  t.Object({
    kind: t.Literal('pinta_asset'),
    assetId: t.String({ minLength: 1, maxLength: 200 }),
    assetName: t.Optional(t.String({ maxLength: 200 })),
    usedInStudioAt: t.Optional(t.String({ maxLength: 60 })),
  }),
  t.Object({
    kind: t.Literal('studio_project'),
    projectId: t.String({ minLength: 1, maxLength: 200 }),
    saveRevision: t.Optional(t.String({ maxLength: 200 })),
  }),
])
export const PensaTaskProgressBody = t.Object({
  status: t.Optional(
    t.Union([t.Literal('planned'), t.Literal('in_progress'), t.Literal('completed')]),
  ),
  completedStepIds: t.Optional(
    t.Array(t.String({ minLength: 1, maxLength: 100 }), { maxItems: 20 }),
  ),
  completedCriteriaIds: t.Optional(
    t.Array(t.String({ minLength: 1, maxLength: 100 }), { maxItems: 10 }),
  ),
  outputRef: t.Optional(t.Union([PensaTaskOutputRefSchema, t.Null()])),
  expectedUpdatedAt: t.Optional(t.Union([t.String({ format: 'date-time' }), t.Null()])),
})

// ── Admin (painel `@sistemazero/admin`) ─────────────────────────────────────

const ENTITLEMENT_STATUS = t.Union([
  t.Literal('active'),
  t.Literal('revoked'),
  t.Literal('expired'),
  t.Literal('pending'),
])

/** Query de `GET /members/admin/members`. `t.Numeric` coage a string da query. */
export const ListMembersQuery = t.Object({
  status: t.Optional(ENTITLEMENT_STATUS),
  courseRef: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
  offset: t.Optional(t.Numeric({ minimum: 0, maximum: 1_000_000 })),
})

/**
 * Query de `GET /members/admin/members/:userId/gamification` — a gamificação é
 * SEGREGADA por vitrine. O BFF passa `adult` para a conta e `kids` para cada perfil.
 * Ausente → `adult` (paridade com a rota do aluno).
 */
export const AdminGamificationQuery = t.Object({ audience: t.Optional(AUDIENCE) })

/** Query de `GET /members/admin/members/:userId/activity` — paginação da linha do tempo. */
export const AdminActivityQuery = t.Object({
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
  offset: t.Optional(t.Numeric({ minimum: 0, maximum: 1_000_000 })),
})

// `userId` do grant manual vai à coluna uuid `entitlements.user_id`.
const USER_ID = UUID
const EXPIRES_AT = t.Optional(t.Union([t.String({ maxLength: 40 }), t.Null()]))

/**
 * Corpo de `POST /members/admin/entitlements` — concessão manual. União discriminada
 * por `mode`: `offer` (resolve a oferta no catálogo), `course` (direto por curso),
 * `all_courses` (chave-mestra ADULTA) ou `all_kids_courses` (chave-mestra KIDS).
 */
export const GrantEntitlementBody = t.Union([
  t.Object({
    mode: t.Literal('offer'),
    userId: USER_ID,
    offerRef: t.String({ minLength: 1, maxLength: 200 }),
    expiresAt: EXPIRES_AT,
  }),
  t.Object({
    mode: t.Literal('course'),
    userId: USER_ID,
    courseRef: t.String({ minLength: 1, maxLength: 200 }),
    expiresAt: EXPIRES_AT,
  }),
  t.Object({
    mode: t.Literal('all_courses'),
    userId: USER_ID,
    expiresAt: EXPIRES_AT,
  }),
  t.Object({
    mode: t.Literal('all_kids_courses'),
    userId: USER_ID,
    expiresAt: EXPIRES_AT,
  }),
])

/** Corpo de `PATCH /members/admin/entitlements/:id` — revogar/expirar/estender. */
export const ManageEntitlementBody = t.Object({
  action: t.Union([t.Literal('revoke'), t.Literal('expire'), t.Literal('extend')]),
  expiresAt: t.Optional(t.String({ maxLength: 40 })),
})

// ── Autoria de conteúdo (cursos/módulos/aulas/blocos/anexos) ─────────────────

const COURSE_STATUS = t.Union([t.Literal('draft'), t.Literal('published'), t.Literal('archived')])
// Nível (dificuldade) do curso — espelha o enum `course_level` do schema.
// `lenda` = categoria fora da carreira (bônus da formatura, sempre careerSlot null).
const COURSE_LEVEL = t.Union([
  t.Literal('primeiros-passos'),
  t.Literal('iniciante'),
  t.Literal('intermediario'),
  t.Literal('avancado'),
  t.Literal('lenda'),
])
// Eixo 2D/3D do curso — espelha o enum `course_track` do schema.
const COURSE_TRACK = t.Union([t.Literal('2d'), t.Literal('3d')])
const TITLE = t.String({ minLength: 1, maxLength: 300 })
const NULLABLE_TEXT = t.Optional(t.Union([t.String({ maxLength: 20_000 }), t.Null()]))
// URLs escritas pelo admin exigem esquema http(s) — sem isto um `javascript:`
// chegaria intacto ao browser do aluno via views member-facing (o painel já
// valida; aqui é defesa em profundidade na borda do serviço).
const HTTP_URL_PATTERN = '^https?://'
// Mídia que pode viver no bucket R2 PRIVADO: URL http(s) OU `r2priv:<key>`.
const MEDIA_REF_PATTERN = '^(?:https?://|r2priv:).'
const NULLABLE_URL = t.Optional(
  t.Union([t.String({ maxLength: 2000, pattern: HTTP_URL_PATTERN }), t.Null()]),
)

/** Corpo de `POST/PATCH /members/admin/courses[/:id]`. */
const CourseBodyProperties = {
  slug: SLUG,
  title: TITLE,
  subtitle: NULLABLE_TEXT,
  description: NULLABLE_TEXT,
  coverImageUrl: NULLABLE_URL,
  // Página de vendas (funil): vira `metadata.salesPageUrl` — é para onde o
  // cadeado do catálogo "Todos os cursos" leva quem não tem acesso.
  salesPageUrl: NULLABLE_URL,
  status: COURSE_STATUS,
  // Plataforma do curso. AUSENTE: create → `adult`; update → PRESERVA a atual
  // (build antigo do admin sem o campo não rebaixa curso kids em silêncio).
  audience: t.Optional(t.Union([AUDIENCE, t.Null()])),
  // Trava sequencial (estilo Duolingo). AUSENTE: create → `true` (padrão LIGADO);
  // update → PRESERVA a atual (mesma régua do audience).
  sequentialLock: t.Optional(t.Union([t.Boolean(), t.Null()])),
  // Dificuldade. AUSENTE: create → `iniciante`; update → PRESERVA a atual
  // (mesma régua do audience/sequentialLock).
  level: t.Optional(t.Union([COURSE_LEVEL, t.Null()])),
  // Eixo 2D/3D. AUSENTE: create → `2d`; update → PRESERVA o atual (mesma régua).
  track: t.Optional(t.Union([COURSE_TRACK, t.Null()])),
  // Slot da Carreira do Criador: 1 = curso-base; null = bônus/fora da carreira.
  // Máx 8 por degrau (reforma 07/2026); a faixa fina por etapa é validada no domínio.
  careerSlot: t.Optional(t.Union([t.Integer({ minimum: 1, maximum: 8 }), t.Null()])),
  // Blocos que este curso LIBERA no Estúdio livre ao satisfazer o critério atual:
  // bônus Kids exige conclusão; curso Kids com posição e Adult exigem também Mural.
  // Mesmo formato do `allowBlocks` da aula, só que no CURSO. Vira
  // `metadata.studioUnlockBlocks`. AUSENTE **PRESERVA** a lista atual (régua do
  // audience/level, não a do salesPageUrl): build antigo do admin não apaga currículo.
  // `null`/`[]` limpa. A lista é a dos blocos que o curso USA, então repetir fundamentos de
  // cursos anteriores é esperado: quem acumula é o ALUNO (a paleta é a união deduplicada dos
  // cursos conquistados) e ele recebe só o que ainda não tinha. O teto é folgado de propósito
  // (o catálogo do studio tem ~1467 blocos): um teto justo viraria erro de validação num
  // curso grande. A existência de cada id é conferida pelo ADMIN contra o catálogo (o
  // members não o importa).
  studioUnlockBlocks: t.Optional(
    t.Union([
      t.Array(t.String({ minLength: 1, maxLength: 80, pattern: '^[A-Za-z0-9_]+$' }), {
        maxItems: 3000,
      }),
      t.Null(),
    ]),
  ),
}
export const CourseBody = t.Object(CourseBodyProperties)
/** PATCH exige a versão lida para impedir que uma aba antiga sobrescreva outra edição. */
export const CourseUpdateBody = t.Object({
  ...CourseBodyProperties,
  version: t.Integer({ minimum: 0 }),
})

/** Query de `GET /members/admin/courses`. */
export const ListCoursesQuery = t.Object({
  q: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
  status: t.Optional(COURSE_STATUS),
  audience: t.Optional(AUDIENCE),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
  offset: t.Optional(t.Numeric({ minimum: 0, maximum: 1_000_000 })),
})

export const ModuleBody = t.Object({ title: TITLE, summary: NULLABLE_TEXT })

export const LessonBody = t.Object({
  slug: SLUG,
  title: TITLE,
  estimatedMinutes: t.Optional(t.Union([t.Integer({ minimum: 0, maximum: 100_000 }), t.Null()])),
  /** Ausente → `false` (aula nova nasce RASCUNHO; o admin publica quando pronta). */
  isPublished: t.Optional(t.Boolean()),
})

export const AttachmentBody = t.Object({
  label: t.String({ minLength: 1, maxLength: 200 }),
  // `r2priv:<key>` (bucket privado, caminho padrão) ou URL http(s) externa/legada.
  url: t.String({ minLength: 1, maxLength: 2000, pattern: MEDIA_REF_PATTERN }),
  fileType: t.Optional(t.Union([t.String({ maxLength: 100 }), t.Null()])),
  sizeBytes: t.Optional(t.Union([t.Integer({ minimum: 0 }), t.Null()])),
})

/** Reordenação: ids na nova ordem (devem ser exatamente os filhos atuais). */
export const ReorderBody = t.Object({
  orderedIds: t.Array(t.String({ minLength: 1, maxLength: 64 }), { maxItems: 1000 }),
})

// Conteúdo do bloco: união discriminada por `kind` (espelha domain/course/lesson-block.ts).
const RichTextBlockSchema = t.Object({
  kind: t.Literal('rich_text'),
  html: t.Optional(t.String({ maxLength: 200_000 })),
  markdown: t.Optional(t.String({ maxLength: 200_000 })),
  codeLanguageHints: t.Optional(t.Array(t.String({ maxLength: 40 }))),
})
const VideoBlockSchema = t.Object({
  kind: t.Literal('video'),
  provider: t.Union([
    t.Literal('mux'),
    t.Literal('youtube'),
    t.Literal('vimeo'),
    t.Literal('file'),
  ]),
  src: t.String({ minLength: 1, maxLength: 2000, pattern: HTTP_URL_PATTERN }),
  posterUrl: t.Optional(t.String({ maxLength: 2000, pattern: HTTP_URL_PATTERN })),
  durationSeconds: t.Optional(t.Number({ minimum: 0 })),
  captions: t.Optional(
    t.Array(
      t.Object({
        lang: t.String({ maxLength: 20 }),
        url: t.String({ maxLength: 2000, pattern: HTTP_URL_PATTERN }),
      }),
    ),
  ),
})
const ImageBlockSchema = t.Object({
  kind: t.Literal('image'),
  url: t.String({ minLength: 1, maxLength: 2000, pattern: HTTP_URL_PATTERN }),
  alt: t.Optional(t.String({ maxLength: 500 })),
  caption: t.Optional(t.String({ maxLength: 500 })),
})
const AudioBlockSchema = t.Object({
  kind: t.Literal('audio'),
  url: t.String({ minLength: 1, maxLength: 2000, pattern: HTTP_URL_PATTERN }),
  durationSeconds: t.Optional(t.Number({ minimum: 0 })),
})
const QuizBlockSchema = t.Object({
  kind: t.Literal('quiz'),
  questions: t.Array(
    t.Object({
      id: t.String({ minLength: 1, maxLength: 64 }),
      // prompt/label/explanation são MARKDOWN (formatação rica + imagens `![](url)`
      // do editor TipTap do admin) — limites folgados p/ caber URLs de imagem do R2.
      prompt: t.String({ minLength: 1, maxLength: 5000 }),
      choices: t.Array(
        t.Object({
          id: t.String({ minLength: 1, maxLength: 64 }),
          label: t.String({ minLength: 1, maxLength: 2000 }),
        }),
      ),
      correctChoiceIds: t.Array(t.String({ maxLength: 64 })),
      explanation: t.Optional(t.String({ maxLength: 5000 })),
    }),
  ),
  // Nota de corte é % inteira (o score do aluno é inteiro 0–100; 99.5 só "passaria"
  // com 100 e confundiria a autoria).
  passingScore: t.Optional(t.Integer({ minimum: 0, maximum: 100 })),
})
// Autoria v3: interativo é SEMPRE iframe sandbox com HTML (embedType/src/height
// viraram legado — só existem em blocos antigos, nunca em escrita nova).
// `sandbox` aceita SÓ tokens seguros: `allow-same-origin` faria o srcDoc rodar na
// ORIGIN do community (HTML do bloco vira XSS no app do aluno); top-navigation e
// popups-to-escape-sandbox furam o isolamento. Allowlist > blocklist.
const SAFE_SANDBOX_TOKEN =
  'allow-(?:scripts|forms|modals|popups|pointer-lock|downloads|presentation|orientation-lock)'
const EmbedBlockSchema = t.Object({
  kind: t.Literal('embed'),
  html: t.String({ minLength: 1, maxLength: 200_000 }),
  sandbox: t.Optional(
    t.String({
      maxLength: 200,
      pattern: `^${SAFE_SANDBOX_TOKEN}(?: ${SAFE_SANDBOX_TOKEN})*$`,
    }),
  ),
})
/** PDF no bucket R2 privado (`r2priv:<key>`) — vira livro 3D no front do aluno. */
const EbookBlockSchema = t.Object({
  kind: t.Literal('ebook'),
  url: t.String({ minLength: 1, maxLength: 2000, pattern: MEDIA_REF_PATTERN }),
  title: t.Optional(t.String({ maxLength: 300 })),
  zappyStudentNotebook: t.Optional(t.Boolean()),
})

// 6 degraus novos (eixo 2D/3D) + 3 legados tolerados: aulas antigas seguem
// parseando e um build antigo do admin segue salvando. O members NÃO interpreta
// o valor (passthrough opaco ao @sistemazero/studio, que normaliza o legado).
const StudioLevelSchema = t.Union([
  t.Literal('iniciante-2d'),
  t.Literal('iniciante-3d'),
  t.Literal('intermediario-2d'),
  t.Literal('intermediario-3d'),
  t.Literal('avancado-2d'),
  t.Literal('avancado-3d'),
  t.Literal('iniciante'),
  t.Literal('intermediario'),
  t.Literal('avancado'),
])
const StudioModeSchema = t.Union([t.Literal('blocks'), t.Literal('bridge'), t.Literal('code')])
/**
 * Snapshot `Project` do Estúdio (autoria do admin = `initialProject`; entrega do
 * aluno = corpo do submit). O TypeBox exige `name`+`files` e tolera propriedades adicionais.
 * O service também valida `kind:pro`, árvore e template contra o catálogo fechado. O
 * @sistemazero/studio sanitiza o shape inteiro na autoria e de novo no aluno. O teto de
 * tamanho do agregado é aplicado no service.
 */
const StudioProjectSchema = t.Object(
  {
    name: t.String({ maxLength: 200 }),
    files: t.Record(t.String({ maxLength: 200 }), t.String({ maxLength: 2_000_000 })),
  },
  { additionalProperties: true },
)
// ── Atividade com auto-correção (fase 2) ────────────────────────────────────
// Base de toda checagem. Valores esperados (testcase/globalEquals) são `Unknown`
// (dados opacos echoados ao cliente; o teto de tamanho é do corpo/jsonb).
const ActivityCheckBase = {
  id: t.String({ minLength: 1, maxLength: 64 }),
  label: t.String({ minLength: 1, maxLength: 200 }),
  hint: t.Optional(t.String({ maxLength: 1000 })),
  weight: t.Optional(t.Number({ exclusiveMinimum: 0 })),
}
const StructureRuleSchema = t.Union([
  t.Object({ type: t.Literal('usesLoop') }),
  t.Object({
    type: t.Literal('declaresVariable'),
    name: t.String({ minLength: 1, maxLength: 80 }),
  }),
  t.Object({ type: t.Literal('definesFunction'), name: t.String({ minLength: 1, maxLength: 80 }) }),
  t.Object({ type: t.Literal('callsFunction'), name: t.String({ minLength: 1, maxLength: 80 }) }),
  t.Object({ type: t.Literal('usesBlock'), blockType: t.String({ minLength: 1, maxLength: 80 }) }),
])
const BehaviorRuleSchema = t.Union([
  t.Object({ type: t.Literal('consoleContains'), text: t.String({ maxLength: 2000 }) }),
  t.Object({ type: t.Literal('domSelectorExists'), selector: t.String({ maxLength: 500 }) }),
  t.Object({
    type: t.Literal('domSelectorText'),
    selector: t.String({ maxLength: 500 }),
    text: t.String({ maxLength: 2000 }),
  }),
  t.Object({
    type: t.Literal('globalEquals'),
    name: t.String({ maxLength: 80 }),
    value: t.Unknown(),
  }),
])
const ActivityCheckSchema = t.Union([
  t.Object({ ...ActivityCheckBase, kind: t.Literal('structure'), rule: StructureRuleSchema }),
  t.Object({ ...ActivityCheckBase, kind: t.Literal('behavior'), rule: BehaviorRuleSchema }),
  t.Object({
    ...ActivityCheckBase,
    kind: t.Literal('testcase'),
    functionName: t.String({ minLength: 1, maxLength: 80 }),
    cases: t.Array(
      t.Object({
        id: t.Optional(t.String({ maxLength: 64 })),
        args: t.Array(t.Unknown(), { maxItems: 20 }),
        expected: t.Unknown(),
      }),
      {
        maxItems: 50,
      },
    ),
  }),
  t.Object({
    ...ActivityCheckBase,
    kind: t.Literal('code'),
    source: t.String({ maxLength: 20_000 }),
  }),
])
const StudioActivitySchema = t.Object({
  instructions: t.String({ maxLength: 20_000 }),
  checks: t.Array(ActivityCheckSchema, { maxItems: 50 }),
  passingScore: t.Optional(t.Integer({ minimum: 0, maximum: 100 })),
})

/** Bloco Estúdio: editor pré-configurado embutido na aula (ver domain/course/lesson-block.ts). */
const StudioBlockSchema = t.Object({
  kind: t.Literal('studio'),
  initialProject: StudioProjectSchema,
  level: t.Optional(StudioLevelSchema),
  allowBlocks: t.Optional(t.Array(t.String({ maxLength: 80 }), { maxItems: 500 })),
  allowCategories: t.Optional(t.Array(t.String({ maxLength: 80 }), { maxItems: 100 })),
  allowedModes: t.Optional(t.Array(StudioModeSchema, { maxItems: 3 })),
  allowLevelReveal: t.Optional(t.Boolean()),
  activity: t.Optional(StudioActivitySchema),
  /** Nome do projeto contínuo (cadeia) — ver StudioBlock em domain/course/lesson-block.ts. */
  chain: t.Optional(t.String({ maxLength: 80 })),
  /** Vitrine (Mural dos Criadores) — config da auto-publicação; ver StudioBlock. */
  showcase: t.Optional(
    t.Object({
      enabled: t.Boolean(),
      title: t.Optional(t.String({ maxLength: 300 })),
      summary: t.Optional(t.String({ maxLength: 2000 })),
      // Capa padrão: SÓ http(s) (renderizada como `src` na vitrine).
      defaultCoverUrl: t.Optional(t.String({ maxLength: 2000, pattern: '^https?://' })),
    }),
  ),
})

/**
 * Snapshot `PintaAsset` (autoria do admin = `initialAsset`; entrega do aluno = corpo do submit).
 * A borda exige só a IDENTIDADE do desenho — `id`, `name` e um `kind` conhecido — e tolera o
 * resto: o formato interno (bitmaps RLE, formas vetoriais, camadas) é do Pinta, que sanea nas
 * duas pontas, e replicá-lo aqui viraria dois esquemas para manter em dia.
 *
 * ⚠️ O `kind` é validado porque o resto do sistema o LÊ (`pintaAssetKindOf`): um valor
 * desconhecido aqui viraria bloco sem tipo lá na frente.
 */
const PintaAssetSchema = t.Object(
  {
    id: t.String({ minLength: 1, maxLength: 100 }),
    name: t.String({ maxLength: 100 }),
    kind: t.Union([
      t.Literal('pixel-sprite'),
      t.Literal('pixel-background'),
      t.Literal('tileset'),
      t.Literal('tilemap'),
      t.Literal('vector-sprite'),
      t.Literal('vector-background'),
      t.Literal('vector-tileset'),
    ]),
  },
  { additionalProperties: true },
)

/** Bloco Pinta: ateliê de desenho embarcado na aula (ver domain/course/lesson-block.ts). */
const PintaBlockSchema = t.Object({
  kind: t.Literal('pinta'),
  initialAsset: PintaAssetSchema,
  /** Curadoria da caixa de ferramentas (restritiva; vazia = a caixa inteira). */
  allowTools: t.Optional(t.Array(t.String({ maxLength: 40 }), { maxItems: 60 })),
  /** Nome do desenho contínuo (cadeia) — ver PintaBlock em domain/course/lesson-block.ts. */
  chain: t.Optional(t.String({ maxLength: 80 })),
})

/**
 * Bloco certificado (ver domain/course/lesson-block.ts): só metadado de autoria do PDF
 * (não-secreto). Imagens (assinatura/logo) SÓ http(s); cor de destaque hex.
 */
const CertificateSignatureSchema = t.Object({
  imageUrl: t.Optional(t.String({ maxLength: 2000, pattern: HTTP_URL_PATTERN })),
  name: t.Optional(t.String({ maxLength: 120 })),
})
const CertificateBlockSchema = t.Object({
  kind: t.Literal('certificate'),
  baseImageUrl: t.Optional(t.String({ maxLength: 2000, pattern: HTTP_URL_PATTERN })),
  introLine: t.Optional(t.String({ maxLength: 200 })),
  coursePhrase: t.Optional(t.String({ maxLength: 300 })),
  bodyText: t.Optional(t.String({ maxLength: 2000 })),
  signatures: t.Optional(t.Array(CertificateSignatureSchema, { maxItems: 2 })),
  accentColor: t.Optional(HEX_COLOR),
  // Deprecados (layout antigo sem imagem base) — tolerados p/ blocos legados.
  title: t.Optional(t.String({ maxLength: 200 })),
  issuerName: t.Optional(t.String({ maxLength: 200 })),
  signatureImageUrl: t.Optional(t.String({ maxLength: 2000, pattern: HTTP_URL_PATTERN })),
  logoUrl: t.Optional(t.String({ maxLength: 2000, pattern: HTTP_URL_PATTERN })),
  message: t.Optional(t.String({ maxLength: 2000 })),
})

/**
 * "Em breve" (aula em produção): só o recado opcional. Enquanto o bloco existir, o
 * aluno não vê os demais blocos/anexos e não conclui a aula — ver `toLessonDetailView`
 * e o gate do `mark-lesson-complete`.
 */
const ComingSoonBlockSchema = t.Object({
  kind: t.Literal('coming_soon'),
  message: t.Optional(t.String({ maxLength: 500 })),
})

export const LessonBlockContentSchema = t.Union([
  RichTextBlockSchema,
  VideoBlockSchema,
  ImageBlockSchema,
  AudioBlockSchema,
  QuizBlockSchema,
  EmbedBlockSchema,
  EbookBlockSchema,
  StudioBlockSchema,
  PintaBlockSchema,
  CertificateBlockSchema,
  ComingSoonBlockSchema,
])

/** Params da rota de entrega do Estúdio (aluno) — espelha o quiz-attempts. */
export const StudioSubmissionParams = t.Object({ lessonId: UUID, blockId: UUID })
/** Params da rota de carryover do Estúdio (carregar o projeto da aula contínua anterior). */
export const StudioCarryoverParams = t.Object({ lessonId: UUID, blockId: UUID })
/** Params da rota de payload da vitrine (Mural) — elegibilidade + conteúdo do post. */
export const ShowcasePayloadParams = t.Object({ lessonId: UUID, blockId: UUID })
/** Params da rota admin de UMA entrega (por bloco + aluno). `id` = blockId. */
export const AdminStudioSubmissionParams = t.Object({ id: UUID, userId: UUID })

/** `POST /members/admin/studio-submissions/:blockId/:userId/review` (o "já conferi"). */
export const ReviewSubmissionParams = t.Object({ blockId: UUID, userId: UUID })
export const ReviewSubmissionBody = t.Object({ reviewed: t.Boolean() })

/** Resultado reportado pelo cliente p/ uma checagem (correção híbrida). */
const ClientCheckResultSchema = t.Object({
  checkId: t.String({ maxLength: 64 }),
  passed: t.Boolean(),
  message: t.Optional(t.String({ maxLength: 2000 })),
})
/** Corpo de `POST /members/lessons/:lessonId/blocks/:blockId/studio-submission` (aluno). */
export const StudioSubmissionBody = t.Object({
  project: StudioProjectSchema,
  /** Resultados das checagens rodadas no cliente (behavior/testcase/code). */
  results: t.Optional(t.Array(ClientCheckResultSchema, { maxItems: 50 })),
  /** Recado OPCIONAL do aluno ao professor (modal de envio). Vazio → sem recado. */
  message: t.Optional(t.String({ maxLength: 1000 })),
})

/**
 * Corpo de `POST /members/lessons/:lessonId/blocks/:blockId/pinta-submission` (aluno).
 * Sem `results`: não há auto-correção de desenho.
 */
export const PintaSubmissionBody = t.Object({
  asset: PintaAssetSchema,
  /** Recado OPCIONAL da criança ao professor. Vazio → sem recado. */
  message: t.Optional(t.String({ maxLength: 1000 })),
})

// ── Conversas professor↔aluno (canal de retorno) ────────────────────────────
const TEACHER_CONTEXT = t.Union([
  t.Literal('studio_submission'),
  t.Literal('mural_publication'),
  t.Literal('general'),
])
/**
 * Corpo de uma mensagem (aluno responde / professor responde a uma conversa por id).
 * Teto folgado (8000): o professor escreve markdown com print + código; o aluno responde
 * texto simples (o front kids limita bem abaixo). Espelha a coluna `teacher_messages.body`.
 */
export const TeacherThreadReplyBody = t.Object({
  body: t.String({ minLength: 1, maxLength: 8000 }),
})
/** Query da caixa de entrada do ALUNO (`GET /members/teacher-threads`). */
export const TeacherThreadsQuery = t.Object({
  audience: t.Optional(AUDIENCE),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
  offset: t.Optional(t.Numeric({ minimum: 0, maximum: 1_000_000 })),
})
/** Cursor opaco da página anterior do histórico de uma conversa. */
export const TeacherThreadPageQuery = t.Object({
  audience: t.Optional(AUDIENCE),
  before: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
})
/** Query de `GET /members/admin/teacher-threads/by-context` — abrir a conversa da Entrega. */
export const AdminTeacherThreadByContextQuery = t.Object({
  userId: UUID,
  contextType: t.Union([t.Literal('studio_submission'), t.Literal('mural_publication')]),
  contextRef: t.String({ minLength: 1, maxLength: 200 }),
  before: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
})
export const AdminTeacherThreadPageQuery = t.Object({
  before: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
})
/** Query da caixa de entrada do PROFESSOR (`GET /members/admin/teacher-threads`). */
export const AdminTeacherThreadsQuery = t.Object({
  audience: t.Optional(AUDIENCE),
  context: t.Optional(TEACHER_CONTEXT),
  courseId: t.Optional(UUID),
  unread: t.Optional(t.Literal('true')),
  // CSV de userIds/accountIds (filtro por aluno, 24/07) — uuids válidos, teto 20.
  userIds: t.Optional(t.String({ maxLength: 800 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
  offset: t.Optional(t.Numeric({ minimum: 0, maximum: 1_000_000 })),
})
/** Corpo de `POST /members/admin/teacher-threads/read-all` (escopo opcional da caixa). */
export const AdminTeacherThreadsReadAllBody = t.Object({
  audience: t.Optional(AUDIENCE),
  context: t.Optional(TEACHER_CONTEXT),
  courseId: t.Optional(UUID),
})
/** CSV de userIds (filtro por aluno) → uuids válidos; descarta lixo, teto 20. */
export function parseUserIds(csv: string | undefined): string[] | undefined {
  if (!csv) return undefined
  const ids = csv
    .split(',')
    .map((s) => s.trim())
    .filter((s) => UUID_RE.test(s))
    .slice(0, 20)
  return ids.length > 0 ? ids : undefined
}
/**
 * Corpo de `POST /members/admin/teacher-threads` — o professor ABRE/CONTINUA uma
 * conversa por CONTEXTO (Entrega do Estúdio ou recado geral; o Mural entra por
 * webhook). `blockId` é o contexto da entrega (obrigatório em `studio_submission`);
 * os denormalizados (course/lesson/title) são snapshot p/ a caixa renderizar.
 */
export const AdminTeacherThreadPostBody = t.Object({
  userId: UUID,
  accountId: t.Optional(UUID),
  audience: AUDIENCE,
  contextType: t.Union([t.Literal('studio_submission'), t.Literal('general')]),
  blockId: t.Optional(UUID),
  courseId: t.Optional(UUID),
  lessonId: t.Optional(UUID),
  title: t.Optional(t.String({ maxLength: 200 })),
  // Markdown do professor (print + código) — espelha a coluna `teacher_messages.body`.
  body: t.String({ minLength: 1, maxLength: 8000 }),
})

/** Corpo de `POST/PATCH /members/admin/...blocks`. */
export const BlockBody = t.Object({ content: LessonBlockContentSchema })

// ── Desafio do mês — gestão pelo admin ───────────────────────────────────────
/** Mês SEM o prefixo `m:` (URLs do admin não carregam `:`); vira chave no handler. */
export const ChallengeMonthParams = t.Object({
  month: t.String({ pattern: '^\\d{4}-(0[1-9]|1[0-2])$' }),
})
/** Exatamente UM dos dois — validado no service (XOR não cabe bem no TypeBox). */
export const ChallengeOverrideBody = t.Object({
  builtinSlug: t.Optional(t.String({ minLength: 1, maxLength: 64, pattern: '^[a-z0-9-]+$' })),
  customThemeId: t.Optional(UUID),
})
export const ChallengeThemeBody = t.Object({
  emoji: t.String({ minLength: 1, maxLength: 16 }),
  title: t.String({ minLength: 1, maxLength: 80 }),
  description: t.String({ minLength: 1, maxLength: 300 }),
})
export const ChallengeThemePatchBody = t.Object({
  emoji: t.Optional(t.String({ minLength: 1, maxLength: 16 })),
  title: t.Optional(t.String({ minLength: 1, maxLength: 80 })),
  description: t.Optional(t.String({ minLength: 1, maxLength: 300 })),
  archived: t.Optional(t.Boolean()),
})

// ── "Guardado na sua conta": criações do Estúdio Completo e do Pinta ─────────
/** `studio` | `pinta` (o enum `creation_tool`). */
export const CREATION_TOOL = t.Union([t.Literal('studio'), t.Literal('pinta')])
export const CreationToolParams = t.Object({ tool: CREATION_TOOL })
/**
 * `itemId` = id do projeto/desenho no editor (ulid do Estúdio, uuid do Pinta,
 * `pensa-<uuid sem hífen>`): charset seguro para virar chave no R2. Nunca `:`.
 */
export const CreationItemParams = t.Object({
  tool: CREATION_TOOL,
  itemId: t.String({ minLength: 1, maxLength: 64, pattern: '^[A-Za-z0-9_-]+$' }),
})
/**
 * Corpo da reserva de upload — só metadados; o blob vai direto ao R2. O BFF já corta
 * nome/kind nos tetos e descarta a miniatura grande; os `maxLength` aqui são a rede de
 * segurança de quem chegar por outro caminho.
 */
export const CreationUploadBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 120 }),
  kind: t.String({ minLength: 1, maxLength: 40 }),
  /** `updatedAt` do item no relógio do editor (ISO). */
  itemUpdatedAt: t.String({ format: 'date-time' }),
  /**
   * Bytes COMPRIMIDOS que vão subir (o BFF assina exatamente esse Content-Length).
   * O teto do DTO barra o absurdo antes de o serviço responder 409 (e antes de estourar
   * o `integer` da coluna); o teto de negócio continua sendo `CREATION_LIMITS.maxItemBytes`.
   */
  bytes: t.Integer({ minimum: 1, maximum: 1_000_000_000 }),
  /** PNG data URL pequeno, opcional. Acima do teto do serviço (12 k) é descartado, não recusado. */
  thumb: t.Optional(t.Union([t.String({ maxLength: 20_000 }), t.Null()])),
  /**
   * A revisão da nuvem que o aparelho conhece para o item (0 = nunca viu / item novo).
   * Presente → a reserva só passa se for a corrente (409 CREATION_STALE_BASE se outro
   * aparelho subiu depois). Ausente → sem conferência (clientes antigos).
   */
  baseRevision: t.Optional(t.Integer({ minimum: 0 })),
  /**
   * PARTES referenciadas pela revisão (hash SHA-256 hex do conteúdo; `bytes` só é preciso
   * para as que o item ainda não tem — o members responde 409 CREATION_PARTS_NEED_BYTES com
   * os hashes quando faltam). Ausente = blob único.
   */
  parts: t.Optional(
    t.Array(
      t.Object({
        hash: t.String({ pattern: '^[a-f0-9]{64}$' }),
        bytes: t.Optional(t.Integer({ minimum: 1, maximum: 40 * 1024 * 1024 })),
      }),
      { maxItems: 128 },
    ),
  ),
})
/**
 * Só a revisão: bytes e metadados são os da RESERVA (o que foi conferido e assinado).
 * `uploadedParts` = hashes das partes que o cliente PUTou (as faltantes da reserva).
 */
export const CreationCommitBody = t.Object({
  revision: t.Integer({ minimum: 1 }),
  uploadedParts: t.Optional(t.Array(t.String({ pattern: '^[a-f0-9]{64}$' }), { maxItems: 128 })),
})
