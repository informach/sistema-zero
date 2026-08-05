import 'server-only'
import { cache } from 'react'
import { getEnv } from '../lib/env'
import type {
  AiUsageConsumeView,
  AttachmentDownloadView,
  AvatarConfigInput,
  AvatarEquipResult,
  AvatarPurchaseResult,
  AvatarStateView,
  AvatarsBatchView,
  CatalogCourseView,
  CertificateIssueView,
  CertificateStateView,
  CertificateValidationView,
  ChallengeMeView,
  ChildStatsView,
  CourseDetailView,
  CourseFeedbackAnswers,
  CourseRatingView,
  EbookDownloadView,
  GamificationDelta,
  GamificationMeView,
  HubAttachmentKind,
  HubChannelView,
  HubCommentView,
  HubMyThreadView,
  HubPage,
  HubResolvedAttachment,
  HubSpaceView,
  HubThreadView,
  LeagueMeView,
  LessonCompleteResult,
  LessonDetailView,
  MissionClaimResult,
  MissionsMeView,
  MyCourseView,
  MySubscriptionView,
  Paginated,
  ParentReportPrefsView,
  PaymentView,
  PensaArtifactType,
  PensaArtifactView,
  PensaProjectDetailView,
  PensaProjectListView,
  PensaProjectStatus,
  PensaStage,
  PensaStageView,
  PensaTaskCategory,
  PensaTaskContext,
  PensaTaskDestination,
  PensaTaskGuide,
  PensaTaskHandoffView,
  PensaTaskOutputRef,
  PensaTaskStatus,
  PensaTaskView,
  ProductAccessView,
  ProfileView,
  PublicProfileGameView,
  PublicProfileIdentity,
  QuizAttemptResultView,
  RoomBuyResult,
  RoomEditorView,
  RoomStateView,
  ShowcasePayloadView,
  StreakFreezeResult,
  StudioSubmissionResultView,
  TeacherThreadSummaryView,
  TeacherThreadView,
  UserView,
  VacationResult,
  ZappyHistoryPageView,
  ZappyKnowledgeHitView,
  ZappyStoredResponseView,
} from '../lib/types'
import { clientForwardHeaders, type GatewayModule, type GatewayResponse } from './gateway'
import type { AuthTokens } from './session'

const enc = encodeURIComponent

// Rotas públicas de auth são rápidas por contrato — gateway pendurado não pode
// segurar a request do aluno.
const AUTH_TIMEOUT_MS = 15_000

/** Audiência da vitrine no members: `adult` (community) | `kids` (community-kids). */
export type MembersAudience = 'adult' | 'kids'

/**
 * Ref do produto vendável "Estúdio Completo" (= slug do produto/curso no catálogo).
 * Quem possui acessa o editor standalone e pode publicar do estúdio. ⚠️ Tem que casar
 * com o `STUDIO_STANDALONE_ACCESS_REF` do hub e com o slug do produto no catálogo.
 */
export const STUDIO_ACCESS_REF = 'estudio-completo'

/**
 * Ref do produto vendável "Pensa" (planejamento guiado — metodologia ZERO). Quem
 * possui cria projetos no Pensa; o members aplica o gate no CREATE do projeto.
 * ⚠️ Tem que casar com o `PENSA_ACCESS_REF` do members e o slug do produto no catálogo.
 */
export const PENSA_ACCESS_REF = 'pensa'

/**
 * Ref do produto vendável "Pinta" (editor de assets de jogos — pixel art/animações/
 * tiles/vetorial). O gate é SÓ na página (dados são locais ao navegador, padrão
 * Estúdio Completo). ⚠️ Tem que casar com o slug do produto no catálogo.
 */
export const PINTA_ACCESS_REF = 'pinta'

/**
 * Ref do produto "Clube dos Criadores" — junto do Estúdio, é a POSSE do DESAFIO
 * do mês (game jam). ⚠️ Tem que casar com o `CHALLENGE_CLUB_REF` do hub e o slug
 * do produto/servidor no catálogo.
 */
export const CLUB_ACCESS_REF = 'clube-dos-criadores'

export type AuthClient = ReturnType<typeof createAuthClient>
export type MembersClient = ReturnType<typeof createMembersClient>
export type PaymentsClient = ReturnType<typeof createPaymentsClient>
export type HubClient = ReturnType<typeof createHubClient>
export type ProfilesClient = ReturnType<typeof createProfilesClient>

/** Corpo da criação/edição de perfil (espelha os DTOs do auth). */
export interface ProfileWriteInput {
  name?: string
  avatarUrl?: string | null
  whatsapp?: string | null
  /** Data de nascimento (`YYYY-MM-DD`) — o auth recusa edição em sessão de perfil. */
  birthDate?: string | null
  /** Perfil público entre crianças — o auth recusa edição em sessão de perfil. */
  publicProfileEnabled?: boolean
}

/**
 * Client dos perfis (estilo Netflix) no auth. Gestão (list/create/update/archive)
 * exige sessão da CONTA — o auth recusa (403) sessão de perfil; `select`/`exit`
 * EMITEM tokens novos (o handler troca os cookies). `select` aceita conta OU outro
 * perfil (trocar de irmão); `exit` é gateado pela senha do responsável no auth.
 */
export function createProfilesClient(gw: GatewayModule) {
  return {
    list(): Promise<GatewayResponse<{ profiles: ProfileView[] }>> {
      return gw.gatewayFetch('/auth/profiles')
    },
    listReadonly(): Promise<GatewayResponse<{ profiles: ProfileView[] }>> {
      return gw.gatewayFetchReadonly('/auth/profiles')
    },
    create(body: ProfileWriteInput): Promise<GatewayResponse<{ profile: ProfileView }>> {
      return gw.gatewayFetch('/auth/profiles', { method: 'POST', body })
    },
    update(
      id: string,
      body: ProfileWriteInput,
    ): Promise<GatewayResponse<{ profile: ProfileView }>> {
      return gw.gatewayFetch(`/auth/profiles/${enc(id)}`, { method: 'PATCH', body })
    },
    archive(id: string): Promise<GatewayResponse<{ archived: boolean }>> {
      return gw.gatewayFetch(`/auth/profiles/${enc(id)}`, { method: 'DELETE' })
    },
    select(id: string): Promise<GatewayResponse<{ profile?: ProfileView; tokens?: AuthTokens }>> {
      return gw.gatewayFetch(`/auth/profiles/${enc(id)}/select`, { method: 'POST' })
    },
    exit(password: string): Promise<GatewayResponse<{ tokens?: AuthTokens }>> {
      return gw.gatewayFetch('/auth/profile-session/exit', { method: 'POST', body: { password } })
    },
  }
}

/**
 * Rotas PÚBLICAS (sem Bearer) — chamadas diretas ao gateway. Propaga a prova de
 * origem (`x-forwarded-for`/`x-request-id`): o rate limit dessas rotas é POR IP
 * (OTP 5/min!) — sem isso, todos os alunos dividiriam o balde do host do BFF.
 */
