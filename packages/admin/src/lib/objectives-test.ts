import type { SectionProjectCheck } from '@sistemazero/core/learning'
import { evaluateStudioSectionObjectives } from '@sistemazero/studio/server-project-checks'

/**
 * O "Testar agora" dos objetivos da parte (18/10/2026): roda os objetivos contra o projeto INICIAL
 * (que deve falhar: senão a criança cumpre sem fazer nada) e contra o GABARITO (que deve passar:
 * senão nem a professora consegue). Pura, para a régua ser testada sem montar o editor.
 */
export interface ObjectiveTestRow {
  id: string
  label: string
  optional: boolean
  /** O projeto inicial já cumpre? `null` = sem projeto inicial para conferir. */
  initial: boolean | null
  /** O gabarito cumpre? `null` = sem gabarito. */
  solution: boolean | null
}

export interface ObjectivesTestReport {
  rows: ObjectiveTestRow[]
  /** Problemas que a publicação recusa ou que deixam a parte sem sentido. */
  problems: string[]
  /** Avisos que não impedem publicar. */
  notes: string[]
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const nameOf = (check: SectionProjectCheck, index: number) =>
  check.label.trim() || `Objetivo ${index + 1}`

export function testSectionObjectives(
  checks: readonly SectionProjectCheck[],
  workspace: unknown,
): ObjectivesTestReport {
  const content = record(workspace) ? workspace : {}
  const initial = content.initialProject
  const solution = content.solutionProject
  // No código só conta o que mudou em relação ao projeto inicial (o mesmo critério do servidor).
  const passedBy = (project: unknown) =>
    project === undefined || project === null
      ? null
      : new Map(
          evaluateStudioSectionObjectives(checks, project, initial ?? undefined).results.map(
            (r) => [r.checkId, r.passed],
          ),
        )
  const byInitial = passedBy(initial)
  const bySolution = passedBy(solution)
  const rows = checks.map((check, index) => ({
    id: check.id,
    label: nameOf(check, index),
    optional: check.optional === true,
    initial: byInitial ? (byInitial.get(check.id) ?? false) : null,
    solution: bySolution ? (bySolution.get(check.id) ?? false) : null,
  }))
  const problems: string[] = []
  const notes: string[] = []
  for (const row of rows) {
    if (!row.optional && row.solution === false)
      problems.push(
        `O gabarito não cumpre "${row.label}". A publicação recusa: ajuste o gabarito ou o objetivo.`,
      )
    if (!row.optional && row.initial === true)
      problems.push(
        `O projeto inicial já cumpre "${row.label}": a criança passa sem fazer nada. A publicação recusa: mude o objetivo ou o projeto inicial.`,
      )
    if (row.optional && row.solution === false)
      notes.push(`O gabarito não cumpre o desafio extra "${row.label}".`)
    if (row.optional && row.initial === true)
      notes.push(`O projeto inicial já cumpre o desafio extra "${row.label}": ele sai de graça.`)
  }
  if (checks.length > 0 && rows.every((row) => row.optional))
    notes.push(
      'Todos os objetivos são desafios extras: a parte não exige nada do projeto para seguir.',
    )
  if (bySolution === null && checks.length > 0)
    notes.push(
      'Sem gabarito: o teste só confere o projeto inicial. Crie o gabarito no bloco do Estúdio para conferir se cada objetivo pode ser cumprido.',
    )
  return { rows, problems, notes }
}
