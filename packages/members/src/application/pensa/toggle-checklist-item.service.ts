import type { CourseAudience } from '../../domain/course/course'
import { PensaNotFoundError } from '../../domain/pensa/pensa.errors'
import type { PensaRepository } from '../../domain/ports/pensa-repository.port'
import { type PensaChecklistItemView, toPensaChecklistItemView } from '../mappers/pensa-views'

/** Marca/desmarca um item do checklist (`done_at` acompanha). Ownership → 404. */
export class TogglePensaChecklistItemService {
  constructor(
    private readonly repo: PensaRepository,
    private readonly clock: () => Date,
  ) {}

  async execute(
    userId: string,
    audience: CourseAudience,
    itemId: string,
    done: boolean,
  ): Promise<PensaChecklistItemView> {
    const found = await this.repo.findChecklistItemWithProject(itemId, userId, audience)
    if (!found) throw new PensaNotFoundError()

    const updated = await this.repo.setChecklistItemDone(
      found.project.id,
      itemId,
      done,
      this.clock(),
    )
    return toPensaChecklistItemView(updated)
  }
}
