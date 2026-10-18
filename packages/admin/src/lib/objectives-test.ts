import { isExecutionRule, type SectionProjectCheck } from '@sistemazero/core/learning'
import { evaluateStudioSectionObjectives } from '@sistemazero/studio/server-project-checks'

/**
 * O "Testar agora" dos objetivos da parte (18/10/2026): roda os objetivos contra o projeto INICIAL
 * (que deve falhar: senão a criança cumpre sem fazer nada) e contra o GABARITO (que deve passar:
 * senão nem a professora consegue). Os de ESTRUTURA são conferidos aqui, na hora; os que RODAM o
 * jogo (etapa 3) chegam do executor pelo `executed`, e enquanto não chegam a linha diz "testando".
 * Pura, para a régua ser testada sem montar o editor.
 */
export type ObjectiveVerdict = boolean | null | 'pending' | 'error'

export interface ObjectiveTestRow {
  id: string
  label: string
  optional: boolean
  /** O projeto inicial já cumpre? `null` = sem projeto inicial; `pending` = o executor ainda roda. */
  initial: ObjectiveVerdict
  /** O gabarito cumpre? `null` = sem gabarito. */
  solution: ObjectiveVerdict
  /** O que o executor viu no gabarito (só objetivos que rodam o jogo). */
  solutionDetail?: string
  /** A tela do gabarito no fim do teste (JPEG em base64). */
  screenshot?: string
}

export interface ObjectivesTestReport {
  rows: ObjectiveTestRow[]
  /** Problemas que a publicação recusa ou que deixam a parte sem sentido. */
  problems: string[]
  /** Avisos que não impedem publicar. */
  notes: string[]
}

/** A resposta do executor para um projeto (o `POST /api/members/project-checks/test`). */
export interface ExecutionTestOutcome {
  results: { id: string; passed: boolean; detail?: string }[]
  screenshots?: Record<string, string>
}

export interface ExecutedProjects {
  initial?: ExecutionTestOutcome | 'pending' | 'error'
  solution?: ExecutionTestOutcome | 'pending' | 'error'
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const nameOf = (check: SectionProjectCheck, index: number) =>
  check.label.trim() || `Objetivo ${index + 1}`

export function executionChecksOf(checks: readonly SectionProjectCheck[]) {
  return checks.filter((check) => isExecutionRule(check.rule))
}

export function testSectionObjectives(
  checks: readonly SectionProjectCheck[],
  workspace: unknown,
  executed: ExecutedProjects = {},
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
  const verdict = (
    check: SectionProjectCheck,
    structural: Map<string, boolean> | null,
    run: ExecutedProjects['initial'],
  ): ObjectiveVerdict => {
    if (!structural) return null
    if (!isExecutionRule(check.rule)) return structural.get(check.id) ?? false
    if (run === undefined || run === 'pending') return 'pending'
    if (run === 'error') return 'error'
    return run.results.find((r) => r.id === check.id)?.passed ?? false
  }
  const rows = checks.map((check, index): ObjectiveTestRow => {
    const solutionRun = typeof executed.solution === 'object' ? executed.solution : undefined
    const detail = solutionRun?.results.find((r) => r.id === check.id)?.detail
    const screenshot = solutionRun?.screenshots?.[check.id]
    return {
      id: check.id,
      label: nameOf(check, index),
      optional: check.optional === true,
      initial: verdict(check, byInitial, executed.initial),
      solution: verdict(check, bySolution, executed.solution),
      ...(detail ? { solutionDetail: detail } : {}),
      ...(screenshot ? { screenshot } : {}),
    }
  })
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
  if (rows.some((row) => row.initial === 'error' || row.solution === 'error'))
    notes.push(
      'Não consegui rodar o jogo agora para conferir os objetivos que o testam. Tente de novo.',
    )
  if (checks.length > 0 && rows.every((row) => row.optional))
    notes.push(
      'Todos os objetivos são desafios extras: a parte não exige nada do projeto para seguir.',
    )
  if (bySolution === null && checks.length > 0)
    (executionChecksOf(checks).length ? problems : notes).push(
      executionChecksOf(checks).length
        ? 'Sem gabarito: objetivos que rodam o jogo precisam do gabarito para publicar. Crie o gabarito no bloco do Estúdio.'
        : 'Sem gabarito: o teste só confere o projeto inicial. Crie o gabarito no bloco do Estúdio para conferir se cada objetivo pode ser cumprido.',
    )
  return { rows, problems, notes }
}

/** Roda no executor os objetivos que testam o jogo, contra um projeto. */
export async function runExecutionTest(
  project: unknown,
  checks: readonly SectionProjectCheck[],
  fetchImpl: typeof fetch = fetch,
): Promise<ExecutionTestOutcome> {
  const response = await fetchImpl('/api/members/project-checks/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project,
      checks: executionChecksOf(checks).map(({ id, rule, optional }) => ({
        id,
        rule,
        ...(optional ? { optional } : {}),
      })),
    }),
  })
  const body = (await response.json().catch(() => null)) as ExecutionTestOutcome | null
  if (!response.ok || !body || !Array.isArray(body.results)) throw new Error('teste indisponível')
  return body
}
