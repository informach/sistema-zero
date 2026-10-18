import type { StudioRuntimeSelection } from '@sistemazero/core/studio/project-environment'
import { readStudioRuntimeIdentity } from '@sistemazero/core/studio/runtime-identity'
import { IDE_MODES, type IDEMode } from '../core/modes'

export interface ProjectSummary {
  migrationPending?: boolean
  hasPreservedEdit?: boolean
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
  return { id, name, createdAt, updatedAt, mode, ...projectEnvironmentSummary(raw) }
}
