import 'server-only'
import type { CourseDetailView, LessonDetailView, MyCourseView } from '@/lib/types'
import { type GatewayResponse, gatewayFetch } from './gateway'

const enc = encodeURIComponent

/** Cursos com matrícula ativa do aluno logado. */
export function listMyCourses(): Promise<GatewayResponse<{ courses: MyCourseView[] }>> {
  return gatewayFetch('/members/courses')
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

/** Marca a aula como concluída (idempotente no members). */
export function markLessonComplete(lessonId: string): Promise<GatewayResponse<unknown>> {
  return gatewayFetch(`/members/lessons/${enc(lessonId)}/complete`, { method: 'POST' })
}
