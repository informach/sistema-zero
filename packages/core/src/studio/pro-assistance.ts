/** Small, versioned assistance metadata. It never grants permissions or replaces a project. */
export interface StudioProAssistanceRequest {
  version: 1
  intent: 'change'
  scope: 'selection' | 'part' | 'game'
  criteria: string[]
  sourceMessageId?: string
  diagnostic?: string
  /** Observed editor diagnostics, not a successful build or a proven runtime cause. */
  baseline?: {
    revisionHash: string
    source: 'typescript'
    diagnostics: Array<{ path: string; line: number; message: string; sourceHash: string }>
  }
  selection?: { path: string; startLine: number; endLine: number; sourceHash: string }
  decisions?: { hash: string; summary: string }
  /** Supplied by the authenticated host, never accepted from the browser. */
  mission?: { id: string; snapshotHash: string; summary: string }
}

export const STUDIO_PRO_ASSISTANCE_LIMITS = {
  requestBytes: 8_192,
  criteria: 6,
  criterionChars: 300,
  diagnosticChars: 2_000,
  decisionSummaryChars: 2_000,
  events: 128,
  eventBytes: 1_024,
  pageSize: 5,
  maxPreviewRefreshes: 3,
} as const

export interface StudioProAssistanceEvent {
  sequence: number
  at: string
  kind:
    | 'created'
    | 'generating'
    | 'validating'
    | 'queued'
    | 'review'
    | 'failed'
    | 'cancelled'
    | 'discarded'
    | 'preview'
    | 'preview-failed'
}

export interface StudioProAssistanceJournal {
  version: 1
  request: StudioProAssistanceRequest
  disposition: 'pending' | 'discarded'
  events: StudioProAssistanceEvent[]
  previewRefreshes: number
  previewError?: string
}

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
const hexDigest = /^[a-f0-9]{64}$/
const sourceDigest = /^(?:[a-f0-9]{64}|(?:sha256-)?[A-Za-z0-9+/]{43}=)$/
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
const keys = (value: Record<string, unknown>, allowed: readonly string[]) =>
  Object.keys(value).every((key) => allowed.includes(key))
const text = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max
const positive = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0

/** Strict so a newer sender cannot silently lose scope, criteria or provenance. */
export function isStudioProAssistanceRequest(value: unknown): value is StudioProAssistanceRequest {
  if (
    !object(value) ||
    !keys(value, [
      'version',
      'intent',
      'scope',
      'criteria',
      'sourceMessageId',
      'diagnostic',
      'baseline',
      'selection',
      'decisions',
      'mission',
    ]) ||
    value.version !== 1 ||
    value.intent !== 'change' ||
    !['selection', 'part', 'game'].includes(String(value.scope)) ||
    !Array.isArray(value.criteria) ||
    value.criteria.length > STUDIO_PRO_ASSISTANCE_LIMITS.criteria ||
    !value.criteria.every((item) => text(item, STUDIO_PRO_ASSISTANCE_LIMITS.criterionChars))
  )
    return false
  if (
    value.sourceMessageId !== undefined &&
    (typeof value.sourceMessageId !== 'string' || !uuid.test(value.sourceMessageId))
  )
    return false
  if (
    value.diagnostic !== undefined &&
    !text(value.diagnostic, STUDIO_PRO_ASSISTANCE_LIMITS.diagnosticChars)
  )
    return false
  if (value.baseline !== undefined) {
    const item = value.baseline
    if (
      !object(item) ||
      !keys(item, ['revisionHash', 'source', 'diagnostics']) ||
      typeof item.revisionHash !== 'string' ||
      !hexDigest.test(item.revisionHash) ||
      item.source !== 'typescript' ||
      !Array.isArray(item.diagnostics) ||
      item.diagnostics.length > 6 ||
      !item.diagnostics.every(
        (entry) =>
          object(entry) &&
          keys(entry, ['path', 'line', 'message', 'sourceHash']) &&
          text(entry.path, 240) &&
          positive(entry.line) &&
          text(entry.message, 400) &&
          typeof entry.sourceHash === 'string' &&
          sourceDigest.test(entry.sourceHash),
      )
    )
      return false
  }
  if (value.selection !== undefined) {
    const item = value.selection
    if (
      !object(item) ||
      !keys(item, ['path', 'startLine', 'endLine', 'sourceHash']) ||
      !text(item.path, 240) ||
      !positive(item.startLine) ||
      !positive(item.endLine) ||
      item.endLine < item.startLine ||
      typeof item.sourceHash !== 'string' ||
      !sourceDigest.test(item.sourceHash)
    )
      return false
  }
  if (value.scope === 'selection' && !value.selection) return false
  if (value.decisions !== undefined) {
    const item = value.decisions
    if (
      !object(item) ||
      !keys(item, ['hash', 'summary']) ||
      typeof item.hash !== 'string' ||
      !hexDigest.test(item.hash) ||
      !text(item.summary, STUDIO_PRO_ASSISTANCE_LIMITS.decisionSummaryChars)
    )
      return false
  }
  if (value.mission !== undefined) {
    const item = value.mission
    if (
      !object(item) ||
      !keys(item, ['id', 'snapshotHash', 'summary']) ||
      typeof item.id !== 'string' ||
      !uuid.test(item.id) ||
      typeof item.snapshotHash !== 'string' ||
      !hexDigest.test(item.snapshotHash) ||
      !text(item.summary, 900)
    )
      return false
  }
  return (
    new TextEncoder().encode(JSON.stringify(value)).byteLength <=
    STUDIO_PRO_ASSISTANCE_LIMITS.requestBytes
  )
}

