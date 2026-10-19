import type { CleanupShowcaseArtifactsArgs } from './studio-artifact-gateway.port'

export interface StudioCleanupDelivery {
  threadId: string
  payload: CleanupShowcaseArtifactsArgs
}

/** Immutable terminal cleanup payloads survive both restarts and physical thread deletion. */
export interface StudioCleanupRepository {
  claim(now: Date, audience?: 'kids' | 'adult'): Promise<StudioCleanupDelivery | null>
  acknowledge(threadId: string, now: Date): Promise<void>
}
