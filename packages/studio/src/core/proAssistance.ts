import { STUDIO_PRO_ASSISTANCE_LIMITS } from '@sistemazero/core/studio/pro-assistance'
import type { EditableStudioProject as Project } from './editableProject'

import type { ProAssistanceMeta } from './proProject'

export { STUDIO_PROJECT_ASSISTANCE_LIMITS as PRO_ASSISTANCE_LIMITS } from '@sistemazero/core/studio/project-pro-metadata'

import { parseStudioProAssistanceMeta as parseProAssistance } from '@sistemazero/core/studio/project-pro-metadata'

export { parseProAssistance }

export function getProAssistance(project: Project): ProAssistanceMeta {
  return project.proMeta?.assistance
    ? parseProAssistance(project.proMeta.assistance)
    : { version: 1 }
}

/** Same learner-confirmed context for explanation, investigation and construction. */
export function proAssistanceSummary(meta: ProAssistanceMeta): string {
  return [
    meta.briefing,
    ...(meta.decisions ?? []).filter((item) => item.confirmed).map((item) => item.text),
    ...(meta.questions ?? [])
      .filter((item) => item.status === 'answered')
      .map((item) => `${item.text} ${item.answer}`),
  ]
    .filter(Boolean)
    .join('\n')
}

export class ProAssistanceSummaryTooLarge extends Error {
  constructor() {
    super(
      'As decisões selecionadas ultrapassam o limite deste pedido. Resuma as notas do projeto antes de continuar.',
    )
    this.name = 'ProAssistanceSummaryTooLarge'
  }
}

export function boundedProAssistanceSummary(meta: ProAssistanceMeta): string {
  const summary = proAssistanceSummary(meta)
  if (summary.length > STUDIO_PRO_ASSISTANCE_LIMITS.decisionSummaryChars)
    throw new ProAssistanceSummaryTooLarge()
  return summary
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