async function publicPost(path: string, body: unknown): Promise<GatewayResponse> {
  const env = getEnv()
  try {
    const res = await fetch(new URL(path, env.GATEWAY_URL), {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await clientForwardHeaders()) },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
    })
    return { status: res.status, body: await res.json().catch(() => null) }
  } catch {
    return {
      status: 503,
      body: { error: { code: 'SERVICE_UNAVAILABLE', message: 'Serviço indisponível.' } },
    }
  }
}

/**
 * GET a uma rota PÚBLICA do gateway (sem Bearer) — a validação do certificado
 * (`/validar/:id`) não tem sessão. O gateway injeta o `x-internal-token`; propaga a
 * prova de origem (rate limit por IP da rota).
 */
async function publicGet<T>(path: string): Promise<GatewayResponse<T>> {
  const env = getEnv()
  try {
    const res = await fetch(new URL(path, env.GATEWAY_URL), {
      headers: { ...(await clientForwardHeaders()) },
      cache: 'no-store',
      signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
    })
    return { status: res.status, body: await res.json().catch(() => null) }
  } catch {
    return {
      status: 503,
      body: { error: { code: 'SERVICE_UNAVAILABLE', message: 'Serviço indisponível.' } } as T,
    }
  }
}

/** Client das rotas de AUTH consumidas pelos apps de aluno (self-service + públicas). */
export function createAuthClient(gw: GatewayModule) {
  // Dedup por request (React cache): layout + página chamam getMeReadonly no MESMO
  // render → 1 só ida ao gateway (a aula re-buscava /auth/me que o layout já buscou).
  // Request-scoped — não cruza requests/usuários (seguro p/ dado de sessão).
  const getMeReadonly = cache(
    (): Promise<GatewayResponse<{ user: UserView }>> => gw.gatewayFetchReadonly('/auth/me'),
  )
  return {
    /** Usuário fresco do banco (traz `phone`, que pode não estar nas claims). */
    getMe(): Promise<GatewayResponse<{ user: UserView }>> {
      return gw.gatewayFetch('/auth/me')
    },

    /**
     * Usuário fresco SEM refresh/escrita de cookie — único seguro em Server
     * Components (layout/page). Access expirado → 401 (caller usa fallback).
     * Memoizado por request (React cache) — ver const acima.
     */
    getMeReadonly,

    updateMe(body: {
      firstName?: string
      lastName?: string
      phone?: string | null
      avatarUrl?: string | null
    }): Promise<GatewayResponse<{ user: UserView }>> {
      return gw.gatewayFetch('/auth/me', { method: 'PATCH', body })
    },

    changeMyPassword(body: {
      currentPassword: string
      newPassword: string
    }): Promise<GatewayResponse<{ ok: boolean }>> {
      return gw.gatewayFetch('/auth/me/password', { method: 'POST', body })
    },

    forgotPassword(email: string): Promise<GatewayResponse> {
      return publicPost('/auth/forgot-password', { email })
    },

    resetPassword(token: string, newPassword: string): Promise<GatewayResponse> {
      return publicPost('/auth/reset-password', { token, newPassword })
    },

    /** Pede um código OTP (login passwordless ou recuperação). Sempre 200 (anti-enum). */
    requestOtp(email: string, purpose: 'sign_in' | 'password_reset'): Promise<GatewayResponse> {
      return publicPost('/auth/otp/request', { email, purpose })
    },

    /**
     * Identidade PÚBLICA de OUTRO perfil (S2S via gateway) p/ o perfil público kids:
     * só nome + flag de visibilidade (nunca e-mail/telefone/nascimento/conta). O BFF
     * gateia pela flag. SEM refresh de cookie (Server Component).
     */
    getPublicProfileIdentity(profileId: string): Promise<GatewayResponse<PublicProfileIdentity>> {
      return gw.gatewayFetchReadonly(`/auth/internal/profiles/${enc(profileId)}/public`)
    },

    /** Redefine a senha consumindo um código OTP de recuperação. */
    resetPasswordWithOtp(
      email: string,
      code: string,
      newPassword: string,
    ): Promise<GatewayResponse> {
      return publicPost('/auth/password/reset-otp', { email, code, newPassword })
    },
  }
}

/**
 * Client das rotas do MEMBERS. `audience` é a VITRINE do app (`adult` no
 * community, `kids` no community-kids) — só afeta as LISTAGENS; detalhe/aula/
 * quiz/anexos são governados por matrícula (não filtram por audiência).
 */
