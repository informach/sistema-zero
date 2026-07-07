import { asc, eq, inArray } from 'drizzle-orm'
import type { ChecklistItem } from '../../../domain/content/content'
import type { ChecklistRepository } from '../../../domain/ports/content-repository.port'
import type { Database } from './db'
import { checklistItems } from './schema'

export class DrizzleChecklistRepository implements ChecklistRepository {
  constructor(private readonly db: Database) {}

  async createMany(items: ChecklistItem[]): Promise<void> {
    if (items.length === 0) return
    await this.db.insert(checklistItems).values(items)
  }

  async byId(id: string): Promise<ChecklistItem | null> {
    const [row] = await this.db
      .select()
      .from(checklistItems)
      .where(eq(checklistItems.id, id))
      .limit(1)
    return row ?? null
  }

  async update(item: ChecklistItem): Promise<void> {
    await this.db
      .update(checklistItems)
      .set({
        label: item.label,
        done: item.done,
        doneBy: item.doneBy,
        doneByName: item.doneByName,
        doneAt: item.doneAt,
      })
      .where(eq(checklistItems.id, item.id))
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(checklistItems).where(eq(checklistItems.id, id))
  }

  async listByContent(contentId: string): Promise<ChecklistItem[]> {
    return this.db
      .select()
      .from(checklistItems)
      .where(eq(checklistItems.contentId, contentId))
      .orderBy(asc(checklistItems.position), asc(checklistItems.createdAt))
  }

  async countsByContent(
    contentIds: string[],
  ): Promise<Map<string, { done: number; total: number }>> {
    const map = new Map<string, { done: number; total: number }>()
    if (contentIds.length === 0) return map
    const rows = await this.db
      .select({ contentId: checklistItems.contentId, done: checklistItems.done })
      .from(checklistItems)
      .where(inArray(checklistItems.contentId, contentIds))
    for (const row of rows) {
      const entry = map.get(row.contentId) ?? { done: 0, total: 0 }
      entry.total += 1
      if (row.done) entry.done += 1
      map.set(row.contentId, entry)
    }
    return map
  }
}
