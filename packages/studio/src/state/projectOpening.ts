/** In-memory ownership of an opening, scoped to its captured local backend. */
const openings = new Map<string, Map<string, Set<symbol>>>()

export function beginProjectOpening(
  scope: { readonly identity: string; readonly signal?: AbortSignal },
  id: string,
  signal?: AbortSignal,
): () => void {
  const signals = new Set([scope.signal, signal].filter((value) => value !== undefined))
  if ([...signals].some((value) => value.aborted)) return () => {}
  let projects = openings.get(scope.identity)
  if (!projects) {
    projects = new Map()
    openings.set(scope.identity, projects)
  }
  let owners = projects.get(id)
  if (!owners) {
    owners = new Set()
    projects.set(id, owners)
  }
  const owner = Symbol()
  owners.add(owner)
  let released = false
  const release = () => {
    if (released) return
    released = true
    for (const value of signals) value.removeEventListener('abort', release)
    owners.delete(owner)
    if (owners.size === 0) projects.delete(id)
    if (projects.size === 0) openings.delete(scope.identity)
  }
  for (const value of signals) value.addEventListener('abort', release, { once: true })
  return release
}

export function isProjectOpening(scope: { readonly identity: string }, id: string): boolean {
  return (openings.get(scope.identity)?.get(id)?.size ?? 0) > 0
}