export function createMembersClient(gw: GatewayModule, opts: { audience: MembersAudience }) {
  const { audience } = opts
  // Dedup por request (React cache) — chave é o BOOLEANO `withRanking` (um objeto
  // literal teria referência diferente por chamada → não deduparia). layout + home/
  // perfil pedem no mesmo render. Request-scoped (não cruza requests/usuários).
  const gamificationReadonlyCached = cache(
    (withRanking: boolean): Promise<GatewayResponse<GamificationMeView>> =>
      gw.gatewayFetchReadonly('/members/gamification/me', {
        query: { audience, ...(withRanking ? { ranking: 'true' } : {}) },
      }),
  )
  const missionsReadonlyCached = cache(
    (): Promise<GatewayResponse<MissionsMeView>> =>
      gw.gatewayFetchReadonly('/members/gamification/missions/me', { query: { audience } }),
  )
  const challengeReadonlyCached = cache(
    (): Promise<GatewayResponse<ChallengeMeView>> =>
      gw.gatewayFetchReadonly('/members/gamification/challenge', { query: { audience } }),
  )
  const leagueReadonlyCached = cache(
    (): Promise<GatewayResponse<LeagueMeView>> =>
      gw.gatewayFetchReadonly('/members/gamification/league/me', { query: { audience } }),
  )
  // Avatar do perfil ativo — dedup por request (layout busca o chrome; a página de
  // perfil também). Sem argumento → uma chave estável.
  const avatarReadonlyCached = cache(
    (): Promise<GatewayResponse<AvatarStateView>> =>
      gw.gatewayFetchReadonly('/members/avatar', { query: { audience } }),
  )
  const roomReadonlyCached = cache(
    (): Promise<GatewayResponse<RoomEditorView>> =>
      gw.gatewayFetchReadonly('/members/room', { query: { audience } }),
  )
  // Recados (conversas com o professor) — caixa de entrada + contador do sino.
  const teacherThreadsReadonlyCached = cache(
    (): Promise<
      GatewayResponse<{ threads: TeacherThreadSummaryView[]; nextOffset: number | null }>
    > => gw.gatewayFetchReadonly('/members/teacher-threads', { query: { audience } }),
  )
  const teacherThreadsUnreadReadonlyCached = cache(
    (): Promise<GatewayResponse<{ count: number }>> =>
      gw.gatewayFetchReadonly('/members/teacher-threads/unread-count', { query: { audience } }),
  )
  return {
    /** Cursos com matrícula ativa do aluno logado (vitrine do app). */
    listMyCourses(): Promise<GatewayResponse<{ courses: MyCourseView[] }>> {
      return gw.gatewayFetch('/members/courses', { query: { audience } })
    },

    /** Catálogo "Todos os cursos" (published da vitrine + flag hasAccess do aluno). */
    listCatalog(): Promise<GatewayResponse<{ courses: CatalogCourseView[] }>> {
      return gw.gatewayFetch('/members/catalog', { query: { audience } })
    },

    /**
     * "Esta conta tem acesso ao Estúdio Completo?" — Server Component (sem refresh de
     * cookie), p/ gatear a página /estudio antes de carregar o editor pesado.
     */
    checkStudioAccessReadonly(): Promise<GatewayResponse<ProductAccessView>> {
      return gw.gatewayFetchReadonly('/members/access', {
        query: { refs: STUDIO_ACCESS_REF, audience },
      })
    },
    checkStudioAccess(): Promise<GatewayResponse<ProductAccessView>> {
      return gw.gatewayFetch('/members/access', {
        query: { refs: STUDIO_ACCESS_REF, audience },
      })
    },
    /**
     * Posse do DESAFIO do mês (Clube dos Criadores + Estúdio Completo) NUMA ida —
     * Server Component. O card/checkbox do desafio só liga com as DUAS refs true
     * (o gate real do publish com a tag é o do hub).
     */
    checkChallengeAccessReadonly(): Promise<GatewayResponse<ProductAccessView>> {
      return gw.gatewayFetchReadonly('/members/access', {
        query: { refs: `${CLUB_ACCESS_REF},${STUDIO_ACCESS_REF}`, audience },
      })
    },
    /**
     * Teto de perfis (kids) da CONTA — a área dos pais usa p/ travar o "Adicionar" e
     * mostrar "X de Y". Server Component (sem refresh de cookie).
     */
    getProfileAllowanceReadonly(): Promise<GatewayResponse<{ maxProfiles: number }>> {
      return gw.gatewayFetchReadonly('/members/profile-allowance')
    },

    /** Detalhe do curso (módulos + aulas + progresso). */
    getMyCourse(slug: string): Promise<GatewayResponse<CourseDetailView>> {
      return gw.gatewayFetch(`/members/courses/${enc(slug)}`)
    },

    /** Conteúdo da aula (blocos + anexos). Busca por ID da aula (não slug). */
    getLesson(slug: string, lessonId: string): Promise<GatewayResponse<LessonDetailView>> {
      return gw.gatewayFetch(`/members/courses/${enc(slug)}/lessons/${enc(lessonId)}`)
    },

    /**
     * Resolve a localização REAL de um anexo (matrícula garantida pelo members).
     * SÓ para a rota de download — a `storageRef` nunca deve chegar ao browser.
     */
    resolveAttachment(
      slug: string,
      lessonId: string,
      attachmentId: string,
    ): Promise<GatewayResponse<AttachmentDownloadView>> {
      return gw.gatewayFetch(
        `/members/courses/${enc(slug)}/lessons/${enc(lessonId)}/attachments/${enc(attachmentId)}/resolve`,
      )
    },

    /**
     * Resolve a localização REAL do PDF do bloco e-book (matrícula garantida pelo
     * members). SÓ para a rota do livro 3D — a `storageRef` nunca chega ao browser.
     */
    resolveEbook(
      slug: string,
      lessonId: string,
      blockId: string,
    ): Promise<GatewayResponse<EbookDownloadView>> {
      return gw.gatewayFetch(
        `/members/courses/${enc(slug)}/lessons/${enc(lessonId)}/blocks/${enc(blockId)}/ebook/resolve`,
      )
    },

    /**
     * Marca a aula como concluída (idempotente no members). A resposta traz o
     * progresso + `gamification` (delta de XP/streak/badges — a UI celebra sem
     * round-trip).
     */
    markLessonComplete(lessonId: string): Promise<GatewayResponse<LessonCompleteResult>> {
      return gw.gatewayFetch(`/members/lessons/${enc(lessonId)}/complete`, { method: 'POST' })
    },

    /**
     * Perfil de gamificação do aluno NA VITRINE deste app (XP/streak/badges e
     * ranking são SEGREGADOS por audiência — kids e adult não se misturam) —
     * Route Handlers. `withRanking` inclui a colocação no ranking de XP
     * (cálculo extra — só a página de perfil pede).
     */
    getGamification(opts?: {
      withRanking?: boolean
    }): Promise<GatewayResponse<GamificationMeView>> {
      return gw.gatewayFetch('/members/gamification/me', {
        query: { audience, ...(opts?.withRanking ? { ranking: 'true' } : {}) },
      })
    },

    /**
     * Perfil de gamificação SEM refresh/escrita de cookie — o seguro em Server
     * Components (layout/home/perfil). 401 → caller esconde o widget (best-effort,
     * mesmo padrão do `getMeReadonly`).
     */
    getGamificationReadonly(opts?: {
      withRanking?: boolean
    }): Promise<GatewayResponse<GamificationMeView>> {
      return gamificationReadonlyCached(opts?.withRanking ?? false)
    },

    /** Desafio do MÊS (game jam): tema global + `entered` — Server Component. */
    getChallengeReadonly(): Promise<GatewayResponse<ChallengeMeView>> {
      return challengeReadonlyCached()
    },

    // ── Missões + proteção de sequência ──────────────────────────────────────
    /** Missões do aluno (diárias/semanais) — Server Component (sem refresh). */
    getMissionsReadonly(): Promise<GatewayResponse<MissionsMeView>> {
      return missionsReadonlyCached()
    },
    /** Missões — Route Handler (com refresh). */
    getMissions(): Promise<GatewayResponse<MissionsMeView>> {
      return gw.gatewayFetch('/members/gamification/missions/me', { query: { audience } })
    },
    /** Liga semanal do aluno (board + tier) — Server Component (sem refresh). */
    getLeagueReadonly(): Promise<GatewayResponse<LeagueMeView>> {
      return leagueReadonlyCached()
    },
    /** Resgata o prêmio de uma missão concluída (idempotente). */
    claimMission(slug: string): Promise<GatewayResponse<MissionClaimResult>> {
      return gw.gatewayFetch(`/members/gamification/missions/${enc(slug)}/claim`, {
        method: 'POST',
        query: { audience },
      })
    },
    /**
     * Registra o REMIX de um jogo do Mural ("Fazer a minha versão") — marco da missão
     * gated por estudio-completo. O members valida posse + playId no hub + não-self.
     */
    recordStudioRemix(playId: string): Promise<GatewayResponse<{ recorded: boolean }>> {
      return gw.gatewayFetch('/members/gamification/remix', {
        method: 'POST',
        query: { audience },
        body: { playId },
      })
    },
    /**
     * Registra o XP DIÁRIO de CRIAR no Estúdio ("criou hoje" → segura o foguinho de quem
     * já terminou os cursos). Sem corpo: o members exige só posse do Estúdio + deduplica
     * 1×/dia. Best-effort do cliente (dispara no autosave do editor).
     */
    recordStudioActivityDay(): Promise<GatewayResponse<{ recorded: boolean }>> {
      return gw.gatewayFetch('/members/gamification/activity', {
        method: 'POST',
        query: { audience },
      })
    },
    /** Compra 1 protetor de sequência com moedas (sem saldo → 402; máximo → 409). */
    buyStreakFreeze(): Promise<GatewayResponse<StreakFreezeResult>> {
      return gw.gatewayFetch('/members/gamification/streak-freeze/buy', {
        method: 'POST',
        query: { audience },
      })
    },
    /** Agenda/limpa as férias (pausa a sequência sem culpa). */
    setVacation(from: string | null, to: string | null): Promise<GatewayResponse<VacationResult>> {
      return gw.gatewayFetch('/members/gamification/vacation', {
        method: 'PUT',
        query: { audience },
        body: { from, to },
      })
    },

    /** Estado do avatar do perfil (equipado + catálogo + saldo) — Route Handler. */
    getAvatar(): Promise<GatewayResponse<AvatarStateView>> {
      return gw.gatewayFetch('/members/avatar', { query: { audience } })
    },

    /** Avatar SEM refresh de cookie — Server Components (loadChrome/perfil). */
    getAvatarReadonly(): Promise<GatewayResponse<AvatarStateView>> {
      return avatarReadonlyCached()
    },

    /** Compra uma peça paga do avatar com moedas (idempotente; sem saldo → 402). */
    buyAvatarPart(partId: string): Promise<GatewayResponse<AvatarPurchaseResult>> {
      return gw.gatewayFetch(`/members/avatar/parts/${enc(partId)}/buy`, {
        method: 'POST',
        query: { audience },
      })
    },

    /** Salva a config equipada do avatar (estrito no members: peça grátis OU possuída). */
    equipAvatar(config: AvatarConfigInput): Promise<GatewayResponse<AvatarEquipResult>> {
      return gw.gatewayFetch('/members/avatar', {
        method: 'PUT',
        query: { audience },
        body: config,
      })
    },

    /** Salva a URL do snapshot (foto) do avatar 3D (`PUT /members/avatar/photo`). */
    setAvatarPhoto(photoUrl: string): Promise<GatewayResponse<{ photoUrl: string }>> {
      return gw.gatewayFetch('/members/avatar/photo', {
        method: 'PUT',
        query: { audience },
        body: { photoUrl },
      })
    },

    /**
     * Dado de jogo do perfil PÚBLICO de OUTRA criança (xp/ranking/conquistas/avatar/
     * quarto). Peer-viewable; o BFF junta com a identidade do auth. SEM refresh (SC).
     */
    getPublicProfile(profileId: string): Promise<GatewayResponse<PublicProfileGameView>> {
      return gw.gatewayFetchReadonly(`/members/profiles/${enc(profileId)}/public`, {
        query: { audience },
      })
    },

    /**
     * Avatar (foto) + NÍVEL (aura) de VÁRIOS perfis numa ida — o BFF do Clube/Mural
     * pinta rosto+aura de cada autor de tópico/comentário sem N+1. Peer-viewable (como
     * o perfil público); só dado de jogo, nunca PII. Lista vazia → não chama.
     */
    listAvatarsByProfileIds(ids: string[]): Promise<GatewayResponse<AvatarsBatchView>> {
      return gw.gatewayFetch('/members/avatars', { query: { ids: ids.join(','), audience } })
    },
    /**
     * Variante SEM refresh/escrita de cookie — Server Components (a grade `/perfis`
     * do kids pinta os rostinhos com o SNAPSHOT do avatar 3D, decisão 24/07: a cara
     * da criança vem exclusivamente do avatar, nunca de foto enviada).
     */
    listAvatarsByProfileIdsReadonly(ids: string[]): Promise<GatewayResponse<AvatarsBatchView>> {
      return gw.gatewayFetchReadonly('/members/avatars', {
        query: { ids: ids.join(','), audience },
      })
    },

    // ── Quarto virtual ──────────────────────────────────────────────────────
    /** Estado do quarto (montado + catálogo + saldo) — editor/lojinha client-side. */
    getRoom(): Promise<GatewayResponse<RoomEditorView>> {
      return gw.gatewayFetch('/members/room', { query: { audience } })
    },
    /** Quarto SEM refresh de cookie — Server Components (página do quarto). */
    getRoomReadonly(): Promise<GatewayResponse<RoomEditorView>> {
      return roomReadonlyCached()
    },
    /** Salva o quarto montado (o members canonicaliza contra o inventário). */
    saveRoom(state: RoomStateView): Promise<GatewayResponse<RoomStateView>> {
      return gw.gatewayFetch('/members/room', { method: 'PUT', query: { audience }, body: state })
    },
    /** Compra um item/tema pago do quarto com moedas (idempotente; sem saldo → 402). */
    buyRoomItem(itemId: string): Promise<GatewayResponse<RoomBuyResult>> {
      return gw.gatewayFetch(`/members/room/items/${enc(itemId)}/buy`, {
        method: 'POST',
        query: { audience },
      })
    },

    // ── Pensa (planejamento guiado — metodologia ZERO) ──────────────────────
    /**
     * "Esta conta tem acesso ao Pensa?" — Server Component (sem refresh de cookie),
     * p/ gatear a página /pensa antes de carregar o app (espelha o Estúdio Completo).
     */
    checkPensaAccessReadonly(): Promise<GatewayResponse<ProductAccessView>> {
      return gw.gatewayFetchReadonly('/members/access', {
        query: { refs: PENSA_ACCESS_REF, audience },
      })
    },

    // ── Pinta (editor de assets de jogos) ───────────────────────────────────
    /**
     * "Esta conta tem acesso ao Pinta?" — Server Component (sem refresh de
     * cookie), p/ gatear a página /pinta. Pede DUAS refs numa ida: a segunda
     * (`estudio-completo`) alimenta o `studioOwned` do adapter (só muda a copy
     * do sucesso da ponte "Usar no Estúdio").
     */
    checkPintaAccessReadonly(): Promise<GatewayResponse<ProductAccessView>> {
      return gw.gatewayFetchReadonly('/members/access', {
        query: { refs: `${PINTA_ACCESS_REF},${STUDIO_ACCESS_REF}`, audience },
      })
    },
    /** Projetos ATIVOS do perfil (lista do Pensa). */
    pensaListProjects(): Promise<GatewayResponse<{ projects: PensaProjectListView[] }>> {
      return gw.gatewayFetch('/members/pensa/projects', { query: { audience } })
    },
    /** Cria projeto + ciclo 1 (Versão 1, etapa z). O members aplica o gate do produto. */
    pensaCreateProject(body: {
      name: string
    }): Promise<GatewayResponse<{ project: PensaProjectDetailView }>> {
      return gw.gatewayFetch('/members/pensa/projects', {
        method: 'POST',
        query: { audience },
        body,
      })
    },
    pensaGetProject(
      projectId: string,
    ): Promise<GatewayResponse<{ project: PensaProjectDetailView }>> {
      return gw.gatewayFetch(`/members/pensa/projects/${enc(projectId)}`, { query: { audience } })
    },
    /** Renomeia ou arquiva o plano. */
    pensaUpdateProject(
      projectId: string,
      body: {
        name?: string
        status?: PensaProjectStatus
      },
    ): Promise<GatewayResponse<{ project: PensaProjectDetailView }>> {
      return gw.gatewayFetch(`/members/pensa/projects/${enc(projectId)}`, {
        method: 'PATCH',
        query: { audience },
        body,
      })
    },
    /** Cria a Versão N+1 (exige a anterior `done`). */
    pensaCreateCycle(
      projectId: string,
      goal: string,
    ): Promise<GatewayResponse<{ project: PensaProjectDetailView }>> {
      return gw.gatewayFetch(`/members/pensa/projects/${enc(projectId)}/cycles`, {
        method: 'POST',
        query: { audience },
        body: { goal },
      })
    },
    /** Conversa + estado + latest artifacts de uma etapa do ciclo. */
    pensaGetStage(cycleId: string, stage: string): Promise<GatewayResponse<PensaStageView>> {
      return gw.gatewayFetch(`/members/pensa/cycles/${enc(cycleId)}/stages/${enc(stage)}`, {
        query: { audience },
      })
    },
    /**
     * Persiste um TURNO do chat (mensagem da criança + resposta do agente + estado).
     * Chamado pelo BFF ao fim de cada stream — nunca pelo browser direto.
     */
    pensaAppendTurn(
      cycleId: string,
      stage: string,
      body: {
        userMessage: { content: string }
        assistantMessage: { content: string }
        state?: Record<string, unknown>
        summary?: string
      },
    ): Promise<GatewayResponse<{ state: Record<string, unknown>; messageCount: number }>> {
      return gw.gatewayFetch(
        `/members/pensa/cycles/${enc(cycleId)}/stages/${enc(stage)}/conversation`,
        { method: 'PUT', query: { audience }, body },
      )
    },
    /** Salva um artefato (version = latest+1) — conteúdo já validado/sanitizado no BFF. */
    pensaSaveArtifact(
      cycleId: string,
      body: { stage: PensaStage; type: PensaArtifactType; content: unknown },
    ): Promise<GatewayResponse<{ artifact: PensaArtifactView }>> {
      return gw.gatewayFetch(`/members/pensa/cycles/${enc(cycleId)}/artifacts`, {
        method: 'POST',
        query: { audience },
        body,
      })
    },
    /** Marca o latest do type como validado (a criança aprovou). */
    pensaValidateArtifact(
      cycleId: string,
      type: PensaArtifactType,
    ): Promise<GatewayResponse<{ artifact: PensaArtifactView }>> {
      return gw.gatewayFetch(
        `/members/pensa/cycles/${enc(cycleId)}/artifacts/${enc(type)}/validate`,
        { method: 'POST', query: { audience } },
      )
    },
    /**
     * Avança a etapa (o members é o portão: 409 PENSA_GATE_NOT_READY se reprova).
     * A resposta traz o delta de `gamification` (XP/moedas/badges do Pensa — a UI
     * celebra sem round-trip; `null` = award falhou, fail-open).
     */
    pensaAdvance(
      cycleId: string,
      from: 'z' | 'e' | 'r' | 'o',
    ): Promise<
      GatewayResponse<{
        cycle: PensaProjectDetailView['currentCycle']
        gamification?: GamificationDelta | null
      }>
    > {
      return gw.gatewayFetch(`/members/pensa/cycles/${enc(cycleId)}/advance`, {
        method: 'POST',
        query: { audience },
        body: { from },
      })
    },
    /** REPLACE total do plano; dependências referenciam `key` dentro do lote. */
    pensaReplaceTasks(
      cycleId: string,
      tasks: Array<{
        key: string
        title: string
        summary?: string | null
        destination: PensaTaskDestination
        category: PensaTaskCategory
        estimatedMinutes: number
        dependencies?: string[]
        guide: PensaTaskGuide
        context: PensaTaskContext
      }>,
    ): Promise<GatewayResponse<{ tasks: PensaTaskView[] }>> {
      return gw.gatewayFetch(`/members/pensa/cycles/${enc(cycleId)}/tasks`, {
        method: 'PUT',
        query: { audience },
        body: { tasks },
      })
    },
    /** APPEND de Cartões de Criação planejados. */
    pensaAppendTasks(
      cycleId: string,
      tasks: Array<{
        key: string
        title: string
        summary?: string | null
        destination: PensaTaskDestination
        category: PensaTaskCategory
        estimatedMinutes: number
        dependencies?: string[]
        guide: PensaTaskGuide
        context: PensaTaskContext
      }>,
    ): Promise<GatewayResponse<{ tasks: PensaTaskView[] }>> {
      return gw.gatewayFetch(`/members/pensa/cycles/${enc(cycleId)}/tasks`, {
        method: 'POST',
        query: { audience },
        body: { tasks },
      })
    },
    /** Edita o plano. Tarefa iniciada/concluída gera revisão no members. */
    pensaUpdateTask(
      taskId: string,
      body: {
        position?: number
        title?: string
        summary?: string | null
        destination?: PensaTaskDestination
        category?: PensaTaskCategory
        estimatedMinutes?: number
        dependencies?: string[]
        guide?: PensaTaskGuide
        context?: PensaTaskContext
      },
    ): Promise<GatewayResponse<{ task: PensaTaskView }>> {
      return gw.gatewayFetch(`/members/pensa/tasks/${enc(taskId)}`, {
        method: 'PATCH',
        query: { audience },
        body,
      })
    },
    /** Apaga somente um cartão ainda planejável e sem dependentes. */
    pensaDeleteTask(taskId: string): Promise<GatewayResponse<{ ok: boolean }>> {
      return gw.gatewayFetch(`/members/pensa/tasks/${enc(taskId)}`, {
        method: 'DELETE',
        query: { audience },
      })
    },
    pensaGetTaskHandoff(taskId: string): Promise<GatewayResponse<PensaTaskHandoffView>> {
      return gw.gatewayFetch(`/members/pensa/tasks/${enc(taskId)}/handoff`, {
        query: { audience },
      })
    },
    pensaUpdateTaskProgress(
      taskId: string,
      body: {
        status?: PensaTaskStatus
        completedStepIds?: string[]
        completedCriteriaIds?: string[]
        outputRef?: PensaTaskOutputRef | null
      },
    ): Promise<GatewayResponse<{ task: PensaTaskView }>> {
      return gw.gatewayFetch(`/members/pensa/tasks/${enc(taskId)}/progress`, {
        method: 'PATCH',
        query: { audience },
        body,
      })
    },

    /**
     * Consome 1 crédito de IA da CONTA (quota diária + mensal, keyada no members
     * pelos headers confiáveis — irmãos da mesma conta kids dividem o teto).
     * Chamado ANTES de cada ida ao OpenRouter (Pensa chat/sínteses, describe do
     * Mural). Recusa é DOMÍNIO (200 + `allowed:false`), não erro de transporte.
     */
    aiUsageConsume(feature: string): Promise<GatewayResponse<AiUsageConsumeView>> {
      return gw.gatewayFetch('/members/ai-usage/consume', {
        method: 'POST',
        query: { audience },
        body: { feature },
      })
    },
    zappyHistory(
      projectId: string,
      before?: string,
    ): Promise<GatewayResponse<ZappyHistoryPageView>> {
      return gw.gatewayFetch('/members/zappy/history', { query: { projectId, before } })
    },
    zappyDeleteHistory(projectId: string): Promise<GatewayResponse<{ ok: boolean }>> {
      return gw.gatewayFetch('/members/zappy/history', { method: 'DELETE', query: { projectId } })
    },
    zappyReserveQuestion(body: {
      actor: { userId: string; accountId: string; privileged: boolean }
      projectId: string
      clientMessageId: string
      question: string
    }): Promise<
      GatewayResponse<{
        created: boolean
        questionId?: string
        response?: ZappyStoredResponseView
        rateLimited?: boolean
      }>
    > {
      return gw.gatewayFetchHmac('/members/internal/zappy/questions', { method: 'POST', body })
    },
    zappyCompleteQuestion(
      questionId: string,
      body: {
        actor: { userId: string; accountId: string; privileged: boolean }
        projectId: string
        latencyMs: number
        response: ZappyStoredResponseView
        outcome?: 'normal' | 'refusal' | 'needs-context' | 'quota' | 'error'
      },
    ): Promise<GatewayResponse<ZappyStoredResponseView>> {
      return gw.gatewayFetchHmac(`/members/internal/zappy/questions/${enc(questionId)}/response`, {
        method: 'PUT',
        body,
      })
    },
    zappyFeedback(body: {
      projectId: string
      responseId: string
      useful: boolean
    }): Promise<GatewayResponse<{ ok: boolean }>> {
      return gw.gatewayFetch('/members/zappy/feedback', { method: 'POST', body })
    },
    zappyKnowledgeSearch(
      query: string,
      limit = 5,
    ): Promise<GatewayResponse<{ hits: ZappyKnowledgeHitView[] }>> {
      return gw.gatewayFetch('/members/zappy/knowledge/search', {
        method: 'POST',
        body: { query, limit },
      })
    },

    /**
     * Resumo de progresso dos FILHOS da conta (área dos pais, kids). `profileIds` = os
     * perfis da conta (vindos do auth); a CONTA vem do header confiável no members (não
     * do cliente — uma sessão de perfil volta vazio). Route Handler (atrás do portão de
     * senha do responsável no app).
     */
    getChildrenStats(
      profileIds: string[],
    ): Promise<GatewayResponse<{ children: ChildStatsView[] }>> {
      return gw.gatewayFetch('/members/parents/children-stats', {
        query: { audience, profileIds: profileIds.join(',') },
      })
    },

    /** Preferência do report SEMANAL dos pais (opt-out) — atrás do portão de senha. */
    getParentReportPrefs(): Promise<GatewayResponse<ParentReportPrefsView>> {
      return gw.gatewayFetch('/members/parents/report-prefs')
    },
    setParentReportPrefs(disabled: boolean): Promise<GatewayResponse<ParentReportPrefsView>> {
      return gw.gatewayFetch('/members/parents/report-prefs', {
        method: 'PUT',
        body: { disabled },
      })
    },

    /** Salva a posição de reprodução do vídeo (throttled no client). */
    saveVideoPosition(
      slug: string,
      lessonId: string,
      positionSeconds: number,
    ): Promise<GatewayResponse<unknown>> {
      return gw.gatewayFetch(`/members/courses/${enc(slug)}/lessons/${enc(lessonId)}/position`, {
        method: 'PUT',
        body: { positionSeconds },
      })
    },

    /**
     * Salva a classificação do curso (upsert; 1 por aluno+curso). Cada passo do
     * fluxo de modais manda o estado ACUMULADO (a nota está sempre presente).
     */
    saveCourseRating(
      slug: string,
      body: {
        rating: number
        comment?: string | null
        feedbackAnswers?: CourseFeedbackAnswers | null
      },
    ): Promise<GatewayResponse<CourseRatingView>> {
      return gw.gatewayFetch(`/members/courses/${enc(slug)}/rating`, { method: 'PUT', body })
    },

    /** Submete o quiz (score no servidor; correções/gabarito só na resposta). */
    submitQuizAttempt(
      lessonId: string,
      blockId: string,
      answers: Record<string, string[]>,
    ): Promise<GatewayResponse<QuizAttemptResultView>> {
      return gw.gatewayFetch(
        `/members/lessons/${enc(lessonId)}/blocks/${enc(blockId)}/quiz-attempts`,
        { method: 'POST', body: { answers } },
      )
    },

    /** Entrega o projeto do Estúdio + resultados reportados pelo cliente (correção híbrida). */
    submitStudioProject(
      lessonId: string,
      blockId: string,
      project: unknown,
      results?: unknown,
      message?: string,
    ): Promise<GatewayResponse<StudioSubmissionResultView>> {
      return gw.gatewayFetch(
        `/members/lessons/${enc(lessonId)}/blocks/${enc(blockId)}/studio-submission`,
        {
          method: 'POST',
          body: {
            project,
            ...(results === undefined ? {} : { results }),
            ...(message ? { message } : {}),
          },
        },
      )
    },

    /**
     * Projeto da aula contínua anterior (mesma cadeia) p/ semear o editor. `null`
     * quando é a 1ª da cadeia, o aluno não enviou ainda, ou o bloco é independente.
     */
    getStudioCarryover(
      lessonId: string,
      blockId: string,
    ): Promise<GatewayResponse<{ project: unknown | null }>> {
      return gw.gatewayFetch(
        `/members/lessons/${enc(lessonId)}/blocks/${enc(blockId)}/studio-carryover`,
        { method: 'GET' },
      )
    },

    /** Projeto que o aluno ENVIOU NESTE bloco (save na nuvem). `null` se nunca enviou. */
    getOwnStudioSubmission(
      lessonId: string,
      blockId: string,
    ): Promise<GatewayResponse<{ project: unknown | null }>> {
      return gw.gatewayFetch(
        `/members/lessons/${enc(lessonId)}/blocks/${enc(blockId)}/studio-submission`,
        { method: 'GET' },
      )
    },

    // ── Recados (conversas com o professor — canal de retorno) ────────────────
    /** Caixa de entrada do aluno (Route Handler). */
    listTeacherThreads(
      params: { limit?: number; offset?: number } = {},
    ): Promise<
      GatewayResponse<{ threads: TeacherThreadSummaryView[]; nextOffset: number | null }>
    > {
      return gw.gatewayFetch('/members/teacher-threads', { query: { audience, ...params } })
    },
    /** Caixa de entrada do aluno (Server Component). */
    listTeacherThreadsReadonly(): Promise<
      GatewayResponse<{ threads: TeacherThreadSummaryView[]; nextOffset: number | null }>
    > {
      return teacherThreadsReadonlyCached()
    },
    /** Contador de conversas não-lidas (badge do sino) — Route Handler. */
    getTeacherThreadsUnread(): Promise<GatewayResponse<{ count: number }>> {
      return gw.gatewayFetch('/members/teacher-threads/unread-count', { query: { audience } })
    },
    /** Contador de não-lidas (Server Component). */
    getTeacherThreadsUnreadReadonly(): Promise<GatewayResponse<{ count: number }>> {
      return teacherThreadsUnreadReadonlyCached()
    },
    /** Uma conversa (cabeçalho + turnos). */
    getTeacherThread(
      threadId: string,
      before?: string,
    ): Promise<GatewayResponse<TeacherThreadView>> {
      return gw.gatewayFetch(`/members/teacher-threads/${enc(threadId)}`, {
        query: { audience, before },
      })
    },
    /** Aluno responde a uma conversa sua (devolve a conversa atualizada). */
    postTeacherMessage(
      threadId: string,
      body: string,
    ): Promise<GatewayResponse<TeacherThreadView>> {
      return gw.gatewayFetch(`/members/teacher-threads/${enc(threadId)}/messages`, {
        method: 'POST',
        query: { audience },
        body: { body },
      })
    },
    /** Marca a conversa como lida (zera o não-lido do aluno). */
    markTeacherThreadRead(threadId: string): Promise<GatewayResponse<{ ok: true }>> {
      return gw.gatewayFetch(`/members/teacher-threads/${enc(threadId)}/read`, {
        method: 'POST',
        query: { audience },
      })
    },

    /**
     * Payload AUTORITATIVO da vitrine (Mural): título/resumo do admin + capa padrão +
     * elegibilidade (a criança enviou a entrega). O BFF usa no clique "Publicar no
     * Mural" — o conteúdo NÃO vem do cliente.
     */
    getShowcasePayload(
      lessonId: string,
      blockId: string,
    ): Promise<GatewayResponse<ShowcasePayloadView>> {
      return gw.gatewayFetch(
        `/members/lessons/${enc(lessonId)}/blocks/${enc(blockId)}/showcase-payload`,
        { method: 'GET' },
      )
    },

    // ── Certificado de conclusão ─────────────────────────────────────────────
    /** Estado do bloco certificado (elegível p/ emitir? já emitido?). */
    getCertificateState(
      lessonId: string,
      blockId: string,
    ): Promise<GatewayResponse<CertificateStateView>> {
      return gw.gatewayFetch(
        `/members/lessons/${enc(lessonId)}/blocks/${enc(blockId)}/certificate`,
        { method: 'GET' },
      )
    },

    /**
     * Emite o certificado (idempotente por aluno+curso). Devolve o registro imutável +
     * a config do bloco (o BFF monta o PDF). 409 se ainda não concluiu todas as aulas.
     */
    issueCertificate(
      lessonId: string,
      blockId: string,
    ): Promise<GatewayResponse<CertificateIssueView>> {
      return gw.gatewayFetch(
        `/members/lessons/${enc(lessonId)}/blocks/${enc(blockId)}/certificate`,
        { method: 'POST' },
      )
    },

    /**
     * Validação PÚBLICA do certificado pelo id (lido do QR). Sem sessão (a página
     * `/validar/:id` é anônima) — chama a rota `public` do gateway, que injeta o token interno.
     */
    validateCertificate(id: string): Promise<GatewayResponse<CertificateValidationView>> {
      return publicGet<CertificateValidationView>(
        `/members/internal/certificates/${enc(id)}/validate`,
      )
    },
  }
}

