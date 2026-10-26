/** Counts contain no child narrative or private creation data. */
export interface PensaFunnelCounts {
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
export interface PensaFunnelReader {
  funnel(since: Date, until: Date, audience?: 'kids' | 'adult'): Promise<PensaFunnelCounts>
}
