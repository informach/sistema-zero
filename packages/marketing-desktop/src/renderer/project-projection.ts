import type { EditorialItem } from '../../../marketing-contracts/src/editorial'
import type { ProjectView } from '../../../marketing-contracts/src/sync'
import { projectProjectionSchema } from '../shared/project-projection'

type Cached = { version: number; items: EditorialItem[] }
/** Only changed items cross IPC. Same-project calls share a single request;
 * permission loss evicts the projection and fences any pending reply. */
export class DesktopProjectProjection {
  private readonly caches = new Map<string, Cached>()
  private readonly flights = new Map<string, Promise<ProjectView>>()
  private allowed: Set<string> | null = null
  private generation = 0
  constructor(private readonly request: (id: string, version: number | null) => Promise<unknown>) {}
  retain(projectIds: string[]) {
    const next = new Set(projectIds)
    if (this.allowed && [...this.allowed].some((id) => !next.has(id))) this.generation++
    this.allowed = next
    for (const id of this.caches.keys()) if (!next.has(id)) this.caches.delete(id)
  }
  read(id: string): Promise<ProjectView> {
    if (this.allowed && !this.allowed.has(id))
      return Promise.reject(new Error('Projeto indisponível nesta conta'))
    const existing = this.flights.get(id)
    if (existing) return existing
    const flight = this.load(id).finally(() => {
      this.flights.delete(id)
    })
    this.flights.set(id, flight)
    return flight
  }
  private async load(id: string): Promise<ProjectView> {
    const before = this.caches.get(id),
      generation = this.generation
    const { changes, ...rest } = projectProjectionSchema.parse(
      await this.request(id, before?.version ?? null),
    )
    if (generation !== this.generation || (this.allowed && !this.allowed.has(id)))
      throw new Error('O acesso mudou durante a leitura; abra novamente o projeto')
    if (
      changes.projectId !== id ||
      (!changes.reset && (!before || changes.version < before.version))
    )
      throw new Error('Projeção fora da base local esperada')
    if (
      !changes.reset &&
      before &&
      changes.version === before.version &&
      (changes.items.length || changes.removed.length)
    )
      throw new Error('Conteúdo alterado sem versão de projeção')
    let items = before?.items ?? []
    if (changes.reset || changes.items.length || changes.removed.length) {
      const mapped = new Map((changes.reset ? [] : items).map((item) => [item.id, item]))
      for (const removed of changes.removed) mapped.delete(removed)
      for (const item of changes.items) mapped.set(item.id, item)
      items = [...mapped.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    }
    this.caches.set(id, { version: changes.version, items })
    return { ...rest, items }
  }
}
