/** Aggregate counts only; no child's idea or conversation enters the admin view. */
export interface PensaFunnelView {
  days: number
  since: string
  projects: number
  definitionStarted: number
  draftReady: number
  planAccepted: number
  setupCompleted: number
  firstMissionCompleted: number
  constructionCompleted: number
  projectCompleted: number
  pendingChoices: number
  adaptationsAccepted: number
}

export const PENSA_FUNNEL_PERIODS = [7, 30, 90] as const
export type PensaFunnelPeriod = (typeof PENSA_FUNNEL_PERIODS)[number]

export function isPensaFunnelPeriod(value: unknown): value is PensaFunnelPeriod {
  return PENSA_FUNNEL_PERIODS.some((period) => period === value)
}

export interface PensaFunnelStage {
  key:
    | 'projects'
    | 'definitionStarted'
    | 'draftReady'
    | 'planAccepted'
    | 'firstMissionCompleted'
    | 'constructionCompleted'
    | 'projectCompleted'
  label: string
  count: number
  ofProjects: number | null
  lost: number
}
const STAGES: ReadonlyArray<Pick<PensaFunnelStage, 'key' | 'label'>> = [
  { key: 'projects', label: 'Começaram um projeto' },
  { key: 'definitionStarted', label: 'Contaram a ideia' },
  { key: 'draftReady', label: 'Receberam o plano completo' },
  { key: 'planAccepted', label: 'Aceitaram o plano' },
  { key: 'firstMissionCompleted', label: 'Concluíram a primeira funcionalidade' },
  { key: 'constructionCompleted', label: 'Concluíram a construção' },
  { key: 'projectCompleted', label: 'Conferiram o jogo inteiro' },
]

export function pensaFunnelStages(view: PensaFunnelView): PensaFunnelStage[] {
  let previous = view.projects
  return STAGES.map((stage) => {
    const count = view[stage.key]
    const lost = Math.max(0, previous - count)
    previous = count
    return {
      ...stage,
      count,
      ofProjects: view.projects > 0 ? Math.round((count / view.projects) * 100) : null,
      lost,
    }
  })
}
