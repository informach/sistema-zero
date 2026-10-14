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
  if (scope === 'parent')
    return (method === 'GET' && path === 'enrollments') ||
      (method === 'POST' && new RegExp(`^enrollments/${UUID}/assign$`).test(path))
      ? `/members/parents/live/${path}`
      : null
  if (scope === 'admin') {
    const patterns: Record<string, string[]> = {
      GET: ['catalog', 'templates', `cohorts/${UUID}/enrollments`],
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
      `${session}/learning-progress`,
      `workspaces/${UUID}`,
    ],
    POST: [
      `${session}/(?:join|heartbeat|requests|chat|workspace)`,
      `${session}/blocks/${UUID}/(?:learning-progress|learning-attempts)`,
      `workspaces/${UUID}/(?:claim|renew|commits|accept|revoke|acknowledge)`,
      `${media}/(?:join|publish|subscribe|complete|close|heartbeat|unpublish|unsubscribe)`,
    ],
    PUT: [`${session}/replay-progress`],
  }
  if (scope === 'teacher') {
    patterns.POST?.push(`${session}/control`)
    patterns.GET?.push(`${session}/demonstration`)
    patterns.GET?.push(`${session}/learning-preview`)
  }
  return patterns[method]?.some((pattern) => new RegExp(`^${pattern}$`).test(path))
    ? `/members/live/${path}`
    : null
}
