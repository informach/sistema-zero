import { randomUUID } from 'node:crypto'
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'
import { HelpDuplicateSlugError } from '../../../domain/help/help.errors'
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
} from '../../../domain/ports/help-repository.port'
import type { Database } from './db'
import { helpCollections, helpTutorials } from './schema'

type CollectionRow = typeof helpCollections.$inferSelect
type TutorialRow = typeof helpTutorials.$inferSelect

/**
 * 23505 = unique_violation. O drizzle-orm envelopa o erro do driver em `DrizzleQueryError`
 * com o `PostgresError` em `cause` (mesmo gotcha do `content-admin.repository.ts`): caminha
 * a cadeia com teto.
 */
function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error
  for (let depth = 0; depth < 5 && typeof current === 'object' && current !== null; depth++) {
    if ((current as { code?: unknown }).code === '23505') return true
    current = (current as { cause?: unknown }).cause
  }
  return false
}

function toCollection(row: CollectionRow): HelpCollectionRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    icon: row.icon as HelpCollectionRecord['icon'],
    tone: row.tone as HelpCollectionRecord['tone'],
    position: row.position,
    status: row.status as HelpCollectionRecord['status'],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toTutorial(row: TutorialRow): HelpTutorialRecord {
  return {
    id: row.id,
    slug: row.slug,
    collectionId: row.collectionId,
    status: row.status as HelpTutorialRecord['status'],
    draft: row.draft,
    published: row.published ?? null,
    publishedSearchText: row.publishedSearchText ?? null,
    revision: row.revision,
    position: row.position,
    createdBy: row.createdBy ?? null,
    updatedBy: row.updatedBy ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    publishedAt: row.publishedAt ?? null,
  }
}

export class DrizzleHelpCollectionRepository implements HelpCollectionRepository {
  constructor(private readonly db: Database) {}

  async list(): Promise<HelpCollectionRecord[]> {
    const rows = await this.db
      .select()
      .from(helpCollections)
      .orderBy(asc(helpCollections.position), asc(helpCollections.slug))
    return rows.map(toCollection)
  }

  async findById(id: string): Promise<HelpCollectionRecord | null> {
    const rows = await this.db
      .select()
      .from(helpCollections)
      .where(eq(helpCollections.id, id))
      .limit(1)
    return rows[0] ? toCollection(rows[0]) : null
  }

  async findBySlug(slug: string): Promise<HelpCollectionRecord | null> {
    const rows = await this.db
      .select()
      .from(helpCollections)
      .where(eq(helpCollections.slug, slug))
      .limit(1)
    return rows[0] ? toCollection(rows[0]) : null
  }

  async create(input: CreateHelpCollectionInput): Promise<HelpCollectionRecord> {
    try {
      const rows = await this.db
        .insert(helpCollections)
        .values({
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
        })
        .returning()
      return toCollection(rows[0] as CollectionRow)
    } catch (error) {
      if (isUniqueViolation(error)) throw new HelpDuplicateSlugError()
      throw error
    }
  }

  async update(
    id: string,
    patch: HelpCollectionPatch,
    now: Date,
  ): Promise<HelpCollectionRecord | null> {
    try {
      const rows = await this.db
        .update(helpCollections)
        .set({ ...patch, updatedAt: now })
        .where(eq(helpCollections.id, id))
        .returning()
      return rows[0] ? toCollection(rows[0]) : null
    } catch (error) {
      if (isUniqueViolation(error)) throw new HelpDuplicateSlugError()
      throw error
    }
  }

  async setStatus(
    id: string,
    status: HelpCollectionRecord['status'],
    now: Date,
  ): Promise<HelpCollectionRecord | null> {
    const rows = await this.db
      .update(helpCollections)
      .set({ status, updatedAt: now })
      .where(eq(helpCollections.id, id))
      .returning()
    return rows[0] ? toCollection(rows[0]) : null
  }

  async reorder(ids: string[], now: Date): Promise<void> {
    await this.db.transaction(async (tx) => {
      const all = await tx
        .select({ id: helpCollections.id })
        .from(helpCollections)
        .orderBy(asc(helpCollections.position), asc(helpCollections.slug))
      const known = new Set(all.map((row) => row.id))
      const ordered = [
        ...ids.filter((id) => known.has(id)),
        ...all.map((row) => row.id).filter((id) => !ids.includes(id)),
      ]
      for (const [position, id] of ordered.entries()) {
        await tx
          .update(helpCollections)
          .set({ position, updatedAt: now })
          .where(eq(helpCollections.id, id))
      }
    })
  }

