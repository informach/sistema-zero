import {
  EXECUTION_LIMITS,
  isExecutionRule,
  isSectionCompletion,
  type SectionProjectCheck,
} from '@sistemazero/core/learning'

/**
 * Copiar e Colar objetivos entre partes e aulas (etapa 4, 18/10/2026). O texto copiado é JSON com
 * um marcador de formato: dá para colar em outra parte, em outra aula ou guardar num documento.
 * Colar confere cada objetivo com a MESMA régua da publicação (`isSectionCompletion` do core),
 * dá ids novos (o mesmo objetivo em duas partes não pode dividir o resultado guardado) e respeita
 * os tetos da parte. O que não entra volta numa frase, nunca some em silêncio.
 */
export const OBJECTIVES_CLIPBOARD_FORMAT = 'sistemazero/objetivos'
export const MAX_PROJECT_CHECKS = 20

export function serializeObjectives(checks: readonly SectionProjectCheck[]): string {
  return JSON.stringify(
    { format: OBJECTIVES_CLIPBOARD_FORMAT, version: 1, objectives: checks },
    null,
    2,
  )
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Aceita o formato copiado, uma lista crua de objetivos ou um critério de parte inteiro. */
function objectivesIn(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value
  if (!record(value)) return null
  if (value.format === OBJECTIVES_CLIPBOARD_FORMAT && Array.isArray(value.objectives))
    return value.objectives
  if (Array.isArray(value.projectChecks)) return value.projectChecks
  return null
}

export interface PastedObjectives {
  checks: SectionProjectCheck[]
  /** Frases para a professora: o que ficou de fora e por quê. */
  notes: string[]
}

export function parseObjectivesClipboard(
  text: string,
  existing: readonly SectionProjectCheck[],
  newId: () => string = () => crypto.randomUUID(),
): PastedObjectives {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return {
      checks: [],
      notes: ['Isso não parece uma lista de objetivos copiada. Use "Copiar objetivos" primeiro.'],
    }
  }
  const items = objectivesIn(parsed)
  if (!items)
    return {
      checks: [],
      notes: ['Isso não parece uma lista de objetivos copiada. Use "Copiar objetivos" primeiro.'],
    }
  const checks: SectionProjectCheck[] = []
  const notes: string[] = []
  let total = existing.length
  let execution = existing.filter((check) => isExecutionRule(check.rule)).length
  let invalid = 0
  let overTotal = 0
  let overExecution = 0
  for (const item of items) {
    if (!record(item)) {
      invalid++
      continue
    }
    const { id: _id, ...rest } = item
    const candidate = { ...rest, id: newId() }
    if (!isSectionCompletion({ version: 1, blockIds: [], projectChecks: [candidate] })) {
      invalid++
      continue
    }
    const check = candidate as unknown as SectionProjectCheck
    if (total >= MAX_PROJECT_CHECKS) {
      overTotal++
      continue
    }
    const runs = isExecutionRule(check.rule)
    if (runs && execution >= EXECUTION_LIMITS.maxObjectives) {
      overExecution++
      continue
    }
    checks.push(check)
    total++
    if (runs) execution++
  }
  if (invalid)
    notes.push(
      invalid === 1
        ? 'Um objetivo não entrou: ele está incompleto ou foi feito numa versão diferente.'
        : `${invalid} objetivos não entraram: estão incompletos ou foram feitos numa versão diferente.`,
    )
  if (overTotal)
    notes.push(
      `${overTotal === 1 ? 'Um objetivo ficou' : `${overTotal} objetivos ficaram`} de fora: a parte aceita até ${MAX_PROJECT_CHECKS} objetivos.`,
    )
  if (overExecution)
    notes.push(
      `${overExecution === 1 ? 'Um objetivo que roda o jogo ficou' : `${overExecution} objetivos que rodam o jogo ficaram`} de fora: a parte aceita até ${EXECUTION_LIMITS.maxObjectives} deles.`,
    )
  return { checks, notes }
}
