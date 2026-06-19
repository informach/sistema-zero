import 'server-only'
import { getEnv } from '../lib/env'
import type {
  AttachmentDownloadView,
  CatalogCourseView,
  ChildStatsView,
  CourseDetailView,
  CourseFeedbackAnswers,
  CourseRatingView,
  EbookDownloadView,
  GamificationMeView,
  HubAttachmentKind,
  HubChannelView,
  HubCommentView,
  HubPage,
  HubResolvedAttachment,
  HubSpaceView,
  HubThreadView,
  LessonCompleteResult,
  LessonDetailView,
  MyCourseView,
  Paginated,
  PaymentView,
  ProfileView,
  QuizAttemptResultView,
  ShowcasePayloadView,
  StudioSubmissionResultView,
  UserView,
} from '../lib/types'
import { clientForwardHeaders, type GatewayModule, type GatewayResponse } from './gateway'
import type { AuthTokens } from './session'

const enc = encodeURIComponent

// Rotas públicas de auth são rápidas por contrato — gateway pendurado não pode
// segurar a request do aluno.
const AUTH_TIMEOUT_MS = 15_000

/** Audiência da vitrine no members: `adult` (community) | `kids` (community-kids). */
export type MembersAudience = 'adult' | 'kids'

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

/** Client das rotas de AUTH consumidas pelos apps de aluno (self-service + públicas). */
export function createAuthClient(gw: GatewayModule) {
  return {
    /** Usuário fresco do banco (traz `phone`, que pode não estar nas claims). */
    getMe(): Promise<GatewayResponse<{ user: UserView }>> {
      return gw.gatewayFetch('/auth/me')
    },

    /**
     * Usuário fresco SEM refresh/escrita de cookie — único seguro em Server
     * Components (layout/page). Access expirado → 401 (caller usa fallback).
     */
    getMeReadonly(): Promise<GatewayResponse<{ user: UserView }>> {
      return gw.gatewayFetchReadonly('/auth/me')
    },

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
  return {
    /** Cursos com matrícula ativa do aluno logado (vitrine do app). */
    listMyCourses(): Promise<GatewayResponse<{ courses: MyCourseView[] }>> {
      return gw.gatewayFetch('/members/courses', { query: { audience } })
    },

    /** Catálogo "Todos os cursos" (published da vitrine + flag hasAccess do aluno). */
    listCatalog(): Promise<GatewayResponse<{ courses: CatalogCourseView[] }>> {
      return gw.gatewayFetch('/members/catalog', { query: { audience } })
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
      return gw.gatewayFetchReadonly('/members/gamification/me', {
        query: { audience, ...(opts?.withRanking ? { ranking: 'true' } : {}) },
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
    ): Promise<GatewayResponse<StudioSubmissionResultView>> {
      return gw.gatewayFetch(
        `/members/lessons/${enc(lessonId)}/blocks/${enc(blockId)}/studio-submission`,
        { method: 'POST', body: results === undefined ? { project } : { project, results } },
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
      params: { cursor?: string; limit?: number } = {},
    ): Promise<GatewayResponse<HubPage<HubThreadView>>> {
      return gw.gatewayFetch(`/hub/channels/${enc(channelId)}/threads`, {
        query: { cursor: params.cursor, limit: params.limit },
      })
    },
    createThread(
      channelId: string,
      body: { title: string; body: string; attachmentIds?: string[] },
    ): Promise<GatewayResponse<HubThreadView>> {
      return gw.gatewayFetch(`/hub/channels/${enc(channelId)}/threads`, { method: 'POST', body })
    },
    getThread(id: string): Promise<GatewayResponse<HubThreadView>> {
      return gw.gatewayFetch(`/hub/threads/${enc(id)}`)
    },
    editThread(id: string, body: string): Promise<GatewayResponse<HubThreadView>> {
      return gw.gatewayFetch(`/hub/threads/${enc(id)}`, { method: 'PATCH', body: { body } })
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
    editComment(id: string, body: string): Promise<GatewayResponse<HubCommentView>> {
      return gw.gatewayFetch(`/hub/comments/${enc(id)}`, { method: 'PATCH', body: { body } })
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
  }
}