  async publishedCounts(): Promise<Map<string, number>> {
    const rows = await this.db
      .select({ collectionId: helpTutorials.collectionId, count: sql<number>`count(*)::int` })
      .from(helpTutorials)
      .where(eq(helpTutorials.status, 'published'))
      .groupBy(helpTutorials.collectionId)
    return new Map(rows.map((row) => [row.collectionId, Number(row.count)]))
  }
}

export class DrizzleHelpTutorialRepository implements HelpTutorialRepository {
  constructor(private readonly db: Database) {}

  async listPublished(): Promise<HelpTutorialRecord[]> {
    const rows = await this.db
      .select({ tutorial: helpTutorials })
      .from(helpTutorials)
      .innerJoin(helpCollections, eq(helpCollections.id, helpTutorials.collectionId))
      .where(eq(helpTutorials.status, 'published'))
      .orderBy(asc(helpCollections.position), asc(helpTutorials.position), asc(helpTutorials.slug))
    return rows.map((row) => toTutorial(row.tutorial))
  }

  async findPublishedBySlug(slug: string): Promise<HelpTutorialRecord | null> {
    const rows = await this.db
      .select()
      .from(helpTutorials)
      .where(and(eq(helpTutorials.slug, slug), eq(helpTutorials.status, 'published')))
      .limit(1)
    return rows[0] ? toTutorial(rows[0]) : null
  }

  async searchPublished(query: string, limit: number): Promise<HelpTutorialSearchHit[]> {
    const normalized = query.trim()
    if (!normalized) return []
    // OR entre os termos, como a base do Zappy: o `ts_rank` premia quem casa mais termos.
    const orQuery = normalized.split(/\s+/).filter(Boolean).join(' or ')
    const tsQuery = sql`websearch_to_tsquery('portuguese', ${orQuery})`
    const vector = sql`to_tsvector('portuguese', coalesce(${helpTutorials.publishedSearchText}, ''))`
    const rank = sql<number>`ts_rank(${vector}, ${tsQuery})`
    const rows = await this.db
      .select({
        id: helpTutorials.id,
        slug: helpTutorials.slug,
        collectionId: helpTutorials.collectionId,
        published: helpTutorials.published,
        rank,
      })
      .from(helpTutorials)
      .where(
        and(
          eq(helpTutorials.status, 'published'),
          // Só o tsquery: um OR com ILIKE obrigava seq scan (o GIN da 0097 nunca entrava) e a
          // pergunta inteira em `%...%` quase nunca casava. O `websearch_to_tsquery` com "or"
          // já cobre radical e acento (o texto é normalizado dos dois lados).
          sql`${vector} @@ ${tsQuery}`,
        ),
      )
      .orderBy(desc(rank), asc(helpTutorials.position))
      .limit(Math.max(1, Math.min(10, limit)))
    return rows.flatMap((row) =>
      row.published
        ? [
            {
              id: row.id,
              slug: row.slug,
              collectionId: row.collectionId,
              title: row.published.title,
              summary: row.published.summary,
              published: row.published,
            },
          ]
        : [],
    )
  }

