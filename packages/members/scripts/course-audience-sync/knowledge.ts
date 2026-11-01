import { asc, eq } from 'drizzle-orm'
import type { ZappyKnowledgeSourceType } from '../../src/domain/ports/zappy-knowledge-repository.port'
import type { Database } from '../../src/infrastructure/persistence/drizzle/db'
import {
  zappyKnowledgeChunks,
  zappyKnowledgeSources,
} from '../../src/infrastructure/persistence/drizzle/schema'
import { DrizzleZappyKnowledgeRepository } from '../../src/infrastructure/persistence/drizzle/zappy-knowledge.repository'
import type { CourseSyncPlan } from './plan'

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]

/** Reuse only authoritative teaching extracts. No learner conversations or submissions. */
export async function syncCourseKnowledge(
  tx: Transaction,
  plan: CourseSyncPlan,
  sourceCourseId: string,
) {
  const sourceRows = await tx
    .select()
    .from(zappyKnowledgeSources)
    .where(eq(zappyKnowledgeSources.courseId, sourceCourseId))
  const mirror = plan.course.metadata?.contentMirror as {
    blocks: Record<string, string>
    attachments: Record<string, string>
  }
  const repository = new DrizzleZappyKnowledgeRepository(tx)
  let copied = 0,
    unavailable = 0
  // These are derived teaching indexes, unlike the progress tables which are never touched.
  await tx.delete(zappyKnowledgeSources).where(eq(zappyKnowledgeSources.courseId, plan.course.id))
  for (const row of sourceRows) {
    if (!['rich-text', 'video-vtt', 'student-notebook'].includes(row.sourceType))
      throw new Error('Tipo de fonte do Zappy desconhecido')
    const authority = await repository.sourceAuthorityForRef(row.sourceRef)
    if (
      !authority ||
      authority.courseId !== sourceCourseId ||
      authority.blockRevision !== row.blockRevision ||
      !['ready', 'empty'].includes(row.status)
    ) {
      unavailable++
      continue
    }
    const match = /^(block|attachment):([a-f0-9-]+)$/i.exec(row.sourceRef)
    if (!match) throw new Error('Referência do Zappy inválida')
    const id = match[1] === 'block' ? mirror.blocks[match[2]!] : mirror.attachments[match[2]!]
    if (!id) throw new Error('Fonte do Zappy sem equivalente adulto')
    const ref = `${match[1]}:${id}`
    const target = await repository.sourceAuthorityForRef(ref)
    if (!target || target.courseId !== plan.course.id)
      throw new Error('Autoridade do Zappy adulto inválida')
    const chunks = await tx
      .select({
        content: zappyKnowledgeChunks.content,
        normalizedText: zappyKnowledgeChunks.normalizedText,
      })
      .from(zappyKnowledgeChunks)
      .where(eq(zappyKnowledgeChunks.sourceId, row.id))
      .orderBy(asc(zappyKnowledgeChunks.position))
    const saved = await repository.upsert({
      ...target,
      sourceRef: ref,
      sourceType: row.sourceType as ZappyKnowledgeSourceType,
      contentHash: row.contentHash,
      status: row.status as 'ready' | 'empty',
      chunks,
      now: new Date(),
    })
    if (!saved) throw new Error('A fonte do Zappy mudou durante a sincronização')
    copied++
  }
  return { copied, unavailable }
}
