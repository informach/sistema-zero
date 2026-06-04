import 'server-only'
import type {
  AttachmentDownloadView,
  CatalogCourseView,
  CourseDetailView,
  CourseFeedbackAnswers,
  CourseRatingView,
  LessonDetailView,
  MyCourseView,
} from '@/lib/types'
import { type GatewayResponse, gatewayFetch } from './gateway'

const enc = encodeURIComponent

/** Cursos com matrícula ativa do aluno logado. */
export function listMyCourses(): Promise<GatewayResponse<{ courses: MyCourseView[] }>> {
  return gatewayFetch('/members/courses')
}

/** Catálogo "Todos os cursos" (published + flag hasAccess do aluno). */
export function listCatalog(): Promise<GatewayResponse<{ courses: CatalogCourseView[] }>> {
  return gatewayFetch('/members/catalog')
}

/** Detalhe do curso (módulos + aulas + progresso). */
export function getMyCourse(slug: string): Promise<GatewayResponse<CourseDetailView>> {
  return gatewayFetch(`/members/courses/${enc(slug)}`)
}

/** Conteúdo da aula (blocos + anexos). Busca por ID da aula (não slug). */
export function getLesson(
  slug: string,
  lessonId: string,
): Promise<GatewayResponse<LessonDetailView>> {
  return gatewayFetch(`/members/courses/${enc(slug)}/lessons/${enc(lessonId)}`)
}

/**
 * Resolve a localização REAL de um anexo (matrícula garantida pelo members).
 * SÓ para a rota de download — a `storageRef` nunca deve chegar ao browser.
 */
export function resolveAttachment(
  slug: string,
  lessonId: string,
  attachmentId: string,
): Promise<GatewayResponse<AttachmentDownloadView>> {
  return gatewayFetch(
    `/members/courses/${enc(slug)}/lessons/${enc(lessonId)}/attachments/${enc(attachmentId)}/resolve`,
  )
}

/** Marca a aula como concluída (idempotente no members). */
export function markLessonComplete(lessonId: string): Promise<GatewayResponse<unknown>> {
  return gatewayFetch(`/members/lessons/${enc(lessonId)}/complete`, { method: 'POST' })
}

/** Salva a posição de reprodução do vídeo (throttled no client). */
export function saveVideoPosition(
  slug: string,
  lessonId: string,
  positionSeconds: number,
): Promise<GatewayResponse<unknown>> {
  return gatewayFetch(`/members/courses/${enc(slug)}/lessons/${enc(lessonId)}/position`, {
    method: 'PUT',
    body: { positionSeconds },
  })
}

/**
 * Salva a classificação do curso (upsert; 1 por aluno+curso). Cada passo do
 * fluxo de modais manda o estado ACUMULADO (a nota está sempre presente).
 */
export function saveCourseRating(
  slug: string,
  body: {
    rating: number
    comment?: string | null
    feedbackAnswers?: CourseFeedbackAnswers | null
  },
): Promise<GatewayResponse<CourseRatingView>> {
  return gatewayFetch(`/members/courses/${enc(slug)}/rating`, { method: 'PUT', body })
}

/** Submete o quiz (score no servidor; correções/gabarito só na resposta). */
export function submitQuizAttempt(
  lessonId: string,
  blockId: string,
  answers: Record<string, string[]>,
): Promise<GatewayResponse<unknown>> {
  return gatewayFetch(`/members/lessons/${enc(lessonId)}/blocks/${enc(blockId)}/quiz-attempts`, {
    method: 'POST',
    body: { answers },
  })
}