  async listAll(filter: HelpTutorialListFilter = {}): Promise<HelpTutorialRecord[]> {
    const conditions = []
    if (filter.status) conditions.push(eq(helpTutorials.status, filter.status))
    if (filter.collectionId) conditions.push(eq(helpTutorials.collectionId, filter.collectionId))
    if (filter.q?.trim()) {
      // `%` e `_` são curingas do ILIKE: sem escapar, `q=%` listava tudo.
      const like = `%${filter.q.trim().replace(/[\\%_]/g, (c) => `\\${c}`)}%`
      conditions.push(
        sql`(${helpTutorials.slug} ilike ${like} or ${helpTutorials.draft}->>'title' ilike ${like})`,
      )
    }
    const rows = await this.db
      .select({ tutorial: helpTutorials })
      .from(helpTutorials)
      .innerJoin(helpCollections, eq(helpCollections.id, helpTutorials.collectionId))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(helpCollections.position), asc(helpTutorials.position), asc(helpTutorials.slug))
    return rows.map((row) => toTutorial(row.tutorial))
  }

  async findById(id: string): Promise<HelpTutorialRecord | null> {
    const rows = await this.db.select().from(helpTutorials).where(eq(helpTutorials.id, id)).limit(1)
    return rows[0] ? toTutorial(rows[0]) : null
  }

  async findBySlug(slug: string): Promise<HelpTutorialRecord | null> {
    const rows = await this.db
      .select()
      .from(helpTutorials)
      .where(eq(helpTutorials.slug, slug))
      .limit(1)
    return rows[0] ? toTutorial(rows[0]) : null
  }

  async create(input: CreateHelpTutorialInput): Promise<HelpTutorialRecord> {
    try {
      const rows = await this.db
        .insert(helpTutorials)
        .values({
          id: input.id,
          slug: input.slug,
          collectionId: input.collectionId,
          status: 'draft',
          draft: input.draft,
          published: null,
          publishedSearchText: null,
          revision: 1,
          position: input.position,
          createdBy: input.actorId,
          updatedBy: input.actorId,
          createdAt: input.now,
          updatedAt: input.now,
          publishedAt: null,
        })
        .returning()
      return toTutorial(rows[0] as TutorialRow)
    } catch (error) {
      if (isUniqueViolation(error)) throw new HelpDuplicateSlugError()
      throw error
    }
  }

  async update(
    id: string,
    expectedRevision: number,
    patch: HelpTutorialPatch,
    actorId: string | null,
    now: Date,
  ): Promise<HelpTutorialRecord | 'conflict' | null> {
    try {
      const rows = await this.db
        .update(helpTutorials)
        .set({
          ...patch,
          revision: sql`${helpTutorials.revision} + 1`,
          updatedBy: actorId,
          updatedAt: now,
        })
        .where(and(eq(helpTutorials.id, id), eq(helpTutorials.revision, expectedRevision)))
        .returning()
      if (rows[0]) return toTutorial(rows[0])
      const exists = await this.findById(id)
      return exists ? 'conflict' : null
    } catch (error) {
      if (isUniqueViolation(error)) throw new HelpDuplicateSlugError()
      throw error
    }
  }

  async setStatus(
    id: string,
    expectedRevision: number,
    change: HelpTutorialStatusChange,
    actorId: string | null,
    now: Date,
  ): Promise<HelpTutorialRecord | 'conflict' | null> {
    const rows = await this.db
      .update(helpTutorials)
      .set({
        status: change.status,
        published: change.published,
        publishedSearchText: change.publishedSearchText,
        ...(change.publishedAt !== undefined ? { publishedAt: change.publishedAt } : {}),
        revision: sql`${helpTutorials.revision} + 1`,
        updatedBy: actorId,
        updatedAt: now,
      })
      .where(and(eq(helpTutorials.id, id), eq(helpTutorials.revision, expectedRevision)))
      .returning()
    if (rows[0]) return toTutorial(rows[0])
    const exists = await this.findById(id)
    return exists ? 'conflict' : null
  }

  async upsertDraftsBySlug(
    items: HelpImportItem[],
    actorId: string | null,
    now: Date,
  ): Promise<{ created: number; updated: number }> {
    if (items.length === 0) return { created: 0, updated: 0 }
    try {
      return await this.upsertDraftsInTransaction(items, actorId, now)
    } catch (error) {
      if (isUniqueViolation(error)) throw new HelpDuplicateSlugError()
      throw error
    }
  }

  private upsertDraftsInTransaction(
    items: HelpImportItem[],
    actorId: string | null,
    now: Date,
  ): Promise<{ created: number; updated: number }> {
    return this.db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: helpTutorials.id, slug: helpTutorials.slug })
        .from(helpTutorials)
        .where(
          inArray(
            helpTutorials.slug,
            items.map((item) => item.slug),
          ),
        )
      const bySlug = new Map(existing.map((row) => [row.slug, row.id]))
      let created = 0
      let updated = 0
      for (const item of items) {
        const id = bySlug.get(item.slug)
        if (id) {
          await tx
            .update(helpTutorials)
            .set({
              collectionId: item.collectionId,
              draft: item.draft,
              position: item.position,
              revision: sql`${helpTutorials.revision} + 1`,
              updatedBy: actorId,
              updatedAt: now,
            })
            .where(eq(helpTutorials.id, id))
          updated += 1
        } else {
          await tx.insert(helpTutorials).values({
            id: randomUUID(),
            slug: item.slug,
            collectionId: item.collectionId,
            status: 'draft',
            draft: item.draft,
            published: null,
            publishedSearchText: null,
            revision: 1,
            position: item.position,
            createdBy: actorId,
            updatedBy: actorId,
            createdAt: now,
            updatedAt: now,
            publishedAt: null,
          })
          created += 1
        }
      }
      return { created, updated }
    })
  }

  async countPublishedInCollection(collectionId: string): Promise<number> {
    const rows = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(helpTutorials)
      .where(
        and(eq(helpTutorials.collectionId, collectionId), eq(helpTutorials.status, 'published')),
      )
    return Number(rows[0]?.count ?? 0)
  }
}
