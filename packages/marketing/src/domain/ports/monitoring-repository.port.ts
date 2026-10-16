import type {
  ConfigureMonitoring,
  MonitoringConfig,
  MonitoringObservation,
  MonitoringStatus,
  MonitoringView,
} from '@sistemazero/marketing-contracts'
import type { FeedResult } from '../intelligence/feed'
export type MonitoringJob = {
  projectId: string
  watchlistId: string
  ownerId: string
  leaseToken: string
  version: number
  config: MonitoringConfig
  etag: string | null
  attempt: number
}
export interface MonitoringRepository {
  overview(
    actorId: string,
    projectId: string,
  ): Promise<import('@sistemazero/marketing-contracts').MonitoringOverview>
  status(
    actorId: string,
    projectId: string,
    watchlistId: string,
    before?: string,
  ): Promise<MonitoringStatus>
  configure(
    actorId: string,
    projectId: string,
    watchlistId: string,
    input: ConfigureMonitoring,
    hash: string,
  ): Promise<MonitoringView>
  observe(
    actorId: string,
    projectId: string,
    watchlistId: string,
    input: MonitoringObservation,
    hash: string,
  ): Promise<MonitoringView>
  claim(): Promise<MonitoringJob | null>
  finish(
    job: MonitoringJob,
    outcome: { result: FeedResult } | { error: string; retryable: boolean; retryAfterMs?: number },
  ): Promise<boolean>
}
