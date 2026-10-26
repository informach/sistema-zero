import type { Platform } from './platform'

/** The community is explicit on the request, including pagination and direct links. */
export function communityQuery(path: string, audience: Platform | 'unassigned'): string {
  const [pathname, query = ''] = path.split('?')
  const params = new URLSearchParams(query)
  params.set('audience', audience)
  return `${pathname}?${params}`
}

export function isCanceledCommunityRequest(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}
