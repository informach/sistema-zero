import {
  isExecutionRule,
  type ProjectEntryReport,
  type ProjectObjectiveVerdict,
  ProjectStructureAnalysisLimitError,
  projectEntryReport,
  readStudioProjectExamples,
  resolveStudioSectionExamples,
  type SectionJavaScriptProjectCheck,
  studioProjectExampleEnvironmentIssues,
} from '@sistemazero/core/learning'
import { evaluateStudioSectionObjectives } from '@sistemazero/studio/server-project-checks'

/** Diagnostics of project objectives only. This never completes a student's part. */
export type ObjectiveVerdict = ProjectObjectiveVerdict

export interface ObjectiveTestRow {
  id: string
  label: string
  optional: boolean
  /** O projeto inicial já cumpre? `null` = sem projeto inicial; `pending` = o executor ainda roda. */
  initial: ObjectiveVerdict
  /** Optional authoring checkpoint; never replaces the initial code-idea baseline. */
  checkpoint: ObjectiveVerdict
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
  initialEntry: ProjectEntryReport
  checkpointEntry: ProjectEntryReport | null
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
  checkpoint?: ExecutionTestOutcome | ExecutionTestRejected | 'pending' | 'error'
  solution?: ExecutionTestOutcome | ExecutionTestRejected | 'pending' | 'error'
}

export const OBJECTIVE_PROJECT_ROLES = ['initial', 'checkpoint', 'solution'] as const
export type ObjectiveProjectRole = (typeof OBJECTIVE_PROJECT_ROLES)[number]
export interface SectionObjectiveProjects {
  initial: unknown
  checkpoint?: unknown
  solution?: unknown
  problems: string[]
}

/** Resolve once per workspace/part change, rather than recopying a large registry per result. */
export function resolveSectionObjectiveProjects(
  workspace: unknown,
  sectionId?: string,
): SectionObjectiveProjects {
  const content = record(workspace) ? workspace : {}
  const projects: SectionObjectiveProjects = { initial: content.initialProject, problems: [] }
  if (Object.hasOwn(content, 'solutionProject')) {
    projects.problems.push('Converta o gabarito global para exemplos por parte antes de testar.')
    return projects
  }
  const read = readStudioProjectExamples(content.projectExamples)
  if (read.kind === 'absent') return projects
  if (read.kind === 'invalid') {
    projects.problems = read.issues.map((issue) => issue.message)
    return projects
  }
  if (!sectionId) {
    projects.problems.push('Escolha a parte para conferir seus exemplos.')
    return projects
  }
  const environmentIssues = studioProjectExampleEnvironmentIssues(read.value, projects.initial)
  if (environmentIssues.length) {
    projects.problems = environmentIssues.map((issue) => issue.message)
    return projects
  }
  const resolved = resolveStudioSectionExamples(read.value, sectionId)
  if (resolved.kind === 'invalid') projects.problems = resolved.issues.map((issue) => issue.message)
  if (resolved.kind === 'resolved') {
    projects.solution = resolved.solution
    projects.checkpoint = resolved.entry
  }
  return projects
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
  sectionId?: string,
): ObjectivesTestReport {
  return testResolvedSectionObjectives(
    checks,
    resolveSectionObjectiveProjects(workspace, sectionId),
    executed,
  )
}

