import { ZAPPY_KNOWLEDGE_BACKFILL_MIN_INTERVAL_MS } from '@sistemazero/core/zappy'
import type { AiUsageStatsView } from './types'

export interface ZappyMetricsView {
  questions: number
  useful: number
  notUseful: number
  refusals: number
  needsContext: number
  quota: number
  errors: number
  averageLatencyMs: number
}

export interface ZappyKnowledgeReportView {
  publishedKidsLessons: number
  readySources: number
  errorSources: number
  pendingSources: number
  lessonsWithVideoWithoutTranscript: Array<{
    lessonId: string
    lessonTitle: string
    courseTitle: string
  }>
  coursesWithoutStudentNotebook: Array<{ courseId: string; courseTitle: string }>
  failedSources: Array<{
    sourceRef: string
    sourceType: 'video-vtt' | 'rich-text' | 'student-notebook'
    courseTitle: string
    lessonTitle: string
    error: string
  }>
}

export interface AiUsagePanelLoaders {
  usage(month: string): Promise<AiUsageStatsView>
  metrics(month: string): Promise<ZappyMetricsView>
  knowledge(): Promise<ZappyKnowledgeReportView>
}

export interface AiUsagePanelResults {
  usage: PromiseSettledResult<AiUsageStatsView>
  metrics: PromiseSettledResult<ZappyMetricsView>
  knowledge: PromiseSettledResult<ZappyKnowledgeReportView>
}

export interface ZappyBackfillSummary {
  indexed: number
  deleted: number
  extracted: number
  failed: number
  nextCursor: string | null
  done: boolean
}

export async function runZappyBackfillBatches(input: {
  initialCursor?: string
  step(cursor?: string): Promise<ZappyBackfillSummary>
  checkpoint(cursor: string | null, processed: number): void
  waitBetweenBatches?(minimumDelayMs: number): Promise<void>
}): Promise<ZappyBackfillSummary> {
  let cursor = input.initialCursor
  const seen = new Set(cursor ? [cursor] : [])
  const total: ZappyBackfillSummary = {
    indexed: 0,
    deleted: 0,
    extracted: 0,
    failed: 0,
    nextCursor: cursor ?? null,
    done: false,
  }
  while (!total.done) {
    const batch = await input.step(cursor)
    total.indexed += batch.indexed
    total.deleted += batch.deleted
    total.extracted += batch.extracted
    total.failed += batch.failed
    total.nextCursor = batch.nextCursor
    total.done = batch.done
    const processed = total.indexed + total.extracted + total.failed
    if (batch.done) {
      input.checkpoint(null, processed)
      break
    }
    if (!batch.nextCursor || seen.has(batch.nextCursor)) {
      throw new Error('Cursor inválido no backfill do Zappy')
    }
    cursor = batch.nextCursor
    seen.add(cursor)
    input.checkpoint(cursor, processed)
    await (input.waitBetweenBatches
      ? input.waitBetweenBatches(ZAPPY_KNOWLEDGE_BACKFILL_MIN_INTERVAL_MS)
      : new Promise<void>((resolve) =>
          setTimeout(resolve, ZAPPY_KNOWLEDGE_BACKFILL_MIN_INTERVAL_MS),
        ))
  }
  return total
}

export function zappyBackfillNotice(
  result: Pick<ZappyBackfillSummary, 'failed'> & Partial<Omit<ZappyBackfillSummary, 'failed'>>,
): {
  kind: 'success' | 'warning'
  message: string
} {
  return result.failed === 0
    ? { kind: 'success', message: 'Base do Zappy sincronizada.' }
    : {
        kind: 'warning',
        message: `Base sincronizada parcialmente: ${result.failed} ${result.failed === 1 ? 'fonte precisa' : 'fontes precisam'} de correção.`,
      }
}

/** Isola as três fontes para uma falha não descartar os demais painéis. */
export async function loadAiUsagePanels(
  month: string,
  loaders: AiUsagePanelLoaders,
): Promise<AiUsagePanelResults> {
  const [usage, metrics, knowledge] = await Promise.allSettled([
    loaders.usage(month),
    loaders.metrics(month),
    loaders.knowledge(),
  ])
  return { usage, metrics, knowledge }
}
