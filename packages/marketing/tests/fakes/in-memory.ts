import type {
  ChecklistItem,
  Content,
  ContentComment,
  StageEvent,
} from '../../src/domain/content/content'
import type { Idea } from '../../src/domain/idea/idea'
import type { MediaAsset } from '../../src/domain/media/media-asset'
import type {
  ChecklistRepository,
  CommentRepository,
  ContentRepository,
  ListContentsFilter,
} from '../../src/domain/ports/content-repository.port'
import type { IdeaRepository, ListIdeasFilter } from '../../src/domain/ports/idea-repository.port'
import type {
  ListAssetsFilter,
  MediaAssetRepository,
} from '../../src/domain/ports/media-asset-repository.port'
import type { HeadResult, MediaStore } from '../../src/domain/ports/media-store.port'
import type { PublicationRepository } from '../../src/domain/ports/publication-repository.port'
import type { Publication } from '../../src/domain/publication/publication-record'

const clone = <T>(value: T): T => structuredClone(value)

export class InMemoryIdeaRepository implements IdeaRepository {
  readonly rows = new Map<string, Idea>()

  async create(idea: Idea): Promise<void> {
    this.rows.set(idea.id, clone(idea))
  }
  async byId(id: string): Promise<Idea | null> {
    const row = this.rows.get(id)
    return row ? clone(row) : null
  }
  async update(idea: Idea): Promise<void> {
    this.rows.set(idea.id, clone(idea))
  }
  async markPromoted(id: string, contentId: string, at: Date): Promise<boolean> {
    const current = this.rows.get(id)
    if (current?.status !== 'inbox') return false
    current.status = 'accepted'
    current.promotedContentId = contentId
    current.updatedAt = at
    return true
  }
  async list(filter: ListIdeasFilter): Promise<{ items: Idea[]; total: number }> {
    const all = [...this.rows.values()]
      .filter((i) => !filter.status || i.status === filter.status)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    return {
      items: all.slice(filter.offset, filter.offset + filter.limit).map(clone),
      total: all.length,
    }
  }
}

export class InMemoryContentRepository implements ContentRepository {
  readonly rows = new Map<string, Content>()
  readonly events: StageEvent[] = []

  async create(content: Content): Promise<void> {
    this.rows.set(content.id, clone(content))
  }
  async byId(id: string): Promise<Content | null> {
    const row = this.rows.get(id)
    return row ? clone(row) : null
  }
  async update(content: Content, expectedVersion: number): Promise<boolean> {
    const current = this.rows.get(content.id)
    if (!current || current.version !== expectedVersion) return false
    this.rows.set(content.id, clone(content))
    return true
  }
  async list(filter: ListContentsFilter): Promise<{ items: Content[]; total: number }> {
    const all = [...this.rows.values()]
      .filter((c) => !filter.stage || c.stage === filter.stage)
      .filter((c) => !filter.ownerUserId || c.ownerUserId === filter.ownerUserId)
      .filter((c) => !filter.q || c.title.toLowerCase().includes(filter.q.toLowerCase()))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    return {
      items: all.slice(filter.offset, filter.offset + filter.limit).map(clone),
      total: all.length,
    }
  }
  async countByStage(): Promise<Map<Content['stage'], number>> {
    const map = new Map<Content['stage'], number>()
    for (const content of this.rows.values()) {
      map.set(content.stage, (map.get(content.stage) ?? 0) + 1)
    }
    return map
  }
  async insertStageEvent(event: StageEvent): Promise<void> {
    this.events.push(clone(event))
  }
  async listStageEvents(contentId: string): Promise<StageEvent[]> {
    return this.events.filter((e) => e.contentId === contentId).map(clone)
  }
}

export class InMemoryChecklistRepository implements ChecklistRepository {
  readonly rows = new Map<string, ChecklistItem>()

  async createMany(items: ChecklistItem[]): Promise<void> {
    for (const item of items) this.rows.set(item.id, clone(item))
  }
  async byId(id: string): Promise<ChecklistItem | null> {
    const row = this.rows.get(id)
    return row ? clone(row) : null
  }
  async update(item: ChecklistItem): Promise<void> {
    this.rows.set(item.id, clone(item))
  }
  async delete(id: string): Promise<void> {
    this.rows.delete(id)
  }
  async listByContent(contentId: string): Promise<ChecklistItem[]> {
    return [...this.rows.values()]
      .filter((i) => i.contentId === contentId)
      .sort((a, b) => a.position - b.position)
      .map(clone)
  }
  async countsByContent(
    contentIds: string[],
  ): Promise<Map<string, { done: number; total: number }>> {
    const map = new Map<string, { done: number; total: number }>()
    for (const id of contentIds) {
      const items = [...this.rows.values()].filter((i) => i.contentId === id)
      if (items.length > 0) {
        map.set(id, { done: items.filter((i) => i.done).length, total: items.length })
      }
    }
    return map
  }
}