export function testResolvedSectionObjectives(
  checks: readonly SectionJavaScriptProjectCheck[],
  projects: SectionObjectiveProjects,
  executed: ExecutedProjects = {},
): ObjectivesTestReport {
  const { initial, solution, checkpoint } = projects
  const syncing = (project: unknown) => record(project) && project.bridgeCodeAhead === true
  let analysisLimited = false
  // No código só conta o que mudou em relação ao projeto inicial (o mesmo critério do servidor).
  const passedBy = (project: unknown): Map<string, boolean> | null | 'inconclusive' => {
    if (project === undefined || project === null) return null
    if (syncing(project)) return 'inconclusive'
    try {
      return new Map(
        evaluateStudioSectionObjectives(
          checks.filter((check) => !syncing(initial) || check.rule.type === 'usesBlock'),
          project,
          initial ?? undefined,
        ).results.map((r) => [r.checkId, r.passed]),
      )
    } catch (error) {
      if (error instanceof ProjectStructureAnalysisLimitError) {
        analysisLimited = true
        return 'inconclusive'
      }
      throw error
    }
  }
  const byInitial = passedBy(initial)
  const bySolution = passedBy(solution)
  const byCheckpoint = passedBy(checkpoint)
  const verdict = (
    check: SectionJavaScriptProjectCheck,
    structural: Map<string, boolean> | null | 'inconclusive',
    run: ExecutedProjects['initial'],
  ): ObjectiveVerdict => {
    if (!structural) return null
    if (structural === 'inconclusive') return 'inconclusive'
    if (syncing(initial) && check.rule.type !== 'usesBlock') return 'inconclusive'
    if (!isExecutionRule(check.rule)) return structural.get(check.id) ?? 'inconclusive'
    if (run === undefined || run === 'pending') return 'pending'
    if (run === 'error' || 'rejected' in run) return 'error'
    return run.results.find((r) => r.id === check.id)?.passed ?? 'inconclusive'
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
      checkpoint: projects.problems.length
        ? 'error'
        : verdict(check, byCheckpoint, executed.checkpoint),
      solution: projects.problems.length ? 'error' : verdict(check, bySolution, executed.solution),
      ...(detail ? { solutionDetail: detail } : {}),
      ...(screenshot ? { screenshot } : {}),
    }
  })
  const problems: string[] = [...projects.problems]
  const notes: string[] = []
  for (const row of rows) {
    if (!row.optional && row.solution === false)
      problems.push(
        `O gabarito não cumpre "${row.label}". Ajuste o gabarito ou o objetivo antes de publicar.`,
      )
    if (row.optional && row.solution === false)
      notes.push(`O gabarito não cumpre o desafio extra "${row.label}".`)
  }
  for (const [which, label] of [
    ['initial', 'No projeto inicial'],
    ['checkpoint', 'No exemplo de entrada desta parte'],
    ['solution', 'No gabarito'],
  ] as const) {
    const run = executed[which]
    if (typeof run === 'object' && 'rejected' in run) problems.push(`${label}: ${run.rejected}`)
  }
  const unavailable = (run: ExecutedProjects['initial']) => run === 'error'
  if (analysisLimited)
    notes.push(
      'Não consegui conferir todo o código dentro dos limites do teste. A análise ficou inconclusiva; peça ajuda à equipe.',
    )
  if (OBJECTIVE_PROJECT_ROLES.some((role) => unavailable(executed[role])))
    notes.push(
      'Não consegui rodar o jogo agora para conferir os objetivos que o testam. Tente de novo.',
    )
  if (checks.length > 0 && rows.every((row) => row.optional))
    notes.push(
      'Todos os objetivos são desafios extras: a parte não exige nada do projeto para seguir.',
    )
  if (!projects.problems.length && bySolution === null && checks.length > 0)
    (executionChecksOf(checks.filter((check) => !check.optional)).length ? problems : notes).push(
      executionChecksOf(checks.filter((check) => !check.optional)).length
        ? 'Sem gabarito: objetivos obrigatórios que rodam o jogo precisam do gabarito desta parte para publicar. Prepare uma solução possível nesta parte.'
        : 'Sem gabarito desta parte: prepare uma solução possível para conferir se os objetivos podem ser cumpridos.',
    )
  if (syncing(solution))
    problems.push(
      'A solução desta parte ainda está sincronizando código e blocos. Guarde um snapshot atualizado antes de publicar.',
    )
  if (syncing(initial) || syncing(checkpoint))
    notes.push(
      'Um projeto de entrada ainda está sincronizando código e blocos. Aguarde a sincronização antes de conferir seus objetivos.',
    )
  if (
    syncing(initial) &&
    solution !== undefined &&
    checks.some(
      (check) => !check.optional && !isExecutionRule(check.rule) && check.rule.type !== 'usesBlock',
    )
  )
    problems.push(
      'O projeto inicial ainda está sincronizando. Aguarde antes de comparar as ideias da solução com a base da aula.',
    )
  const entry = (which: 'initial' | 'checkpoint') =>
    projectEntryReport(
      rows.map((row) => ({
        id: row.id,
        optional: row.optional,
        verdict: row[which],
      })),
    )
  const initialEntry = entry('initial')
  const checkpointEntry = checkpoint === undefined ? null : entry('checkpoint')
  for (const [label, report] of [
    ['O projeto inicial', initialEntry],
    ['O exemplo de entrada desta parte', checkpointEntry],
  ] as const)
    if (report?.kind === 'already-satisfied')
      notes.push(
        `${label} já cumpre todos os objetivos obrigatórios do projeto. Confira se isso combina com a proposta da parte. Este aviso não avalia vídeo, quiz e envio do projeto nem conclui a parte.`,
      )
  if (rows.some((row) => OBJECTIVE_PROJECT_ROLES.some((role) => row[role] === 'inconclusive')))
    notes.push(
      'Há resultados inconclusivos. Eles não significam objetivo cumprido ou não cumprido.',
    )
  return { rows, problems, notes, initialEntry, checkpointEntry }
}

/** Roda no executor os objetivos que testam o jogo, contra um projeto. */
export async function runExecutionTest(
  project: unknown,
  checks: readonly SectionJavaScriptProjectCheck[],
  fetchImpl: typeof fetch = fetch,
  /** O projeto inicial do bloco: o servidor confere que o gabarito é do mesmo tipo e modelo. */
  initialProject?: unknown,
  signal?: AbortSignal,
): Promise<ExecutionTestOutcome> {
  const response = await fetchImpl('/api/members/project-checks/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
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
  signal?.throwIfAborted()
  if (
    !response.ok ||
    !body ||
    !Array.isArray(body.results) ||
    body.results.some(
      (result) =>
        !record(result) || typeof result.id !== 'string' || typeof result.passed !== 'boolean',
    )
  )
    throw new Error('teste indisponível')
  return body
}
