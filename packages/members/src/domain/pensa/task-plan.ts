import type {
  PensaGuideItem,
  PensaTask,
  PensaTaskContext,
  PensaTaskOutputRef,
  PensaTaskProgress,
} from './pensa'

export interface TaskPlanValidationResult {
  ok: boolean
  issues: Array<{ code: string; message: string; taskId?: string }>
}

const duplicateIds = (items: ReadonlyArray<{ id: string }>): string[] => {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const item of items) {
    if (seen.has(item.id)) duplicates.add(item.id)
    seen.add(item.id)
  }
  return [...duplicates]
}

/**
 * Valida ordem + dependências do plano. A regra "somente tarefas anteriores"
 * implica DAG e produz erros melhores que uma busca de ciclo genérica.
 */
export function validateTaskPlan(tasks: readonly PensaTask[]): TaskPlanValidationResult {
  const issues: TaskPlanValidationResult['issues'] = []
  const active = tasks
    .filter((task) => task.archivedAt === null)
    .sort((a, b) => a.position - b.position)
  const positions = new Map(active.map((task) => [task.id, task.position]))
  const taskDuplicates = duplicateIds(active)
  for (const id of taskDuplicates) {
    issues.push({
      code: 'DUPLICATE_TASK_ID',
      message: 'Há Cartões de Criação repetidos.',
      taskId: id,
    })
  }

  const occupied = new Set<number>()
  for (const task of active) {
    if (occupied.has(task.position)) {
      issues.push({
        code: 'DUPLICATE_POSITION',
        message: 'Duas tarefas ocupam a mesma posição no plano.',
        taskId: task.id,
      })
    }
    occupied.add(task.position)
    for (const dependencyId of task.dependencies) {
      const dependencyPosition = positions.get(dependencyId)
      if (dependencyPosition === undefined) {
        issues.push({
          code: 'UNKNOWN_DEPENDENCY',
          message: 'A tarefa depende de um cartão que não existe.',
          taskId: task.id,
        })
      } else if (dependencyPosition >= task.position) {
        issues.push({
          code: 'DEPENDENCY_NOT_PREVIOUS',
          message: 'Uma dependência precisa aparecer antes da tarefa.',
          taskId: task.id,
        })
      }
    }
    for (const itemId of duplicateIds([...task.guide.steps, ...task.guide.criteria])) {
      issues.push({
        code: 'DUPLICATE_GUIDE_ID',
        message: 'Passos e critérios precisam de IDs únicos no cartão.',
        taskId: task.id,
      })
      if (!itemId) break
    }
  }
  return { ok: issues.length === 0, issues }
}

const ids = (items: readonly PensaGuideItem[]) => new Set(items.map((item) => item.id))

export function validateProgressIds(
  task: PensaTask,
  completedStepIds: readonly string[],
  completedCriteriaIds: readonly string[],
): boolean {
  const stepIds = ids(task.guide.steps)
  const criterionIds = ids(task.guide.criteria)
  return (
    completedStepIds.every((id) => stepIds.has(id)) &&
    completedCriteriaIds.every((id) => criterionIds.has(id))
  )
}

export function outputBelongsToContext(
  context: PensaTaskContext,
  output: PensaTaskOutputRef | null,
): boolean {
  if (!output) return true
  if (context.kind === 'studio')
    return output.kind === 'studio_project' && output.projectId.trim().length > 0
  return (
    output.kind === 'pinta_asset' &&
    output.assetId.trim().length > 0 &&
    (output.usedInStudioAt === undefined || !Number.isNaN(Date.parse(output.usedInStudioAt)))
  )
}

function outputMatchesContext(
  context: PensaTaskContext,
  output: PensaTaskOutputRef | null,
): boolean {
  if (!output) return false
  if (!outputBelongsToContext(context, output)) return false
  if (context.kind === 'studio') return true
  if (output.kind !== 'pinta_asset') return false
  return !context.requiresStudioUse || typeof output.usedInStudioAt === 'string'
}

/** Conclusão confiável: itens obrigatórios + resultado vinculado pela ferramenta. */
export function canCompleteTask(task: PensaTask, progress: PensaTaskProgress): boolean {
  const completedSteps = new Set(progress.completedStepIds)
  const completedCriteria = new Set(progress.completedCriteriaIds)
  return (
    task.guide.steps.every((item) => !item.required || completedSteps.has(item.id)) &&
    task.guide.criteria.every((item) => !item.required || completedCriteria.has(item.id)) &&
    outputMatchesContext(task.context, progress.outputRef)
  )
}

export function nextAvailableTask(tasks: readonly PensaTask[]): PensaTask | null {
  const active = tasks.filter((task) => task.archivedAt === null)
  const completed = new Set(
    active.filter((task) => task.progress.status === 'completed').map((task) => task.id),
  )
  return (
    active
      .filter(
        (task) =>
          task.progress.status !== 'completed' &&
          task.dependencies.every((dependencyId) => completed.has(dependencyId)),
      )
      .sort((a, b) => a.position - b.position)[0] ?? null
  )
}

/** O artefato task_plan referencia exatamente a sequência ativa que será auditada. */
export function taskPlanArtifactMatchesTasks(
  content: unknown,
  tasks: readonly PensaTask[],
): boolean {
  if (!content || typeof content !== 'object' || Array.isArray(content)) return false
  const taskIds = (content as { taskIds?: unknown }).taskIds
  if (!Array.isArray(taskIds) || !taskIds.every((id) => typeof id === 'string')) return false
  const activeIds = tasks
    .filter((task) => task.archivedAt === null)
    .sort((a, b) => a.position - b.position)
    .map((task) => task.id)
  return (
    taskIds.length === activeIds.length && taskIds.every((id, index) => id === activeIds[index])
  )
}
