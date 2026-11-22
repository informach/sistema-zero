import type { StudioRuntimeSelection } from '@sistemazero/core/studio/project-environment'
import { readStudioRuntimeIdentity } from '@sistemazero/core/studio/runtime-identity'
import { IDE_MODES, type IDEMode } from '../core/modes'

export interface ProjectSummary {
  migrationPending?: boolean
  hasPreservedEdit?: boolean
  hasRetainedLegacySource?: true
  id: string
  name: string
  createdAt: number
  updatedAt: number
  mode: IDEMode
  programmingLanguage: 'javascript' | 'python' | 'unknown'
  kind?: 'classic' | 'pro'
  /** Identity only. A list item never authorizes runtime loading or execution. */
  runtime?: StudioRuntimeSelection
  thumbDataUrl?: string
  /**
   * O Pro que veio de "Virar profissional": o id da cópia em blocos guardada na conversão
   * (`proMeta.origin.projectId`). O cartão diz de onde ele veio (proposta aprovada em 21/11/2026).
   */
  originProjectId?: string
}

/** O id da cópia em blocos de um Pro convertido, lido do meta (só a forma do id). */
function originProjectIdOf(raw: Record<string, unknown>): string | undefined {
  if (raw.kind !== 'pro' || !raw.proMeta || typeof raw.proMeta !== 'object') return undefined
  const origin = (raw.proMeta as { origin?: unknown }).origin
  if (!origin || typeof origin !== 'object') return undefined
  const id = (origin as { projectId?: unknown }).projectId
  return typeof id === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(id) ? id : undefined
}

export function projectEnvironmentSummary(
  raw: Record<string, unknown>,
): Pick<ProjectSummary, 'programmingLanguage' | 'kind' | 'runtime'> {
  const kind = raw.kind === 'classic' || raw.kind === 'pro' ? raw.kind : undefined
  if (
    (raw.formatVersion === undefined || raw.formatVersion === 1 || raw.formatVersion === 2) &&
    (raw.programmingLanguage === undefined || raw.programmingLanguage === 'javascript') &&
    raw.runtime === undefined &&
    raw.python === undefined &&
    (raw.kind === undefined || kind)
  )
    return { programmingLanguage: 'javascript', kind: kind ?? 'classic' }
  if (
    raw.formatVersion === 3 &&
    kind &&
    (raw.programmingLanguage === 'javascript' || raw.programmingLanguage === 'python')
  ) {
    const runtime = readStudioRuntimeIdentity(raw.runtime)
    if (runtime) return { programmingLanguage: raw.programmingLanguage, kind, runtime }
  }
  return { programmingLanguage: 'unknown', ...(kind ? { kind } : {}) }
}

export function toProjectSummary(id: string, value: unknown): ProjectSummary | null {
  if (!id || !value || typeof value !== 'object' || Array.isArray(value)) return null
  const raw = value as Record<string, unknown>
  const name =
    typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 200) : 'Sem título'
  const createdAt =
    typeof raw.createdAt === 'number' && Number.isFinite(raw.createdAt) ? raw.createdAt : 0
  const updatedAt =
    typeof raw.updatedAt === 'number' && Number.isFinite(raw.updatedAt) ? raw.updatedAt : createdAt
  const mode = IDE_MODES.includes(raw.mode as IDEMode) ? (raw.mode as IDEMode) : 'blocks'
  const originProjectId = originProjectIdOf(raw)
  return {
    id,
    name,
    createdAt,
    updatedAt,
    mode,
    ...projectEnvironmentSummary(raw),
    ...(originProjectId ? { originProjectId } : {}),
  }
}
