import { and, eq, inArray, type SQL, sql } from 'drizzle-orm'
import {
  reconcileStudioChainEnvironment,
  type StudioChainCandidate,
} from '../../../domain/studio/chain-environment'
import type { Database } from './db'
import { lessonBlocks, lessons, studioCourseChains, studioLessonBaselines } from './schema'
import { JAVASCRIPT_TRIM_CHARACTERS } from './text-normalization'

/** Project only environment keys in PostgreSQL: never transfer sources/assets to this check. */
function environmentProjection(project: SQL): SQL<unknown> {
  return sql`case
    when ${project} is null or ${project} = 'null'::jsonb then '{"formatVersion":2}'::jsonb
    when jsonb_typeof(${project}) <> 'object' then ${project}
    else (select coalesce(jsonb_object_agg(key, case
      when key = 'proMeta' and jsonb_typeof(value) = 'object'
        then jsonb_build_object('templateId', value->'templateId')
      when key = 'runtime' and jsonb_typeof(value) = 'object'
        then jsonb_build_object('profileId', value->'profileId', 'releaseId', value->'releaseId',
          'manifestSha256', value->'manifestSha256')
      when key = 'python' then 'true'::jsonb
      else value end), '{}'::jsonb)
      from jsonb_each(${project}) where key in
        ('formatVersion', 'programmingLanguage', 'kind', 'runtime', 'proMeta', 'python'))
    end`
}

export async function findStudioBlockChain(db: Database, blockId: string) {
  const [row] = await db
    .select({
      chain: sql<
        string | null
      >`btrim(${lessonBlocks.content}->>'chain', ${JAVASCRIPT_TRIM_CHARACTERS})`,
      project: environmentProjection(sql`${lessonBlocks.content}->'initialProject'`),
    })
    .from(lessonBlocks)
    .where(and(eq(lessonBlocks.id, blockId), eq(lessonBlocks.kind, 'studio')))
  return row?.chain ? [{ chain: row.chain, project: row.project }] : []
}

/** Preserve legacy chain names before parent DELETE cascades remove their last evidence. */
export async function preserveStudioChainsForLessons(
  db: Database,
  courseId: string,
  lessonIds: string[],
) {
  if (!lessonIds.length) return
  const blocks = await db
    .selectDistinct({
      chain: sql<
        string | null
      >`btrim(${lessonBlocks.content}->>'chain', ${JAVASCRIPT_TRIM_CHARACTERS})`,
    })
    .from(lessonBlocks)
    .where(and(inArray(lessonBlocks.lessonId, lessonIds), eq(lessonBlocks.kind, 'studio')))
  const baselines = await db
    .selectDistinct({
      chain: sql<
        string | null
      >`btrim(${studioLessonBaselines.configuration}->>'chain', ${JAVASCRIPT_TRIM_CHARACTERS})`,
    })
    .from(studioLessonBaselines)
    .where(
      and(
        eq(studioLessonBaselines.courseId, courseId),
        inArray(studioLessonBaselines.lessonId, lessonIds),
      ),
    )
  const retiring = [...new Set([...blocks, ...baselines].map((row) => row.chain))]
    .filter((chain): chain is string => Boolean(chain))
    .map((chain) => ({ chain, project: null }))
  await claimStudioChains(db, courseId, [], retiring)
}

/** Caller owns the course row lock and includes this call in the content-write transaction. */
export async function claimStudioChains(
  db: Database,
  courseId: string,
  candidates: StudioChainCandidate[],
  retiring: StudioChainCandidate[] = [],
) {
  const chains = [...new Set([...candidates, ...retiring].map((item) => item.chain))]
  if (!chains.length) return
  const registered = await db
    .select()
    .from(studioCourseChains)
    .where(
      and(eq(studioCourseChains.courseId, courseId), inArray(studioCourseChains.chain, chains)),
    )
  const missing = chains.filter((chain) => !registered.some((row) => row.chain === chain))
  const history = new Map<string, unknown[]>()
  if (missing.length) {
    const blockChain = sql<string>`btrim(${lessonBlocks.content}->>'chain', ${JAVASCRIPT_TRIM_CHARACTERS})`
    const baselineChain = sql<string>`btrim(${studioLessonBaselines.configuration}->>'chain', ${JAVASCRIPT_TRIM_CHARACTERS})`
    // Archived blocks and immutable admissions are evidence too. Only references cross the DB.
    const blocks = await db
      .selectDistinct({
        chain: blockChain,
        project: environmentProjection(sql`${lessonBlocks.content}->'initialProject'`),
      })
      .from(lessonBlocks)
      .innerJoin(lessons, eq(lessons.id, lessonBlocks.lessonId))
      .where(
        and(
          eq(lessons.courseId, courseId),
          eq(lessonBlocks.kind, 'studio'),
          inArray(blockChain, missing),
        ),
      )
    const baselines = await db
      .selectDistinct({
        chain: baselineChain,
        project: environmentProjection(
          sql`${studioLessonBaselines.configuration}->'initialProject'`,
        ),
      })
      .from(studioLessonBaselines)
      .where(and(eq(studioLessonBaselines.courseId, courseId), inArray(baselineChain, missing)))
    for (const row of [...blocks, ...baselines])
      history.set(row.chain, [...(history.get(row.chain) ?? []), row.project])
  }
  for (const chain of chains) {
    const existing = registered.find((row) => row.chain === chain)
    const environment = reconcileStudioChainEnvironment(
      chain,
      existing?.environment,
      history.get(chain) ??
        retiring.filter((item) => item.chain === chain).map((item) => item.project),
      candidates.filter((item) => item.chain === chain).map((item) => item.project),
    )
    if (!existing) await db.insert(studioCourseChains).values({ courseId, chain, environment })
  }
}
