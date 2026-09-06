import type { CourseAudience } from '../../domain/course/course'
import type { GamificationRepository } from '../../domain/ports/gamification-repository.port'
import type {
  GetAvatarsByProfilesService,
  ProfileAvatarView,
} from '../avatar/get-avatars-by-profiles.service'
import type { AdminRankingEntryView, AdminRankingPageView } from '../mappers/views'

export interface ListRankingInput {
  audience: CourseAudience
  limit: number
  offset: number
  snapshotAt?: Date
  after?: { xp: number; userId: string }
  userIds?: string[]
  viewerUserId?: string
}

/**
 * Projeção interna compartilhada pelos endpoints do aluno e do admin. A posição é
 * calculada pelo repositório antes de qualquer filtro e foto/nível são hidratados
 * em lote, sem N+1.
 */
export class ListRankingService {
  constructor(
    private readonly repo: GamificationRepository,
    private readonly avatars: GetAvatarsByProfilesService,
    private readonly clock: () => Date,
  ) {}

  async execute(input: ListRankingInput): Promise<AdminRankingPageView> {
    const page = await this.repo.listRanking({ ...input, now: this.clock() })
    const ids = [...page.entries.map((entry) => entry.userId), ...(page.me ? [page.me.userId] : [])]
    // Foto/nível são enriquecimento: indisponibilidade não pode derrubar o placar.
    const avatars = await this.avatars
      .execute(ids, input.audience)
      .catch((): Record<string, ProfileAvatarView> => ({}))
    const toView = (entry: (typeof page.entries)[number]): AdminRankingEntryView => ({
      userId: entry.userId,
      accountId: entry.accountId,
      position: entry.position,
      xp: entry.xp,
      lastActivityDate: entry.lastActivityDate,
      photoUrl: avatars[entry.userId]?.photoUrl ?? null,
      levelSlug: avatars[entry.userId]?.level ?? 'noob',
    })

    return {
      items: page.entries.map(toView),
      totalParticipants: page.totalParticipants,
      totalMatches: page.totalMatches,
      limit: input.limit,
      offset: input.offset,
      me: page.me ? toView(page.me) : null,
    }
  }
}
