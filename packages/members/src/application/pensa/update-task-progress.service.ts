import type { CourseAudience } from '../../domain/course/course'
import type { PensaTaskOutputRef, PensaTaskStatus } from '../../domain/pensa/pensa'
import {
  PensaNotFoundError,
  PensaTaskDependencyError,
  PensaTaskProgressConflictError,
  PensaTaskTransitionError,
} from '../../domain/pensa/pensa.errors'
import {
  canCompleteTask,
  outputBelongsToContext,
  validateProgressIds,
} from '../../domain/pensa/task-plan'
import type { PensaRepository } from '../../domain/ports/pensa-repository.port'
import { type PensaTaskView, toPensaTaskView } from '../mappers/pensa-views'

export interface UpdatePensaTaskProgressInput {
  status?: PensaTaskStatus
  completedStepIds?: string[]
  completedCriteriaIds?: string[]
  outputRef?: PensaTaskOutputRef | null
  expectedUpdatedAt?: string | null
}

export class UpdatePensaTaskProgressService {
  constructor(
    private readonly repo: PensaRepository,
    private readonly clock: () => Date,
  ) {}

  async execute(
    userId: string,
    audience: CourseAudience,
    taskId: string,
    input: UpdatePensaTaskProgressInput,
  ): Promise<PensaTaskView> {
    const found = await this.repo.findTaskWithProject(taskId, userId, audience)
    if (!found) throw new PensaNotFoundError()
    const current = found.task.progress
    if (input.expectedUpdatedAt !== undefined) {
      const actualVersion = current.updatedAt?.toISOString() ?? null
      if (input.expectedUpdatedAt !== actualVersion) throw new PensaTaskProgressConflictError()
    }
    const status = input.status ?? current.status
    const steps = input.completedStepIds ?? current.completedStepIds
    const criteria = input.completedCriteriaIds ?? current.completedCriteriaIds
    const outputRef = input.outputRef !== undefined ? input.outputRef : current.outputRef
    if (!validateProgressIds(found.task, steps, criteria))
      throw new PensaTaskTransitionError('O progresso contém um passo ou critério desconhecido')
    if (!outputBelongsToContext(found.task.context, outputRef))
      throw new PensaTaskTransitionError('O resultado precisa vir da ferramenta desta tarefa')
    if (outputRef?.kind === 'studio_project') {
      const expectedProjectId = `pensa-${found.project.id.replace(/-/g, '')}`
      if (outputRef.projectId !== expectedProjectId) {
        throw new PensaTaskTransitionError(
          'O projeto do Estúdio não corresponde ao projeto associado a este plano',
        )
      }
    }

    const transitions: Record<PensaTaskStatus, readonly PensaTaskStatus[]> = {
      planned: ['planned', 'in_progress'],
      in_progress: ['in_progress', 'completed'],
      completed: ['completed'],
    }
    if (!transitions[current.status].includes(status)) throw new PensaTaskTransitionError()

    if ((current.status === 'planned' && status === 'in_progress') || status === 'completed') {
      const tasks = await this.repo.listTasks(found.cycle.id)
      const completed = new Set(
        tasks.filter((task) => task.progress.status === 'completed').map((task) => task.id),
      )
      if (!found.task.dependencies.every((id) => completed.has(id)))
        throw new PensaTaskDependencyError()
    }

    const now = this.clock()
    const progress = {
      status,
      completedStepIds: [...new Set(steps)],
      completedCriteriaIds: [...new Set(criteria)],
      outputRef,
      startedAt: current.startedAt ?? (status === 'in_progress' ? now : null),
      completedAt: status === 'completed' ? (current.completedAt ?? now) : null,
      updatedAt: now,
    }
    if (status === 'completed' && !canCompleteTask(found.task, progress)) {
      throw new PensaTaskTransitionError(
        'Conclua os itens obrigatórios e vincule o resultado da ferramenta',
      )
    }
    return toPensaTaskView(
      await this.repo.updateTaskProgress(
        found.project.id,
        taskId,
        progress,
        current.updatedAt,
        now,
      ),
    )
  }
}
