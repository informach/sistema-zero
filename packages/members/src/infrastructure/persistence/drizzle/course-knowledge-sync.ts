import { asc, eq } from 'drizzle-orm'
import {
  type CourseSnapshot,
  type CourseSyncPlan,
  same,
} from '../../../domain/course-publication/course-sync'
import type { PreparedCourseKnowledge } from '../../../domain/course-publication/knowledge'
import type { ZappyKnowledgeSourceType } from '../../../domain/ports/zappy-knowledge-repository.port'
import { prepareZappyKnowledgeSource } from '../../../domain/zappy/knowledge-source'
import type { Database } from './db'
import { zappyKnowledgeChunks, zappyKnowledgeSources } from './schema'
import { DrizzleZappyKnowledgeRepository } from './zappy-knowledge.repository'

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]

/** Reuse only authoritative teaching extracts. No learner conversations or submissions. */
export async function syncCourseKnowledge(
  tx: Transaction,
  plan: CourseSyncPlan,
  source: CourseSnapshot,
  checkOnly = false,
  prepared?: PreparedCourseKnowledge,
) {
  const sourceCourseId = source.course.id
  if (plan.operation === 'promote-kids' && !prepared)
    throw new Error('A promoção exige material do Zappy preparado para produção')
  const expected = new Map<string, ZappyKnowledgeSourceType>()
  for (const lesson of source.lessons) {
    for (const block of lesson.published.blocks) {
      if (block.content.kind === 'video') expected.set(`block:${block.id}`, 'video-vtt')
      if (['rich_text', 'dialogue'].includes(block.content.kind))
        expected.set(`block:${block.id}`, 'rich-text')
    }
    for (const attachment of lesson.published.attachments)
      if (attachment.zappyStudentNotebook)
        expected.set(`attachment:${attachment.id}`, 'student-notebook')
  }
  if (
    prepared &&
    (prepared.sourceHash !== plan.sourceHash ||
      prepared.sources.length !== expected.size ||
      new Set(prepared.sources.map((row) => `${row.sourceRef}:${row.sourceType}`)).size !==
        expected.size)
  )
    throw new Error('As fontes preparadas do Zappy não correspondem à origem')
  const sourceRows = prepared
    ? []
    : await tx
        .select()
        .from(zappyKnowledgeSources)
        .where(eq(zappyKnowledgeSources.courseId, sourceCourseId))
  const preparedByRef = new Map(
    prepared?.sources.map((row) => [`${row.sourceRef}:${row.sourceType}`, row]),
  )
  const sourceByRef = new Map(sourceRows.map((row) => [`${row.sourceRef}:${row.sourceType}`, row]))
  const mirror = plan.course.metadata?.contentMirror as {
    blocks: Record<string, string>
    attachments: Record<string, string>
  }
  const repository = new DrizzleZappyKnowledgeRepository(tx)
  const chunksFor = (sourceId: string) =>
    tx
      .select({
        content: zappyKnowledgeChunks.content,
        normalizedText: zappyKnowledgeChunks.normalizedText,
      })
      .from(zappyKnowledgeChunks)
      .where(eq(zappyKnowledgeChunks.sourceId, sourceId))
      .orderBy(asc(zappyKnowledgeChunks.position))
  let copied = 0
  const ready = []
  for (const [ref, type] of expected) {
    if (prepared) {
      const entry = preparedByRef.get(`${ref}:${type}`)
      const authority =
        plan.operation === 'promote-kids'
          ? {
              courseId: sourceCourseId,
              blockId: ref.startsWith('block:') ? ref.slice('block:'.length) : null,
            }
          : await repository.sourceAuthorityForRef(ref)
      if (
        !entry ||
        entry.sourceType !== type ||
        !authority ||
        authority.courseId !== sourceCourseId
      )
        throw new Error('Fonte preparada do Zappy sem autoridade na origem')
      const data = prepareZappyKnowledgeSource(type, entry.content)
      if (data.status !== 'ready' && data.status !== 'empty')
        throw new Error('O conteúdo preparado do Zappy ainda não está pronto')
      ready.push({
        sourceRef: ref,
        sourceType: type,
        blockId: authority.blockId,
        contentHash: data.contentHash,
        status: data.status,
        chunks: data.chunks,
      })
      continue
    }
    const row = sourceByRef.get(`${ref}:${type}`)
    const authority = await repository.sourceAuthorityForRef(ref)
    if (
      !row ||
      row.sourceType !== type ||
      !authority ||
      authority.courseId !== sourceCourseId ||
      authority.blockRevision !== row.blockRevision ||
      !['ready', 'empty'].includes(row.status)
    )
      throw new Error(
        `O conteúdo do Zappy ainda não está pronto: ${type}, ${ref}. Prepare a transcrição ou o PDF antes de publicar`,
      )
    const chunks = await chunksFor(row.id)
    if ((row.status === 'ready' && !chunks.length) || (row.status === 'empty' && chunks.length))
      throw new Error(`Os trechos do Zappy não correspondem à fonte: ${ref}`)
    ready.push({ ...row, chunks })
  }
  const current = await tx
    .select()
    .from(zappyKnowledgeSources)
    .where(eq(zappyKnowledgeSources.courseId, plan.course.id))
  let unchanged = current.length === ready.length
  for (const row of ready) {
    const id = row.blockId
      ? mirror.blocks[row.blockId]
      : mirror.attachments[row.sourceRef.slice('attachment:'.length)]
    const ref = `${row.blockId ? 'block' : 'attachment'}:${id}`
    const target = await repository.sourceAuthorityForRef(ref)
    const indexed = current.find(
      (item) => item.sourceRef === ref && item.sourceType === row.sourceType,
    )
    if (
      !target ||
      !indexed ||
      target.courseId !== plan.course.id ||
      indexed.lessonId !== target.lessonId ||
      indexed.blockId !== target.blockId ||
      indexed.blockRevision !== target.blockRevision ||
      indexed.contentHash !== row.contentHash ||
      indexed.status !== row.status
    )
      unchanged = false
    else if (!same(await chunksFor(indexed.id), row.chunks)) unchanged = false
  }
  if (unchanged) return { copied: 0, unavailable: 0, unchanged: true }
  if (checkOnly) return { copied: 0, unavailable: 0, unchanged: false }
  // These are derived teaching indexes, unlike the progress tables which are never touched.
  await tx.delete(zappyKnowledgeSources).where(eq(zappyKnowledgeSources.courseId, plan.course.id))
  for (const row of ready) {
    if (!['rich-text', 'video-vtt', 'student-notebook'].includes(row.sourceType))
      throw new Error('Tipo de fonte do Zappy desconhecido')
    const match = /^(block|attachment):([a-f0-9-]+)$/i.exec(row.sourceRef)
    if (!match) throw new Error('Referência do Zappy inválida')
    const id = match[1] === 'block' ? mirror.blocks[match[2]!] : mirror.attachments[match[2]!]
    if (!id) throw new Error('Fonte do Zappy sem equivalente adulto')
    const ref = `${match[1]}:${id}`
    const target = await repository.sourceAuthorityForRef(ref)
    if (!target || target.courseId !== plan.course.id)
      throw new Error('Autoridade do Zappy adulto inválida')
    const saved = await repository.upsert({
      ...target,
      sourceRef: ref,
      sourceType: row.sourceType as ZappyKnowledgeSourceType,
      contentHash: row.contentHash,
      status: row.status as 'ready' | 'empty',
      chunks: row.chunks,
      now: new Date(),
    })
    if (!saved) throw new Error('A fonte do Zappy mudou durante a sincronização')
    copied++
  }
  return { copied, unavailable: 0, unchanged: false }
}
