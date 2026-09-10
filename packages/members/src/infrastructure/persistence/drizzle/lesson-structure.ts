import { randomUUID } from 'node:crypto'
import { defaultLessonSection } from '@sistemazero/core/learning'
import { asc, eq, sql } from 'drizzle-orm'
import type { Database } from './db'
import { activeLessonBlocks as lessonBlocks, lessonStructures, lessons } from './schema'

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]
export async function lockLessonStructure(tx: Transaction, lessonId: string) {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`lesson-block-order:${lessonId}`}, 0))`,
  )
}
/** Runs in the block mutation transaction, under the lesson lock. Keeps every block reachable. */
export async function syncLessonStructure(tx: Transaction, lessonId: string, reorder = false) {
  const [lesson] = await tx
    .select({ title: lessons.title })
    .from(lessons)
    .where(eq(lessons.id, lessonId))
  if (!lesson) return
  const blocks = await tx
    .select({ id: lessonBlocks.id, kind: lessonBlocks.kind })
    .from(lessonBlocks)
    .where(eq(lessonBlocks.lessonId, lessonId))
    .orderBy(asc(lessonBlocks.sortOrder))
  const [current] = await tx
    .select()
    .from(lessonStructures)
    .where(eq(lessonStructures.lessonId, lessonId))
  const ids = new Set(blocks.map((b) => b.id))
  const workspaces = new Set(
    blocks.filter((b) => b.kind === 'studio' || b.kind === 'pinta').map((b) => b.id),
  )
  const sections = current?.sections.map((s) => ({
    ...s,
    blockIds: reorder
      ? blocks.filter((b) => s.blockIds.includes(b.id)).map((b) => b.id)
      : s.blockIds.filter((id) => ids.has(id)),
    workspaceBlockId:
      s.workspaceBlockId && workspaces.has(s.workspaceBlockId) ? s.workspaceBlockId : null,
  })) ?? [defaultLessonSection(lessonId, lesson.title, [])]
  const supportBlockIds = current?.supportBlockIds.filter((id) => ids.has(id)) ?? []
  const placed = new Set([...sections.flatMap((s) => s.blockIds), ...supportBlockIds])
  const last = sections.at(-1)
  if (last) last.blockIds.push(...blocks.filter((b) => !placed.has(b.id)).map((b) => b.id))
  if (
    JSON.stringify(current?.sections) === JSON.stringify(sections) &&
    JSON.stringify(current?.supportBlockIds) === JSON.stringify(supportBlockIds)
  )
    return
  await tx
    .insert(lessonStructures)
    .values({ lessonId, sections, supportBlockIds, revision: randomUUID() })
    .onConflictDoUpdate({
      target: lessonStructures.lessonId,
      set: { sections, supportBlockIds, revision: randomUUID() },
    })
}
