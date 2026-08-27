import { isPintaPaletteLibraryCreation } from '../../src/domain/creations/palette-library'
import type {
  LearnerCreationsUsage,
  LearnerDeliveriesUsage,
  LearnerPensaUsage,
  ToolUsageRepository,
} from '../../src/domain/ports/tool-usage-repository.port'
import type { InMemoryCreationsRepository } from './creations-in-memory'
import type { InMemoryCourseRepository, InMemoryStudioSubmissionRepository } from './in-memory'
import type { InMemoryPensaRepository } from './pensa-in-memory'

/**
 * Espelho fiel do `DrizzleToolUsageRepository` sobre os fakes existentes:
 * pensa (projects/cycles), creations (vivas E confirmadas — a régua do índice
 * `creations_usage_idx`: `deleted_at is null AND storage_ref is not null`) e
 * entregas com o kind AUTORITATIVO do bloco (inner join → bloco sumido não conta).
 */
export class InMemoryToolUsageRepository implements ToolUsageRepository {
  constructor(
    private readonly pensa: InMemoryPensaRepository,
    private readonly creations: InMemoryCreationsRepository,
    private readonly submissions: InMemoryStudioSubmissionRepository,
    private readonly courses: InMemoryCourseRepository,
  ) {}

  async pensaUsageByUsers(userIds: string[]): Promise<Map<string, LearnerPensaUsage>> {
    const set = new Set(userIds)
    const out = new Map<string, LearnerPensaUsage>()
    for (const p of this.pensa.projects.values()) {
      if (!set.has(p.userId)) continue
      const prev = out.get(p.userId) ?? { projects: 0, cyclesCompleted: 0, lastActivityAt: null }
      prev.projects += 1
      if (!prev.lastActivityAt || p.updatedAt.getTime() > prev.lastActivityAt.getTime()) {
        prev.lastActivityAt = p.updatedAt
      }
      out.set(p.userId, prev)
    }
    for (const c of this.pensa.cycles.values()) {
      if (c.stage !== 'done') continue
      const project = this.pensa.projects.get(c.projectId)
      if (!project) continue
      const prev = out.get(project.userId)
      if (prev) prev.cyclesCompleted += 1
    }
    return out
  }

  async creationsUsageByUsers(
    userIds: string[],
    tool: 'studio' | 'pinta',
  ): Promise<Map<string, LearnerCreationsUsage>> {
    const set = new Set(userIds)
    const out = new Map<string, LearnerCreationsUsage>()
    for (const r of this.creations.rows.values()) {
      if (!set.has(r.userId) || r.tool !== tool) continue
      if (r.deletedAt !== null || r.storageRef === null) continue
      // A biblioteca "Minhas paletas" (item especial do canal) não é desenho.
      if (isPintaPaletteLibraryCreation(r)) continue
      const prev = out.get(r.userId) ?? { count: 0, lastActivityAt: null }
      prev.count += 1
      if (!prev.lastActivityAt || r.itemUpdatedAt.getTime() > prev.lastActivityAt.getTime()) {
        prev.lastActivityAt = r.itemUpdatedAt
      }
      out.set(r.userId, prev)
    }
    return out
  }

  async submissionsUsageByUsers(
    userIds: string[],
    kind: 'studio' | 'pinta',
  ): Promise<Map<string, LearnerDeliveriesUsage>> {
    const set = new Set(userIds)
    const out = new Map<string, LearnerDeliveriesUsage>()
    for (const s of this.submissions.submissions) {
      if (!set.has(s.userId)) continue
      const block = this.courses.blocks.find((b) => b.id === s.blockId)
      if (!block || block.kind !== kind) continue
      const prev = out.get(s.userId) ?? { count: 0, lastActivityAt: null }
      prev.count += 1
      if (!prev.lastActivityAt || s.submittedAt.getTime() > prev.lastActivityAt.getTime()) {
        prev.lastActivityAt = s.submittedAt
      }
      out.set(s.userId, prev)
    }
    return out
  }
}