/**
 * Client da COMUNIDADE (fórum — @sistemazero/hub). `audience` é a vitrine do app
 * (só afeta a listagem de servidores). O hub gateia por matrícula/cargo no servidor.
 */
export function createHubClient(gw: GatewayModule, opts: { audience: MembersAudience }) {
  const { audience } = opts
  return {
    listSpaces(): Promise<GatewayResponse<{ items: HubSpaceView[] }>> {
      return gw.gatewayFetch('/hub/spaces', { query: { audience } })
    },
    getSpace(slug: string): Promise<GatewayResponse<HubSpaceView>> {
      return gw.gatewayFetch(`/hub/spaces/${enc(slug)}`)
    },
    listChannels(slug: string): Promise<GatewayResponse<{ items: HubChannelView[] }>> {
      return gw.gatewayFetch(`/hub/spaces/${enc(slug)}/channels`)
    },
    listThreads(
      channelId: string,
      params: { cursor?: string; limit?: number; challenge?: string } = {},
    ): Promise<GatewayResponse<HubPage<HubThreadView>>> {
      return gw.gatewayFetch(`/hub/channels/${enc(channelId)}/threads`, {
        // `challenge` = prateleira do Desafio do mês (`m:YYYY-MM`) — só posts com a tag.
        query: { cursor: params.cursor, limit: params.limit, challenge: params.challenge },
      })
    },
    createThread(
      channelId: string,
      body: {
        title: string
        body: string
        /** Referência opcional a um jogo do Mural ("Mostrar meu jogo no Clube"). */
        playId?: string | null
        attachmentIds?: string[]
      },
    ): Promise<GatewayResponse<HubThreadView>> {
      return gw.gatewayFetch(`/hub/channels/${enc(channelId)}/threads`, { method: 'POST', body })
    },
    /** Tópicos do PRÓPRIO aluno (sino "novas respostas") — só os dele, sem redação. */
    listMyThreads(): Promise<GatewayResponse<{ items: HubMyThreadView[] }>> {
      return gw.gatewayFetch('/hub/my-threads')
    },
    getThread(id: string): Promise<GatewayResponse<HubThreadView>> {
      return gw.gatewayFetch(`/hub/threads/${enc(id)}`)
    },
    editThread(id: string, body: string, version: number): Promise<GatewayResponse<HubThreadView>> {
      return gw.gatewayFetch(`/hub/threads/${enc(id)}`, {
        method: 'PATCH',
        body: { body, version },
      })
    },
    listComments(
      threadId: string,
      params: { after?: string; limit?: number } = {},
    ): Promise<GatewayResponse<HubPage<HubCommentView>>> {
      return gw.gatewayFetch(`/hub/threads/${enc(threadId)}/comments`, {
        query: { after: params.after, limit: params.limit },
      })
    },
    createComment(
      threadId: string,
      body: { body: string; replyToId?: string | null; attachmentIds?: string[] },
    ): Promise<GatewayResponse<HubCommentView>> {
      return gw.gatewayFetch(`/hub/threads/${enc(threadId)}/comments`, { method: 'POST', body })
    },
    editComment(
      id: string,
      body: string,
      version: number,
    ): Promise<GatewayResponse<HubCommentView>> {
      return gw.gatewayFetch(`/hub/comments/${enc(id)}`, {
        method: 'PATCH',
        body: { body, version },
      })
    },
    react(
      target: 'thread' | 'comment',
      id: string,
      emoji: string,
    ): Promise<GatewayResponse<{ ok: true }>> {
      return gw.gatewayFetch(
        `/hub/${target === 'thread' ? 'threads' : 'comments'}/${enc(id)}/reactions`,
        {
          method: 'POST',
          body: { emoji },
        },
      )
    },
    unreact(
      target: 'thread' | 'comment',
      id: string,
      emoji: string,
    ): Promise<GatewayResponse<{ ok: true }>> {
      return gw.gatewayFetch(
        `/hub/${target === 'thread' ? 'threads' : 'comments'}/${enc(id)}/reactions/${enc(emoji)}`,
        { method: 'DELETE' },
      )
    },
    markSeen(channelId: string): Promise<GatewayResponse<{ ok: true }>> {
      return gw.gatewayFetch(`/hub/channels/${enc(channelId)}/seen`, { method: 'POST', body: {} })
    },
    /** Registra o metadado do anexo (o BFF já gerou a key + assinou o PUT). */
    registerAttachment(body: {
      kind: HubAttachmentKind
      mime: string
      sizeBytes: number
      originalName: string
      storageRef: string
    }): Promise<GatewayResponse<{ id: string }>> {
      return gw.gatewayFetch('/hub/attachments', { method: 'POST', body })
    },
    /** Autoriza e resolve a `storageRef` de um anexo (consumido só pela rota de serve). */
    resolveAttachment(id: string): Promise<GatewayResponse<HubResolvedAttachment>> {
      return gw.gatewayFetch(`/hub/attachments/${enc(id)}/resolve`)
    },
    /**
     * Auto-publica um projeto no Mural (em nome da criança). O hub trata como criação
     * de sistema (bypass staff_only, idempotente pela `idempotencyKey`). Conteúdo já
     * é autoritativo (vem do members + sessão), não do cliente.
     */
    createShowcaseThread(body: {
      spaceSlug: string
      // O hub resolve título/resumo/nome-do-autor/idempotência (members S2S + header
      // de perfil do gateway) — o corpo só diz QUAL projeto e a capa capturada.
      lessonId: string
      blockId: string
      coverImageUrl: string | null
    }): Promise<GatewayResponse<{ thread: HubThreadView; deduped: boolean }>> {
      return gw.gatewayFetch('/hub/internal/showcase-thread', { method: 'POST', body })
    },
    /**
     * Variação KID-DRIVEN ("Compartilhar" do Estúdio): a `description` é escrita pela
     * criança e o projeto ganha um `playId` (link público de jogar). Título/elegibilidade
     * continuam autoritativos do members; `clientIdempotencyKey` dedup-a duplo-clique.
     */
    createShowcaseThreadStudio(body: {
      spaceSlug: string
      lessonId: string
      blockId: string
      coverImageUrl: string | null
      description: string
      playId: string
      clientIdempotencyKey: string
      /** Metadado do projeto ({pro, extensions[]}) — selo de nível do remix no card (cosmético). */
      studioMeta?: { pro: boolean; extensions: string[] } | null
    }): Promise<GatewayResponse<{ thread: HubThreadView; deduped: boolean }>> {
      return gw.gatewayFetch('/hub/internal/showcase-thread-studio', { method: 'POST', body })
    },
    /**
     * Variação do ESTÚDIO COMPLETO (produto vendável, SEM aula): `title` e `description`
     * vêm da criança (não há payload autoritativo do members). O hub re-valida a POSSE
     * do produto (S2S members) e tira o autor do header de perfil; `clientIdempotencyKey`
     * dedup-a duplo-clique (republicar = post novo).
     */
    createShowcaseThreadStudioStandalone(body: {
      spaceSlug: string
      title: string
      description: string
      coverImageUrl: string | null
      playId: string
      clientIdempotencyKey: string
      /** Tag do Desafio do mês — o hub valida (posse + mês) com drop silencioso. */
      challengeKey?: string | null
      /** Metadado do projeto ({pro, extensions[]}) — selo de nível do remix no card (cosmético). */
      studioMeta?: { pro: boolean; extensions: string[] } | null
    }): Promise<GatewayResponse<{ thread: HubThreadView; deduped: boolean }>> {
      return gw.gatewayFetch('/hub/internal/showcase-thread-studio-standalone', {
        method: 'POST',
        body,
      })
    },
    /**
     * Valida se o playId público ainda pertence a um post visível no Mural.
     * `countHit` funde o incremento de jogadas na MESMA ida (o chamador já
     * deduplicou por ip:playId — ver `routes/studio.ts`).
     */
    resolveStudioPlay(
      playId: string,
      countHit = false,
    ): Promise<GatewayResponse<{ visible: boolean; authorDisplayName?: string | null }>> {
      return gw.gatewayFetch(
        `/hub/internal/studio-play/${enc(playId)}${countHit ? '?count=1' : ''}`,
      )
    },
    /** Carreira (RSC, sem refresh): jogos publicados no Mural + soma das jogadas. */
    myShowcaseStatsReadonly(): Promise<GatewayResponse<{ published: number; plays: number }>> {
      return gw.gatewayFetchReadonly('/hub/my-showcase-stats')
    },
    report(
      target: 'thread' | 'comment',
      id: string,
      reason: string,
    ): Promise<GatewayResponse<{ ok: true }>> {
      return gw.gatewayFetch(
        `/hub/${target === 'thread' ? 'threads' : 'comments'}/${enc(id)}/report`,
        {
          method: 'POST',
          body: { reason },
        },
      )
    },
  }
}

