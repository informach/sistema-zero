import type { CourseAudience } from '../../domain/course/course'
import type {
  PensaTask,
  PensaTaskCategory,
  PensaTaskContext,
  PensaTaskDestination,
  PensaTaskGuide,
} from '../../domain/pensa/pensa'
import { PensaNotFoundError } from '../../domain/pensa/pensa.errors'
import { validateTaskPlan } from '../../domain/pensa/task-plan'
import type {
  NewPensaTask,
  PensaRepository,
  PensaTaskPlanPatch,
} from '../../domain/ports/pensa-repository.port'
import { ValidationError } from '../../domain/shared/errors'
import { type PensaTaskView, toPensaTaskView } from '../mappers/pensa-views'

export interface UpdatePensaTaskInput {
  title?: string
  summary?: string | null
  destination?: PensaTaskDestination
  category?: PensaTaskCategory
  estimatedMinutes?: number
  position?: number
  dependencies?: string[]
  guide?: PensaTaskGuide
  context?: PensaTaskContext
}

export class UpdatePensaTaskService {
  constructor(
    private readonly repo: PensaRepository,
    private readonly newId: () => string,
    private readonly clock: () => Date,
  ) {}

  async execute(
    userId: string,
    audience: CourseAudience,
    taskId: string,
    input: UpdatePensaTaskInput,
  ): Promise<PensaTaskView> {
    const found = await this.repo.findTaskWithProject(taskId, userId, audience)
    if (!found) throw new PensaNotFoundError()
    const patch: PensaTaskPlanPatch = {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.summary !== undefined ? { summary: input.summary?.trim() || null } : {}),
      ...(input.destination !== undefined ? { destination: input.destination } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.estimatedMinutes !== undefined ? { estimatedMinutes: input.estimatedMinutes } : {}),
      ...(input.position !== undefined ? { position: input.position } : {}),
      ...(input.dependencies !== undefined ? { dependencies: input.dependencies } : {}),
      ...(input.guide !== undefined ? { guide: input.guide } : {}),
      ...(input.context !== undefined ? { context: input.context } : {}),
    }
    const prospective = { ...found.task, ...patch }
    if (prospective.destination !== prospective.context.kind)
      throw new ValidationError('O contexto precisa corresponder ao destino')
    const all = await this.repo.listTasks(found.cycle.id)
    const plan = all.map((task) => (task.id === taskId ? prospective : task))
    const validation = validateTaskPlan(plan)
    if (!validation.ok)
      throw new ValidationError(validation.issues[0]?.message ?? 'Plano de tarefas inválido')
    const now = this.clock()
    let updated: PensaTask
    if (found.task.progress.status === 'planned') {
      updated = await this.repo.updateTaskPlan(found.project.id, taskId, patch, now)
    } else {
      const replacement: NewPensaTask = {
        id: this.newId(),
        title: prospective.title,
        summary: prospective.summary,
        destination: prospective.destination,
        category: prospective.category,
        estimatedMinutes: prospective.estimatedMinutes,
        position: prospective.position,
        dependencies: prospective.dependencies,
        guide: prospective.guide,
        context: prospective.context,
      }
      updated = await this.repo.reviseTask(found.project.id, found.task, replacement, now)
    }
    if (found.cycle.stage === 'done')
      await this.repo.reopenCycleReview(found.project.id, found.cycle.id, now)
    return toPensaTaskView(updated)
  }
}