export class InMemoryCommentRepository implements CommentRepository {
  readonly rows: ContentComment[] = []

  async create(comment: ContentComment): Promise<void> {
    this.rows.push(clone(comment))
  }
  async listByContent(contentId: string): Promise<ContentComment[]> {
    return this.rows.filter((c) => c.contentId === contentId).map(clone)
  }
  async countsByContent(contentIds: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>()
    for (const id of contentIds) {
      const n = this.rows.filter((c) => c.contentId === id).length
      if (n > 0) map.set(id, n)
    }
    return map
  }
}

export class InMemoryMediaAssetRepository implements MediaAssetRepository {
  readonly rows = new Map<string, MediaAsset>()

  async create(asset: MediaAsset): Promise<void> {
    this.rows.set(asset.id, clone(asset))
  }
  async byId(id: string): Promise<MediaAsset | null> {
    const row = this.rows.get(id)
    return row ? clone(row) : null
  }
  async update(asset: MediaAsset, expectedVersion: number): Promise<boolean> {
    const current = this.rows.get(asset.id)
    if (!current || current.version !== expectedVersion) return false
    this.rows.set(asset.id, clone(asset))
    return true
  }
  async list(filter: ListAssetsFilter): Promise<{ items: MediaAsset[]; total: number }> {
    const all = [...this.rows.values()]
      .filter((a) => !filter.contentId || a.contentId === filter.contentId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    return {
      items: all.slice(filter.offset, filter.offset + filter.limit).map(clone),
      total: all.length,
    }
  }
  async byIds(ids: string[]): Promise<Map<string, MediaAsset>> {
    const map = new Map<string, MediaAsset>()
    for (const id of ids) {
      const row = this.rows.get(id)
      if (row) map.set(id, clone(row))
    }
    return map
  }
}

export class InMemoryPublicationRepository implements PublicationRepository {
  readonly rows = new Map<string, Publication>()

  async create(publication: Publication): Promise<void> {
    this.rows.set(publication.id, clone(publication))
  }
  async createMany(publications: Publication[]): Promise<void> {
    for (const publication of publications) this.rows.set(publication.id, clone(publication))
  }
  async byId(id: string): Promise<Publication | null> {
    const row = this.rows.get(id)
    return row ? clone(row) : null
  }
  async update(publication: Publication, expectedVersion: number): Promise<boolean> {
    const current = this.rows.get(publication.id)
    if (!current || current.version !== expectedVersion) return false
    this.rows.set(publication.id, clone(publication))
    return true
  }
  async listByContent(contentId: string): Promise<Publication[]> {
    return [...this.rows.values()]
      .filter((p) => p.contentId === contentId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(clone)
  }
  async listByContents(contentIds: string[]): Promise<Map<string, Publication[]>> {
    const map = new Map<string, Publication[]>()
    for (const id of contentIds) {
      const pubs = await this.listByContent(id)
      if (pubs.length > 0) map.set(id, pubs)
    }
    return map
  }
}

/** MediaStore roteirizável: presign devolve URLs falsas; head lê `objects`. */
export class FakeMediaStore implements MediaStore {
  /** key → tamanho do objeto "no R2" (setado pelo teste após o "upload"). */
  readonly objects = new Map<string, number>()
  readonly deleted: string[] = []

  async presignPut(input: { key: string }): Promise<string> {
    return `https://fake-r2.local/put/${encodeURIComponent(input.key)}`
  }
  async presignGet(input: { key: string }): Promise<string> {
    return `https://fake-r2.local/get/${encodeURIComponent(input.key)}`
  }
  async head(key: string): Promise<HeadResult> {
    const size = this.objects.get(key)
    if (size === undefined) return { exists: false, sizeBytes: null, contentType: null }
    return { exists: true, sizeBytes: size, contentType: 'application/octet-stream' }
  }
  async delete(key: string): Promise<void> {
    this.deleted.push(key)
    this.objects.delete(key)
  }
}