/** Client das rotas do PAYMENTS ("minhas compras"). */
export function createPaymentsClient(gw: GatewayModule) {
  return {
    /** "Minhas compras": o gateway injeta o e-mail das claims; o payments filtra por ele. */
    listMyPayments(params: {
      limit?: number
      offset?: number
    }): Promise<GatewayResponse<Paginated<PaymentView>>> {
      return gw.gatewayFetch('/payments/my', {
        query: { limit: params.limit, offset: params.offset },
      })
    },

    getMyPayment(id: string): Promise<GatewayResponse<PaymentView>> {
      return gw.gatewayFetch(`/payments/my/${enc(id)}`)
    },

    /** "Minhas assinaturas" (mesmo escopo por e-mail das claims). */
    listMySubscriptions(): Promise<GatewayResponse<{ items: MySubscriptionView[] }>> {
      return gw.gatewayFetch('/payments/my/subscriptions')
    },

    /**
     * Cancela a PRÓPRIA assinatura (anti-IDOR no payments). O acesso segue até
     * o fim do ciclo pago + carência — o members expira sozinho.
     */
    cancelMySubscription(id: string): Promise<GatewayResponse<MySubscriptionView>> {
      return gw.gatewayFetch(`/payments/my/subscriptions/${enc(id)}`, { method: 'DELETE' })
    },
  }
}
