import type { Project } from './project'
import type { ProAssistanceMeta } from './proProject'

export const PRO_ASSISTANCE_LIMITS = Object.freeze({
  briefing: 2000,
  decisions: 20,
  decisionText: 1000,
  questions: 10,
  questionText: 500,
  answer: 1000,
  id: 80,
  bytes: 32 * 1024,
})

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
function exactKeys(value: Record<string, unknown>, keys: readonly string[]): void {
  if (Object.keys(value).some((key) => !keys.includes(key))) fail()
}
function fail(): never {
  throw new Error(
    'As decisões deste projeto têm formato ou tamanho incompatível. O original foi preservado.',
  )
}
function bounded(value: unknown, max: number, required = false): string {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) fail()
  return value
}

/** Strict, lossless reader: future versions/fields are rejected, never silently trimmed. */
export function parseProAssistance(value: unknown): ProAssistanceMeta {
  if (!record(value) || value.version !== 1) fail()
  exactKeys(value, ['version', 'briefing', 'decisions', 'questions'])
  const result: ProAssistanceMeta = { version: 1 }
  if (value.briefing !== undefined)
    result.briefing = bounded(value.briefing, PRO_ASSISTANCE_LIMITS.briefing)
  if (value.decisions !== undefined) {
    if (!Array.isArray(value.decisions) || value.decisions.length > PRO_ASSISTANCE_LIMITS.decisions)
      fail()
    const ids = new Set<string>()
    result.decisions = value.decisions.map((entry) => {
      if (!record(entry)) fail()
      exactKeys(entry, ['id', 'text', 'provenance', 'confirmed'])
      const id = bounded(entry.id, PRO_ASSISTANCE_LIMITS.id, true)
      if (ids.has(id)) fail()
      ids.add(id)
      const text = bounded(entry.text, PRO_ASSISTANCE_LIMITS.decisionText, true)
      const provenance = entry.provenance
      if (
        provenance !== 'learner' &&
        provenance !== 'pensa' &&
        provenance !== 'kit' &&
        provenance !== 'suggestion'
      )
        fail()
      if (typeof entry.confirmed !== 'boolean') fail()
      return { id, text, provenance, confirmed: entry.confirmed }
    })
  }
  if (value.questions !== undefined) {
    if (!Array.isArray(value.questions) || value.questions.length > PRO_ASSISTANCE_LIMITS.questions)
      fail()
    const ids = new Set<string>()
    result.questions = value.questions.map((entry) => {
      if (!record(entry)) fail()
      exactKeys(entry, ['id', 'text', 'status', 'answer', 'revisionHash'])
      const id = bounded(entry.id, PRO_ASSISTANCE_LIMITS.id, true)
      if (ids.has(id)) fail()
      ids.add(id)
      const text = bounded(entry.text, PRO_ASSISTANCE_LIMITS.questionText, true)
      const status = entry.status
      if (status !== 'pending' && status !== 'answered' && status !== 'cancelled') fail()
      const answer =
        entry.answer === undefined ? undefined : bounded(entry.answer, PRO_ASSISTANCE_LIMITS.answer)
      if (status === 'answered' && !answer?.trim()) fail()
      if (
        entry.revisionHash !== undefined &&
        (typeof entry.revisionHash !== 'string' || !/^[a-f0-9]{64}$/.test(entry.revisionHash))
      )
        fail()
      return {
        id,
        text,
        status,
        ...(answer !== undefined ? { answer } : {}),
        ...(entry.revisionHash !== undefined ? { revisionHash: entry.revisionHash as string } : {}),
      }
    })
  }
  if (new TextEncoder().encode(JSON.stringify(result)).byteLength > PRO_ASSISTANCE_LIMITS.bytes)
    fail()
  return result
}

export function getProAssistance(project: Project): ProAssistanceMeta {
  return project.proMeta?.assistance
    ? parseProAssistance(project.proMeta.assistance)
    : { version: 1 }
}

/** Canonical context digest, deliberately independent of the source/artifact revision. */
export async function digestProAssistance(value: ProAssistanceMeta): Promise<string> {
  const parsed = parseProAssistance(value)
  const canonical = {
    version: 1,
    briefing: parsed.briefing ?? '',
    decisions: [...(parsed.decisions ?? [])].sort((a, b) =>
      a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
    ),
    questions: [...(parsed.questions ?? [])].sort((a, b) =>
      a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
    ),
  }
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(canonical))),
    ),
    (byte) => byte.toString(16).padStart(2, '0'),
  ).join('')
}
