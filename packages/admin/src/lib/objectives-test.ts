import {
  isExecutionRule,
  ProjectStructureAnalysisLimitError,
  type SectionJavaScriptProjectCheck,
} from '@sistemazero/core/learning'
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

/** O executor RECUSOU o projeto (modelo não escolhido, grande demais…): o motivo é da autoria. */
export interface ExecutionTestRejected {
  rejected: string
}

export interface ExecutedProjects {
  initial?: ExecutionTestOutcome | ExecutionTestRejected | 'pending' | 'error'
  solution?: ExecutionTestOutcome | ExecutionTestRejected | 'pending' | 'error'
}

/** Erro de `runExecutionTest` quando o servidor diz POR QUE o projeto não pode ser testado. */
export class ExecutionTestRejectedError extends Error {}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const nameOf = (check: SectionJavaScriptProjectCheck, index: number) =>
  check.label.trim() || `Objetivo ${index + 1}`

export function executionChecksOf(checks: readonly SectionJavaScriptProjectCheck[]) {
  return checks.filter((check) => isExecutionRule(check.rule))
}

export function testSectionObjectives(
  checks: readonly SectionJavaScriptProjectCheck[],
  workspace: unknown,
  executed: ExecutedProjects = {},
): ObjectivesTestReport {
  const content = record(workspace) ? workspace : {}
  const initial = content.initialProject
  const solution = content.solutionProject
  // No código só conta o que mudou em relação ao projeto inicial (o mesmo critério do servidor).
  const passedBy = (project: unknown): Map<string, boolean> | null | 'error' => {
    if (project === undefined || project === null) return null
    try {
      return new Map(
        evaluateStudioSectionObjectives(checks, project, initial ?? undefined).results.map((r) => [
          r.checkId,
          r.passed,
        ]),
      )
    } catch (error) {
      if (error instanceof ProjectStructureAnalysisLimitError) return 'error'
      throw error
    }
  }
  const byInitial = passedBy(initial)
  const bySolution = passedBy(solution)
  const verdict = (
    check: SectionJavaScriptProjectCheck,
    structural: Map<string, boolean> | null | 'error',
    run: ExecutedProjects['initial'],
  ): ObjectiveVerdict => {
    if (!structural) return null
    if (structural === 'error') return 'error'
    if (!isExecutionRule(check.rule)) return structural.get(check.id) ?? false
    if (run === undefined || run === 'pending') return 'pending'
    if (run === 'error' || 'rejected' in run) return 'error'
    return run.results.find((r) => r.id === check.id)?.passed ?? false
  }
  const rows = checks.map((check, index): ObjectiveTestRow => {
    const solutionRun =
      typeof executed.solution === 'object' && 'results' in executed.solution
        ? executed.solution
        : undefined
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
        `O gabarito não cumpre "${row.label}". Ajuste o gabarito ou o objetivo antes de publicar.`,
      )
    if (!row.optional && row.initial === true)
      problems.push(
        `O projeto inicial já cumpre "${row.label}": a criança passa sem fazer nada. Mude o objetivo ou o projeto inicial antes de publicar.`,
      )
    if (row.optional && row.solution === false)
      notes.push(`O gabarito não cumpre o desafio extra "${row.label}".`)
    if (row.optional && row.initial === true)
      notes.push(`O projeto inicial já cumpre o desafio extra "${row.label}": ele sai de graça.`)
  }
  for (const [which, label] of [
    ['initial', 'No projeto inicial'],
    ['solution', 'No gabarito'],
  ] as const) {
    const run = executed[which]
    if (typeof run === 'object' && 'rejected' in run) problems.push(`${label}: ${run.rejected}`)
  }
  const unavailable = (run: ExecutedProjects['initial']) => run === 'error'
  if (byInitial === 'error' || bySolution === 'error')
    notes.push(
      'Não consegui conferir todo o código dentro dos limites do teste. A análise ficou inconclusiva; peça ajuda à equipe.',
    )
  if (unavailable(executed.initial) || unavailable(executed.solution))
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
  checks: readonly SectionJavaScriptProjectCheck[],
  fetchImpl: typeof fetch = fetch,
  /** O projeto inicial do bloco: o servidor confere que o gabarito é do mesmo tipo e modelo. */
  initialProject?: unknown,
): Promise<ExecutionTestOutcome> {
  const response = await fetchImpl('/api/members/project-checks/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project,
      ...(initialProject === undefined || initialProject === project ? {} : { initialProject }),
      checks: executionChecksOf(checks).map(({ id, rule, optional }) => ({
        id,
        rule,
        ...(optional ? { optional } : {}),
      })),
    }),
  })
  const body = (await response.json().catch(() => null)) as
    | (ExecutionTestOutcome & { error?: { message?: unknown } })
    | null
  // Recusa com motivo (400) ou projeto grande demais (413): a professora precisa ler o porquê.
  if (response.status === 400 || response.status === 413)
    throw new ExecutionTestRejectedError(
      typeof body?.error?.message === 'string'
        ? body.error.message
        : 'O projeto ficou grande demais para o teste.',
    )
  if (!response.ok || !body || !Array.isArray(body.results)) throw new Error('teste indisponível')
  return body
}
