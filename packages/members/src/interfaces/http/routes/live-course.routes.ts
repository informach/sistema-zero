import { Elysia, t } from 'elysia'
import type { LiveTeacherNotesService } from '../../../application/live-course/teacher-notes.service'
import { assertInternalCaller, isPrivilegedActor, requireAdmin, resolveUserId } from '../auth'

export interface LiveCourseRoutesDeps {
  teacherNotes: LiveTeacherNotesService
  internalToken?: string
  requireAdminEnabled: boolean
}

const ADMIN_ROLES = new Set(['superadmin', 'admin'])

/**
 * Rotas dos CURSOS AO VIVO que não são da sala (14/10/2026). Ficam fora do `live.routes.ts` de
 * propósito: aquele arquivo é das turmas e dos encontros; este é do conteúdo do curso.
 *
 * - `GET /members/admin/live/lessons/:lessonId/teacher-notes` → `{ notes: { [sectionId]: texto } }`,
 *   as anotações da professora da versão PUBLICADA da aula. Administração, ou a professora
 *   atribuída a uma turma do curso. O RBAC de borda é o do gateway (leitura staff+); no Admin
 *   ela passa pelo BFF `/api/admin/live/[...path]`.
 */
export function liveCourseRoutes(deps: LiveCourseRoutesDeps) {
  return new Elysia({ prefix: '/members/admin/live/lessons' })
    .onTransform(({ headers, set }) => {
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      set.headers['cache-control'] = 'private, no-store'
    })
    .onBeforeHandle(({ headers }) => requireAdmin(headers, deps.requireAdminEnabled))
    .get(
      '/:lessonId/teacher-notes',
      ({ headers, params }) =>
        deps.teacherNotes.read(
          {
            id: resolveUserId(headers),
            staff: isPrivilegedActor(headers),
            admin: isPrivilegedActor(headers) && ADMIN_ROLES.has(headers['x-auth-user-role'] ?? ''),
          },
          params.lessonId,
        ),
      { params: t.Object({ lessonId: t.String({ format: 'uuid' }) }) },
    )
}
