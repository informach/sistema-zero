import type { StudioAiActor, StudioAiFundingSource } from '../ai-credits'
import type { StudioProArtifact, StudioProValidationIdentity } from './pro-artifact'
import type { StudioProAssistanceJournal, StudioProAssistanceRequest } from './pro-assistance'
import type { StudioProChange, StudioProRevision } from './pro-revision'
import type { StudioPythonBuilderPolicyResult } from './python-builder-authorization'
import type { StudioPythonBuilderPreview } from './python-builder-preview'
import type { StudioPythonPreviewReference } from './python-preview'

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
export type StudioProBuilderPreview =
  | {
      kind?: 'javascript'
      artifact: StudioProArtifact
      revisionHash: string
      validation: StudioProValidationIdentity
    }
  | StudioPythonBuilderPreview
export function studioProBuilderPreviewExpiresAt(preview: StudioProBuilderPreview) {
  return preview.kind === 'python' ? preview.reference.expiresAt : preview.artifact.expiresAt
}
export interface StudioProBuilderResult {
  change: StudioProChange
  revisionHash: string
  plan: string[]
  evidence: StudioProBuilderEvidence[]
  /** Missing on retained legacy results; a screenshot is never used as a game URL. */
  preview?: StudioProBuilderPreview
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
  /** Private validation payload, also used within repository-to-service authorization. Never a prompt. */
  binaries?: Record<string, { base64: string; sha256: string }>
  /** Fresh internal lease/policy check; never a bearer grant or public project metadata. */
  authorization?: {
    policy: StudioPythonBuilderPolicyResult
    revisionHash: string
    executionRevision: string
    parentOrigin: string
  }
  /** Repository-to-service payload, consumed before returning the policy decision. */
  validationLease?: { revisionHash: string; parentOrigin: string }
  /** Repository-to-service generation scope; consumed before returning to the BFF. */
  generationLease?: { revisionHash: string; parentOrigin: string }
  /** Repository-to-service proposal scope, independent of an executor lease. */
  proposalScope?: { revisionHash: string; parentOrigin: string }
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
    programmingLanguage?: 'javascript' | 'python',
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
    input: { id: string; projectId: string; version: number; revisionHash: string },
    signal?: AbortSignal,
  ): Promise<{ allowed: boolean; reason?: string }>
  authorizePythonPreview?(
    input: {
      id: string
      projectId: string
      version: number
      revisionHash: string
      preview: { id: string; sha256: string }
    },
    signal: AbortSignal,
  ): Promise<StudioPythonPreviewReference>
  removeProject?(projectId: string, signal?: AbortSignal): Promise<void>
  cancel(input: { id: string; projectId: string }): Promise<StudioProBuilderView | null>
}
export type StudioProBuilderCommand =
  | {
      operation: 'authorize-proposal'
      id: string
      projectId: string
      version: number
      revisionHash: string
      purpose: 'apply' | 'preview'
      preview?: { id: string; sha256: string }
    }
  | {
      operation: 'create'
      id: string
      objective: string
      model: string
      base: StudioProRevision
      binaries: Record<string, { base64: string; sha256: string }>
      request?: StudioProAssistanceRequest
      /** Server-captured preview origin, never an executor destination. */
      parentOrigin: string
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
      operation: 'authorize-generation'
      id: string
      projectId: string
      token: string
      version: number
      revisionHash: string
    }
  | {
      operation: 'authorize-validation'
      id: string
      projectId: string
      token: string
      version: number
      revisionHash: string
      runtimeOperation: 'analyze' | 'execute'
    }
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
    signal?: AbortSignal,
  ): Promise<StudioProBuilderClaim | null>
}
