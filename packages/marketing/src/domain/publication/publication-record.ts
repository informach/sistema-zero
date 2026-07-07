import type { Network, PublicationFormat, PublicationStatus, PublishMode } from './publication'

export interface Publication {
  id: string
  version: number
  contentId: string
  socialAccountId: string | null
  network: Network
  format: PublicationFormat
  caption: string
  title: string | null
  tags: string[]
  coverAssetId: string | null
  scheduledAt: Date | null
  publishMode: PublishMode
  status: PublicationStatus
  attempts: number
  nextAttemptAt: Date | null
  lastError: string | null
  providerSession: Record<string, unknown>
  externalPostId: string | null
  externalUrl: string | null
  publishedAt: Date | null
  reminderSentAt: Date | null
  metricsLastCollectedAt: Date | null
  createdAt: Date
  updatedAt: Date
}
