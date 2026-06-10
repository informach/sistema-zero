import 'server-only'
import { getEnv } from '../lib/env'
import type {
  AttachmentDownloadView,
  CatalogCourseView,
  CourseDetailView,
  CourseFeedbackAnswers,
  CourseRatingView,
  EbookDownloadView,
  LessonDetailView,
  MyCourseView,
  Paginated,
  PaymentView,
  UserView,
} from '../lib/types'
import { clientForwardHeaders, type GatewayModule, type GatewayResponse } from './gateway'

const enc = encodeURIComponent

// Rotas públicas de auth são rápidas por contrato — gateway pendurado não pode
// segurar a request do aluno.
const AUTH_TIMEOUT_MS = 15_000

/** Audiência da vitrine no members: `adult` (community) | `kids` (community-kids). */
export type MembersAudience = 'adult' | 'kids'

export type AuthClient = ReturnType<typeof createAuthClient>
export type MembersClient = ReturnType<typeof createMembersClient>
export type PaymentsClient = ReturnType<typeof createPaymentsClient>

/**
 * Rotas PÚBLICAS (sem Bearer) — chamadas diretas ao gateway. Propaga a prova de
 * origem (`x-forwarded-for`/`x-request-id`): o rate limit dessas rotas é POR IP
 * (OTP 5/min!) — sem isso, todos os alunos dividiriam o balde do host do BFF.
 */
async function publicPost(path: string, body: unknown): Promise<GatewayResponse> {
  const env = getEnv()
  const res = await fetch(new URL(path, env.GATEWAY_URL), {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(await clientForwardHeaders()) },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
  })
  return { status: res.status, body: await res.json().catch(() => null) }
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

    /** Marca a aula como concluída (idempotente no members). */
    markLessonComplete(lessonId: string): Promise<GatewayResponse<unknown>> {
      return gw.gatewayFetch(`/members/lessons/${enc(lessonId)}/complete`, { method: 'POST' })
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
    ): Promise<GatewayResponse<unknown>> {
      return gw.gatewayFetch(
        `/members/lessons/${enc(lessonId)}/blocks/${enc(blockId)}/quiz-attempts`,
        { method: 'POST', body: { answers } },
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
