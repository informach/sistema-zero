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
