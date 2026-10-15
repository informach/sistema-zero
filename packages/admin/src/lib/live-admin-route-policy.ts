/**
 * A lista EXPLÍCITA do que o BFF `/api/admin/live/[...path]` repassa ao members
 * (`/members/admin/live/...`). O navegador nunca escolhe o caminho de cima: o que não está aqui
 * é 404 no próprio painel.
 *
 * Cursos ao vivo (14/10/2026): a turma nasce de um CURSO ao vivo (`courses/:id/cohorts`), as
 * anotações da professora vêm da aula publicada (`lessons/:id/teacher-notes`) e o catálogo é
 * filtrado pela plataforma (`catalog?audience=`). As rotas do roteiro antigo (`programs*`,
 * `templates`) saíram.
 *
 * ⚠️ A gravação no Vimeo (`occurrences/:id/recording/source|vimeo`) NÃO passa por aqui: quem
 * fala com essas duas é a rota dedicada `occurrences/[id]/recording/vimeo`, no servidor, com
 * sessão estrita. Repassar a `source` ao navegador entregaria a chave do arquivo, e um `PUT
 * vimeo` aberto deixaria qualquer aba gravar um vídeo qualquer na turma.
 */
const UUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'
const SESSION = `sessions/${UUID}`

export type AdminLiveMethod = 'GET' | 'POST' | 'PATCH'

const PATTERNS: Record<AdminLiveMethod, readonly string[]> = {
  GET: [
    'catalog',
    `cohorts/${UUID}/enrollments`,
    // Anotações da professora da aula PUBLICADA (equipe, ou professora da turma do curso).
    `lessons/${UUID}/teacher-notes`,
  ],
  POST: [
    // Turma nova de um curso ao vivo: corpo `LiveCreateCohort` sem `courseId`.
    `courses/${UUID}/cohorts`,
    `cohorts/${UUID}/enrollments`,
    `enrollments/${UUID}/(?:revoke|assign)`,
    `${SESSION}/recording/(?:publish|pause|resume|stop)`,
    `${SESSION}/occurrences`,
    `workspaces/${UUID}/(?:assistance|cancel-assistance|attach|return|cursor)`,
  ],
  PATCH: [`cohorts/${UUID}`],
}

/** Parâmetros de busca que cada caminho aceita, já validados. Os demais caem. */
function queryFor(path: string, search: URLSearchParams): Record<string, string> {
  if (path !== 'catalog') return {}
  const query: Record<string, string> = {}
  const cursor = search.get('cursor')
  if (cursor && new RegExp(`^${UUID}$`).test(cursor)) query.cursor = cursor
  const limit = search.get('limit')
  if (limit && /^(?:[1-9]|[1-4][0-9]|50)$/.test(limit)) query.limit = limit
  // A plataforma do seletor do painel: só os dois valores do contrato.
  const audience = search.get('audience')
  if (audience === 'adult' || audience === 'kids') query.audience = audience
  return query
}

export function adminLiveUpstream(
  method: string,
  segments: readonly string[],
  search: URLSearchParams,
): { path: string; query: Record<string, string> } | null {
  if (!segments.length || segments.some((part) => !/^[a-zA-Z0-9-]+$/.test(part))) return null
  const patterns = PATTERNS[method as AdminLiveMethod]
  if (!patterns) return null
  const path = segments.join('/')
  if (!patterns.some((pattern) => new RegExp(`^${pattern}$`).test(path))) return null
  return { path: `/members/admin/live/${path}`, query: queryFor(path, search) }
}

/** Teto do corpo: nenhuma rota daqui leva projeto ou arquivo. */
export const ADMIN_LIVE_BODY_LIMIT = 256_000
