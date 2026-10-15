import type { StudioAiActor, StudioAiFundingSource } from '../ai-credits'
import type { StudioProArtifact, StudioProValidationIdentity } from './pro-artifact'
import type { StudioProAssistanceJournal, StudioProAssistanceRequest } from './pro-assistance'
import type { StudioProChange, StudioProRevision } from './pro-revision'

export const STUDIO_PRO_BUILDER_LIMITS = {
  maxObjectiveChars: 2_000,
  maxModelCalls: 3,
  maxValidationCalls: 3,
  deadlineMs: 5 * 60_000,
  leaseMs: 150_000,
  retentionMs: 7 * 24 * 60 * 60_000,
  maxStoredPerAccount: 10,
  maxPayloadBytes: 3_000_000,
} as const
export type StudioProBuilderPhase =
  | 'queued'
  | 'generating'
  | 'validating'
  | 'review'
  | 'failed'
  | 'cancelled'
export interface StudioProBuilderEvidence {
  kind: 'types' | 'build' | 'playtest' | 'capture'
  status: 'passed' | 'failed' | 'unavailable'
  detail: string
  artifactUrl?: string
}
/** Data returned by isolated workers still crosses an untrusted boundary. */
export function isStudioProBuilderEvidence(value: unknown): value is StudioProBuilderEvidence {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const item = value as Record<string, unknown>
  return (
    typeof item.kind === 'string' &&
    ['types', 'build', 'playtest', 'capture'].includes(item.kind) &&
    typeof item.status === 'string' &&
    ['passed', 'failed', 'unavailable'].includes(item.status) &&
    typeof item.detail === 'string' &&
    item.detail.length <= 2000 &&
    (item.artifactUrl === undefined ||
      (typeof item.artifactUrl === 'string' &&
        item.artifactUrl.length <= 2048 &&
        /^https?:\/\//.test(item.artifactUrl)))
  )
}
export interface StudioProBuilderCost {
  source: StudioAiFundingSource
  confirmedMicroUsd: number
  uncertain: boolean
}
export interface StudioProBuilderResult {
  change: StudioProChange
  revisionHash: string
  plan: string[]
  evidence: StudioProBuilderEvidence[]
  /** Missing on retained legacy results; a screenshot is never used as a game URL. */
  preview?: {
    artifact: StudioProArtifact
    revisionHash: string
    validation: StudioProValidationIdentity
  }
}
export interface StudioProBuilderJob {
  id: string
  projectId: string
  objective: string
  model: string
  base: StudioProRevision
  phase: StudioProBuilderPhase
  version: number
  modelCalls: number
  validationCalls: number
  createdAt: string
  deadlineAt: string
  expiresAt: string
  leaseUntil: string | null
  result: StudioProBuilderResult | null
  error: string | null
  cost: StudioProBuilderCost | null
  notes: string[]
  assistance?: StudioProAssistanceJournal | null
}
export interface StudioProBuilderClaim {
  job: StudioProBuilderJob
  token: string | null
  /** Private worker payload, returned only with a validation lease. Never part of prompts. */
  binaries?: Record<string, { base64: string; sha256: string }>
}
/** Polling never retransmits the whole snapshot, private binaries or model/tool notes. */
export type StudioProBuilderView = Omit<StudioProBuilderJob, 'base' | 'notes'> & {
  baseHash: string
  /** Only affected files, for review after reconnecting. */
  beforeFiles: Record<string, string | null>
}
export interface StudioProBuilderPage {
  jobs: StudioProBuilderView[]
  nextCursor: string | null
}
export function studioProBuilderView(job: StudioProBuilderJob): StudioProBuilderView {
  const { base, notes: _notes, ...view } = job
  return {
    ...view,
    baseHash: base.hash,
    beforeFiles: Object.fromEntries(
      (job.result?.change.patches ?? []).map((patch) => [
        patch.path,
        base.files[patch.path] ?? null,
      ]),
    ),
  }
}
export interface StudioProBuilderAdapter {
  availability?(
    templateId: string,
    signal?: AbortSignal,
  ): Promise<{ available: boolean; reason?: string }>
  create(
    input: {
      id: string
      objective: string
      base: StudioProRevision
      binaries: Record<string, { base64: string; sha256: string }>
      request?: StudioProAssistanceRequest
    },
    signal?: AbortSignal,
  ): Promise<StudioProBuilderView>
  latest(projectId: string, signal?: AbortSignal): Promise<StudioProBuilderView | null>
  get?(
    input: { id: string; projectId: string },
    signal?: AbortSignal,
  ): Promise<StudioProBuilderView | null>
  list?(
    input: { projectId: string; before?: string },
    signal?: AbortSignal,
  ): Promise<StudioProBuilderPage>
  discard?(input: {
    id: string
    projectId: string
    version: number
  }): Promise<StudioProBuilderView | null>
  refreshPreview?(
    input: { id: string; projectId: string },
    signal?: AbortSignal,
  ): Promise<StudioProBuilderView | null>
  checkApplication?(
    input: { id: string; projectId: string },
    signal?: AbortSignal,
  ): Promise<{ allowed: boolean; reason?: string }>
  removeProject?(projectId: string, signal?: AbortSignal): Promise<void>
  advance(
    input: { id: string; projectId: string },
    signal?: AbortSignal,
  ): Promise<StudioProBuilderView | null>
  cancel(input: { id: string; projectId: string }): Promise<StudioProBuilderView | null>
}
export type StudioProBuilderCommand =
  | {
      operation: 'create'
      id: string
      objective: string
      model: string
      base: StudioProRevision
      binaries: Record<string, { base64: string; sha256: string }>
      request?: StudioProAssistanceRequest
    }
  | { operation: 'get'; id: string; projectId: string }
  | { operation: 'cancel'; id: string; projectId: string }
  | { operation: 'latest'; projectId: string }
  | { operation: 'remove-project'; projectId: string }
  | { operation: 'discard'; id: string; projectId: string; version: number }
  | { operation: 'preview-claim'; id: string; projectId: string }
  | {
      operation: 'preview-release'
      id: string
      projectId: string
      token: string
      version: number
      error: string
    }
  | {
      operation: 'preview-checkpoint'
      id: string
      projectId: string
      token: string
      version: number
      preview: NonNullable<StudioProBuilderResult['preview']>
      evidence: StudioProBuilderEvidence[]
    }
  | { operation: 'claim'; id: string; projectId: string }
  | {
      operation: 'checkpoint'
      id: string
      projectId: string
      token: string
      version: number
      phase: 'queued' | 'validating' | 'review' | 'failed'
      result: StudioProBuilderResult | null
      error: string | null
      cost: StudioProBuilderCost | null
      notes: string[]
    }
export interface StudioProBuilderRepository {
  purgeExpired(now: Date): Promise<number>
  list(
    actor: StudioAiActor,
    input: { projectId: string; before?: string },
    now: Date,
  ): Promise<StudioProBuilderPage>
  execute(
    actor: StudioAiActor,
    command: StudioProBuilderCommand,
    now: Date,
  ): Promise<StudioProBuilderClaim | null>
}
