import type { CourseAudience } from '../../domain/course/course'
import type { PensaMission, PensaTask, PensaTaskColumn } from '../../domain/pensa/pensa'
import { PensaNotFoundError } from '../../domain/pensa/pensa.errors'
import type {
  PensaRepository,
  PensaTaskBoardChange,
  PensaTaskContentPatch,
} from '../../domain/ports/pensa-repository.port'
import { type PensaTaskView, toPensaTaskView } from '../mappers/pensa-views'

export interface UpdatePensaTaskInput {
  column?: PensaTaskColumn
  /** Índice desejado na coluna destino (clampado em [0, len]). */
  position?: number
  /** Presente (mesmo `null`) = sobrescreve as anotações. */
  notes?: string | null
  // ── Edição de CONTEÚDO (autoria manual — editar a missão à mão) ──
  title?: string
  summary?: string | null
  taskType?: string | null
  mission?: PensaMission
}

const byPosition = (a: PensaTask, b: PensaTask): number => a.position - b.position

/**
 * Edita/move/anota um card do kanban. AUTORIA MANUAL: title/summary/taskType/
 * mission editam o conteúdo. Movendo, a coluna DESTINO é re-sequenciada densa
 * (0..n-1) — e a de ORIGEM também, num move entre colunas (não deixa buracos).
 * Ownership pelo projeto dono → 404.
 */
export class UpdatePensaTaskService {
  constructor(
    private readonly repo: PensaRepository,
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
    let { task } = found
    const { project } = found

    // 1) Edição de CONTEÚDO (se houver) — atualiza a task base que a view final usa.
    const contentPatch: PensaTaskContentPatch = {}
    if (input.title !== undefined) contentPatch.title = input.title
    if (input.summary !== undefined) contentPatch.summary = input.summary
    if (input.taskType !== undefined) contentPatch.taskType = input.taskType
    if (input.mission !== undefined) contentPatch.mission = input.mission
    const hasContent = Object.keys(contentPatch).length > 0
    if (hasContent) {
      task = await this.repo.updateTaskContent(project.id, taskId, contentPatch, this.clock())
    }

    // 2) Move/anota no kanban. Só edição de conteúdo (sem mover/anotar) → devolve
    // já (o updateTaskContent tocou o projeto). Sem conteúdo E sem mover/anotar →
    // ainda entra no lote no-op p/ tocar `updated_at`, como manda o contrato.
    const moving = input.column !== undefined || input.position !== undefined
    if (hasContent && !moving && input.notes === undefined) {
      return toPensaTaskView(task)
    }

    const changes = new Map<string, PensaTaskBoardChange>()
    let finalColumn = task.column
    let finalPosition = task.position

    if (moving) {
      const all = await this.repo.listTasks(task.cycleId)
      const targetColumn = input.column ?? task.column
      const source = all.filter((t) => t.column === task.column && t.id !== taskId).sort(byPosition)
      const destRest =
        targetColumn === task.column
          ? source
          : all.filter((t) => t.column === targetColumn).sort(byPosition)
      const insertAt = Math.min(Math.max(input.position ?? destRest.length, 0), destRest.length)

      const dest = [...destRest]
      dest.splice(insertAt, 0, task)
      dest.forEach((t, index) => {
        changes.set(t.id, { id: t.id, column: targetColumn, position: index })
      })
      // Move entre colunas: re-sequencia a origem também (fica densa, sem buracos).
      if (targetColumn !== task.column) {
        source.forEach((t, index) => {
          changes.set(t.id, { id: t.id, column: t.column, position: index })
        })
      }
      finalColumn = targetColumn
      finalPosition = insertAt
    }

    // O card alvo SEMPRE entra no lote (mesmo notes-only/no-op) — a escrita
    // acontece e o `pensa_projects.updated_at` é tocado, como manda o contrato.
    const own = changes.get(taskId) ?? { id: taskId, column: finalColumn, position: finalPosition }
    if (input.notes !== undefined) own.notes = input.notes
    changes.set(taskId, own)

    await this.repo.applyTaskChanges(project.id, [...changes.values()], this.clock())

    return toPensaTaskView({
      ...task,
      column: finalColumn,
      position: finalPosition,
      notes: input.notes !== undefined ? input.notes : task.notes,
    })
  }
}
