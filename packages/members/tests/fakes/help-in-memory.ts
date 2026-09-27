import { randomUUID } from 'node:crypto'
import { HelpDuplicateSlugError } from '../../src/domain/help/help.errors'
import type {
  CreateHelpCollectionInput,
  CreateHelpTutorialInput,
  HelpCollectionPatch,
  HelpCollectionRecord,
  HelpCollectionRepository,
  HelpImportItem,
  HelpTutorialListFilter,
  HelpTutorialPatch,
  HelpTutorialRecord,
  HelpTutorialRepository,
  HelpTutorialSearchHit,
  HelpTutorialStatusChange,
} from '../../src/domain/ports/help-repository.port'

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** Fake in-memory das coleções do "Como fazer" (espelha o Drizzle, inclusive o slug único). */
export class InMemoryHelpCollectionRepository implements HelpCollectionRepository {
  readonly rows = new Map<string, HelpCollectionRecord>()
  /** Preenchido pelo fake de tutoriais para a contagem de publicados. */
  tutorials: InMemoryHelpTutorialRepository | null = null

  private sorted(): HelpCollectionRecord[] {
    return [...this.rows.values()].sort(
      (a, b) => a.position - b.position || a.slug.localeCompare(b.slug),
    )
  }

  async list(): Promise<HelpCollectionRecord[]> {
    return this.sorted().map((row) => ({ ...row }))
  }

  async findById(id: string): Promise<HelpCollectionRecord | null> {
    const row = this.rows.get(id)
    return row ? { ...row } : null
  }

  async findBySlug(slug: string): Promise<HelpCollectionRecord | null> {
    const row = [...this.rows.values()].find((r) => r.slug === slug)
    return row ? { ...row } : null
  }

  async create(input: CreateHelpCollectionInput): Promise<HelpCollectionRecord> {
    if (await this.findBySlug(input.slug)) throw new HelpDuplicateSlugError()
    const record: HelpCollectionRecord = {
      id: input.id,
      slug: input.slug,
      title: input.title,
      description: input.description,
      icon: input.icon,
      tone: input.tone,
      position: input.position,
      status: 'active',
      createdAt: input.now,
      updatedAt: input.now,
    }
    this.rows.set(record.id, record)
    return { ...record }
  }

  async update(
    id: string,
    patch: HelpCollectionPatch,
    now: Date,
  ): Promise<HelpCollectionRecord | null> {
    const row = this.rows.get(id)
    if (!row) return null
    if (patch.slug && patch.slug !== row.slug && (await this.findBySlug(patch.slug))) {
      throw new HelpDuplicateSlugError()
    }
    const next = { ...row, ...patch, updatedAt: now }
    this.rows.set(id, next)
    return { ...next }
  }

  async setStatus(
    id: string,
    status: HelpCollectionRecord['status'],
    now: Date,
  ): Promise<HelpCollectionRecord | null> {
    const row = this.rows.get(id)
    if (!row) return null
    const next = { ...row, status, updatedAt: now }
    this.rows.set(id, next)
    return { ...next }
  }

  async reorder(ids: string[], now: Date): Promise<void> {
    const all = this.sorted().map((row) => row.id)
    const ordered = [
      ...ids.filter((id) => this.rows.has(id)),
      ...all.filter((id) => !ids.includes(id)),
    ]
    for (const [position, id] of ordered.entries()) {
      const row = this.rows.get(id)
      if (row) this.rows.set(id, { ...row, position, updatedAt: now })
    }
  }

  async publishedCounts(): Promise<Map<string, number>> {
    const counts = new Map<string, number>()
    for (const row of this.tutorials?.rows.values() ?? []) {
      if (row.status === 'published') {
        counts.set(row.collectionId, (counts.get(row.collectionId) ?? 0) + 1)
      }
    }
    return counts
  }
}

/** Fake in-memory dos tutoriais: lock otimista por `revision`, slug único, busca por substring. */
export class InMemoryHelpTutorialRepository implements HelpTutorialRepository {
  readonly rows = new Map<string, HelpTutorialRecord>()

  constructor(private readonly collections: InMemoryHelpCollectionRepository) {
    collections.tutorials = this
  }

  private sorted(rows: HelpTutorialRecord[]): HelpTutorialRecord[] {
    const positions = new Map(
      [...this.collections.rows.values()].map((c) => [c.id, c.position] as const),
    )
    return rows.sort(
      (a, b) =>
        (positions.get(a.collectionId) ?? 0) - (positions.get(b.collectionId) ?? 0) ||
        a.position - b.position ||
        a.slug.localeCompare(b.slug),
    )
  }

  private clone(row: HelpTutorialRecord): HelpTutorialRecord {
    return structuredClone(row)
  }

  async listPublished(): Promise<HelpTutorialRecord[]> {
    return this.sorted([...this.rows.values()].filter((r) => r.status === 'published')).map((r) =>
      this.clone(r),
    )
  }

  async findPublishedBySlug(slug: string): Promise<HelpTutorialRecord | null> {
    const row = [...this.rows.values()].find((r) => r.slug === slug && r.status === 'published')
    return row ? this.clone(row) : null
  }