/** Canonical field order also makes retry equality independent of JSON property ordering. */
export function parseStudioProAssistanceRequest(value: unknown): StudioProAssistanceRequest {
  if (!isStudioProAssistanceRequest(value))
    throw new Error('O pedido de assistência não é compatível com esta versão.')
  return {
    version: 1,
    intent: 'change',
    scope: value.scope,
    criteria: [...value.criteria],
    ...(value.sourceMessageId ? { sourceMessageId: value.sourceMessageId } : {}),
    ...(value.diagnostic ? { diagnostic: value.diagnostic } : {}),
    ...(value.baseline
      ? {
          baseline: {
            revisionHash: value.baseline.revisionHash,
            source: value.baseline.source,
            diagnostics: value.baseline.diagnostics.map((item) => ({
              path: item.path,
              line: item.line,
              message: item.message,
              sourceHash: item.sourceHash,
            })),
          },
        }
      : {}),
    ...(value.selection
      ? {
          selection: {
            path: value.selection.path,
            startLine: value.selection.startLine,
            endLine: value.selection.endLine,
            sourceHash: value.selection.sourceHash,
          },
        }
      : {}),
    ...(value.decisions
      ? { decisions: { hash: value.decisions.hash, summary: value.decisions.summary } }
      : {}),
    ...(value.mission
      ? {
          mission: {
            id: value.mission.id,
            snapshotHash: value.mission.snapshotHash,
            summary: value.mission.summary,
          },
        }
      : {}),
  }
}

export function createStudioProAssistanceJournal(
  request: StudioProAssistanceRequest | undefined,
  at: string,
): StudioProAssistanceJournal {
  return {
    version: 1,
    request: parseStudioProAssistanceRequest(
      request ?? { version: 1, intent: 'change', scope: 'part', criteria: [] },
    ),
    disposition: 'pending',
    events: [{ sequence: 0, at, kind: 'created' }],
    previewRefreshes: 0,
  }
}

export function appendStudioProAssistanceEvent(
  journal: StudioProAssistanceJournal,
  kind: StudioProAssistanceEvent['kind'],
  at: string,
): StudioProAssistanceJournal {
  const sequence = (journal.events.at(-1)?.sequence ?? -1) + 1
  const event: StudioProAssistanceEvent = { sequence, at, kind }
  return {
    ...journal,
    events: [...journal.events, event].slice(-STUDIO_PRO_ASSISTANCE_LIMITS.events),
  }
}
