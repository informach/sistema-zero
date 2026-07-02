import type { CourseAudience } from '../../domain/course/course'
import {
  MAX_CHECKLIST_ITEMS_PER_CYCLE,
  type PensaChecklistCategory,
} from '../../domain/pensa/pensa'
import { PensaNotFoundError, PensaQuotaExceededError } from '../../domain/pensa/pensa.errors'
import type {
  NewPensaChecklistItem,
  PensaRepository,
} from '../../domain/ports/pensa-repository.port'
import { type PensaChecklistItemView, toPensaChecklistItemView } from '../mappers/pensa-views'

export interface ReplacePensaChecklistItemInput {
  category: PensaChecklistCategory
  title: string
  description?: string | null
  /** Ausente → `true` (item obrigatório trava o o→done). */
  required?: boolean
  /** Ausente → índice do array. */
  position?: number
}

/** REPLACE total do checklist do ciclo. ≤40 itens → 409 PENSA_QUOTA_EXCEEDED. */
export class ReplacePensaChecklistService {
  constructor(
    private readonly repo: PensaRepository,
    private readonly newId: () => string,
    private readonly clock: () => Date,
  ) {}

  async execute(
    userId: string,
    audience: CourseAudience,
    cycleId: string,
    items: ReplacePensaChecklistItemInput[],
  ): Promise<PensaChecklistItemView[]> {
    const found = await this.repo.findCycleWithProject(cycleId, userId, audience)
    if (!found) throw new PensaNotFoundError()
    if (items.length > MAX_CHECKLIST_ITEMS_PER_CYCLE) {
      throw new PensaQuotaExceededError(
        `Um checklist aceita no máximo ${MAX_CHECKLIST_ITEMS_PER_CYCLE} itens`,
      )
    }

    const newItems: NewPensaChecklistItem[] = items.map((item, index) => ({
      id: this.newId(),
      category: item.category,
      title: item.title,
      description: item.description ?? null,
      required: item.required ?? true,
      position: item.position ?? index,
    }))
    await this.repo.replaceChecklist(found.project.id, cycleId, newItems, this.clock())

    return newItems.map((item) =>
      toPensaChecklistItemView({ ...item, cycleId, done: false, doneAt: null }),
    )
  }
}