  async searchPublished(query: string, limit: number): Promise<HelpTutorialSearchHit[]> {
    const terms = normalize(query).split(/\s+/).filter(Boolean)
    if (terms.length === 0) return []
    return [...this.rows.values()]
      .filter(
        (r) =>
          r.status === 'published' &&
          r.published &&
          terms.some((term) => (r.publishedSearchText ?? '').includes(term)),
      )
      .slice(0, limit)
      .map((r) => ({
        id: r.id,
        slug: r.slug,
        collectionId: r.collectionId,
        title: r.published?.title ?? '',
        summary: r.published?.summary ?? '',
        published: structuredClone(r.published as NonNullable<typeof r.published>),
      }))
  }

  async listAll(filter: HelpTutorialListFilter = {}): Promise<HelpTutorialRecord[]> {
    const q = filter.q ? normalize(filter.q) : null
    return this.sorted(
      [...this.rows.values()].filter(
        (r) =>
          (!filter.status || r.status === filter.status) &&
          (!filter.collectionId || r.collectionId === filter.collectionId) &&
          (!q || normalize(r.slug).includes(q) || normalize(r.draft.title).includes(q)),
      ),
    ).map((r) => this.clone(r))
  }

  async findById(id: string): Promise<HelpTutorialRecord | null> {
    const row = this.rows.get(id)
    return row ? this.clone(row) : null
  }

  async findBySlug(slug: string): Promise<HelpTutorialRecord | null> {
    const row = [...this.rows.values()].find((r) => r.slug === slug)
    return row ? this.clone(row) : null
  }

  async create(input: CreateHelpTutorialInput): Promise<HelpTutorialRecord> {
    if (await this.findBySlug(input.slug)) throw new HelpDuplicateSlugError()
    const record: HelpTutorialRecord = {
      id: input.id,
      slug: input.slug,
      collectionId: input.collectionId,
      status: 'draft',
      draft: structuredClone(input.draft),
      published: null,
      publishedSearchText: null,
      revision: 1,
      position: input.position,
      createdBy: input.actorId,
      updatedBy: input.actorId,
      createdAt: input.now,
      updatedAt: input.now,
      publishedAt: null,
    }
    this.rows.set(record.id, record)
    return this.clone(record)
  }

  async update(
    id: string,
    expectedRevision: number,
    patch: HelpTutorialPatch,
    actorId: string | null,
    now: Date,
  ): Promise<HelpTutorialRecord | 'conflict' | null> {
    const row = this.rows.get(id)
    if (!row) return null
    if (row.revision !== expectedRevision) return 'conflict'
    if (patch.slug && patch.slug !== row.slug && (await this.findBySlug(patch.slug))) {
      throw new HelpDuplicateSlugError()
    }
    const next: HelpTutorialRecord = {
      ...row,
      ...(patch.slug !== undefined ? { slug: patch.slug } : {}),
      ...(patch.collectionId !== undefined ? { collectionId: patch.collectionId } : {}),
      ...(patch.position !== undefined ? { position: patch.position } : {}),
      ...(patch.draft !== undefined ? { draft: structuredClone(patch.draft) } : {}),
      revision: row.revision + 1,
      updatedBy: actorId,
      updatedAt: now,
    }
    this.rows.set(id, next)
    return this.clone(next)
  }

  async setStatus(
    id: string,
    expectedRevision: number,
    change: HelpTutorialStatusChange,
    actorId: string | null,
    now: Date,
  ): Promise<HelpTutorialRecord | 'conflict' | null> {
    const row = this.rows.get(id)
    if (!row) return null
    if (row.revision !== expectedRevision) return 'conflict'
    const next: HelpTutorialRecord = {
      ...row,
      status: change.status,
      published: change.published ? structuredClone(change.published) : null,
      publishedSearchText: change.publishedSearchText,
      ...(change.publishedAt !== undefined ? { publishedAt: change.publishedAt } : {}),
      revision: row.revision + 1,
      updatedBy: actorId,
      updatedAt: now,
    }
    this.rows.set(id, next)
    return this.clone(next)
  }

  async upsertDraftsBySlug(
    items: HelpImportItem[],
    actorId: string | null,
    now: Date,
  ): Promise<{ created: number; updated: number }> {
    let created = 0
    let updated = 0
    for (const item of items) {
      const existing = [...this.rows.values()].find((r) => r.slug === item.slug)
      if (existing) {
        this.rows.set(existing.id, {
          ...existing,
          collectionId: item.collectionId,
          draft: structuredClone(item.draft),
          position: item.position,
          revision: existing.revision + 1,
          updatedBy: actorId,
          updatedAt: now,
        })
        updated += 1
      } else {
        await this.create({
          id: randomUUID(),
          slug: item.slug,
          collectionId: item.collectionId,
          draft: item.draft,
          position: item.position,
          actorId,
          now,
        })
        created += 1
      }
    }
    return { created, updated }
  }

  async countPublishedInCollection(collectionId: string): Promise<number> {
    return [...this.rows.values()].filter(
      (r) => r.collectionId === collectionId && r.status === 'published',
    ).length
  }
}
