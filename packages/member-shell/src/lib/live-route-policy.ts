/** An explicit BFF allowlist: neither a browser-selected upstream nor a generic SFU proxy. */
export type LiveRouteScope = 'learner' | 'parent' | 'admin' | 'teacher'

const UUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'
const session = `sessions/${UUID}`
const media = `occurrences/${UUID}/media`

export function liveUpstreamPath(
  scope: LiveRouteScope,
  method: string,
  segments: string[],
): string | null {
  if (!segments.length || segments.some((part) => !/^[a-zA-Z0-9-]+$/.test(part))) return null
  const path = segments.join('/')
  // A aula do encontro (cursos ao vivo, 14/10/2026): a sala monta o player pela rota de aula de
  // SEMPRE (`/members/courses/:slug/lessons/:id`), em que o members confere a vaga na turma. Só
  // leitura, só para quem está na sala da criança; a professora lê a versão publicada no Admin.
  if (
    scope === 'learner' &&
    method === 'GET' &&
    new RegExp(`^courses/[a-z0-9-]{1,120}/lessons/${UUID}$`).test(path)
  )
    return `/members/${path}`
  if (scope === 'parent')
    return (method === 'GET' && path === 'enrollments') ||
      (method === 'POST' && new RegExp(`^enrollments/${UUID}/assign$`).test(path))
      ? `/members/parents/live/${path}`
      : null
  if (scope === 'admin') {
    const patterns: Record<string, string[]> = {
      GET: [
        'catalog',
        'templates',
        `cohorts/${UUID}/enrollments`,
        // As anotações da professora por parte (da versão PUBLICADA da aula; nunca à criança).
        `lessons/${UUID}/teacher-notes`,
      ],
      POST: [
        'programs',
        'templates',
        `programs/${UUID}/cohorts`,
        `cohorts/${UUID}/enrollments`,
        `enrollments/${UUID}/(?:revoke|assign)`,
        `${session}/recording/(?:publish|pause|resume|stop)`,
        `${session}/occurrences`,
        `workspaces/${UUID}/(?:assistance|cancel-assistance|attach|return|cursor)`,
      ],
      PATCH: [`programs/${UUID}`, `cohorts/${UUID}`],
    }
    return patterns[method]?.some((pattern) => new RegExp(`^${pattern}$`).test(path))
      ? `/members/admin/live/${path}`
      : null
  }
  const patterns: Record<string, string[]> = {
    GET: [
      'catalog',
      'workspaces',
      session,
      `${media}/publications`,
      `${session}/materials/${UUID}/download`,
      `${session}/recording`,
      `${session}/replay-progress`,
      `workspaces/${UUID}`,
    ],
    POST: [
      `${session}/(?:join|heartbeat|requests|chat|workspace)`,
      `workspaces/${UUID}/(?:claim|renew|commits|accept|revoke|acknowledge)`,
      `${media}/(?:join|publish|subscribe|complete|close|heartbeat|unpublish|unsubscribe)`,
    ],
    PUT: [`${session}/replay-progress`],
  }
  if (scope === 'teacher') {
    patterns.POST?.push(`${session}/control`)
    patterns.GET?.push(`${session}/demonstration`)
  }
  return patterns[method]?.some((pattern) => new RegExp(`^${pattern}$`).test(path))
    ? `/members/live/${path}`
    : null
}
