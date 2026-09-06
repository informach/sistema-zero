import type { CourseAudience } from '../../domain/course/course'
import { AccessDeniedError } from '../../domain/entitlement/entitlement.errors'
import type {
  AccountIdentity,
  AuthGateway,
  ProfileIdentity,
} from '../../domain/ports/auth-gateway.port'
import type { GamificationRepository } from '../../domain/ports/gamification-repository.port'
import type { RankingCursorCodec } from '../../domain/ports/ranking-cursor.port'
import { ValidationError } from '../../domain/shared/errors'
import type { RankingEntryView, RankingLeaderboardView } from '../mappers/views'
import type { ListRankingService } from './list-ranking.service'

const AUTH_BATCH_SIZE = 100

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let start = 0; start < items.length; start += size)
    out.push(items.slice(start, start + size))
  return out
}

/** Projeção pública/redigida do ranking geral para a comunidade do aluno. */
export class GetRankingLeaderboardService {
  constructor(
    private readonly repo: GamificationRepository,
    private readonly ranking: ListRankingService,
    private readonly clock: () => Date,
    private readonly auth: AuthGateway | null,
    private readonly cursors: RankingCursorCodec,
  ) {}

  async execute(
    userId: string,
    accountId: string,
    input: { audience: CourseAudience; limit: number; cursor?: string; privileged?: boolean },
  ): Promise<RankingLeaderboardView> {
    const now = this.clock()
    if (
      input.privileged ||
      !(await this.repo.hasActiveAudienceAccess(accountId, input.audience, now))
    ) {
      throw new AccessDeniedError('Você não tem matrícula ativa nesta vitrine')
    }

    const cursor = input.cursor ? this.cursors.decode(input.cursor) : null
    if (
      input.cursor &&
      (!cursor || cursor.audience !== input.audience || cursor.viewerUserId !== userId)
    ) {
      throw new ValidationError('Cursor do ranking inválido')
    }
    const snapshotAt = cursor?.snapshotAt ?? now

    const page = await this.ranking.execute({
      audience: input.audience,
      // Uma linha extra decide `nextCursor` sem confiar num total que possa mudar
      // por eventos alheios ao XP (por exemplo, expiração de matrícula).
      limit: input.limit + 1,
      offset: 0,
      snapshotAt,
      after: cursor ? { xp: cursor.xp, userId: cursor.userId } : undefined,
      viewerUserId: userId,
    })
    const hasMore = page.items.length > input.limit
    const visibleItems = page.items.slice(0, input.limit)
    const all = [...visibleItems, ...(page.me ? [page.me] : [])]
    const unique = [...new Map(all.map((entry) => [entry.userId, entry])).values()]
    const identities = await this.identities(unique, input.audience)

    const toPublic = (entry: (typeof page.items)[number]): RankingEntryView => {
      const identity = identities.get(entry.userId)
      return {
        position: entry.position,
        xp: entry.xp,
        isMe: entry.userId === userId,
        firstName: identity?.firstName || null,
        photoUrl: entry.photoUrl,
        levelSlug: entry.levelSlug,
        ...(input.audience === 'kids' && identity?.public ? { profileId: entry.userId } : {}),
      }
    }

    return {
      items: visibleItems.map(toPublic),
      total: page.totalParticipants,
      limit: input.limit,
      nextCursor:
        hasMore && visibleItems.length > 0
          ? this.cursors.encode({
              audience: input.audience,
              viewerUserId: userId,
              snapshotAt,
              xp: visibleItems.at(-1)?.xp ?? 0,
              userId: visibleItems.at(-1)?.userId ?? '',
            })
          : null,
      me: page.me ? toPublic(page.me) : null,
    }
  }

  /** Auth é enriquecimento best-effort: indisponibilidade não derruba o placar. */
  private async identities(
    rows: { userId: string; accountId: string }[],
    audience: CourseAudience,
  ): Promise<Map<string, ProfileIdentity>> {
    const out = new Map<string, ProfileIdentity>()
    if (!this.auth || rows.length === 0) return out

    try {
      if (audience === 'kids') {
        for (const batch of chunks(
          rows.map((row) => row.userId),
          AUTH_BATCH_SIZE,
        )) {
          const result = await this.auth.getProfileIdentities(batch)
          for (const [id, identity] of result) out.set(id, identity)
        }
        return out
      }

      const ids = [...new Set(rows.map((row) => row.accountId))]
      const accounts: AccountIdentity[] = []
      for (const batch of chunks(ids, AUTH_BATCH_SIZE)) {
        accounts.push(...(await this.auth.getAccountIdentities(batch)))
      }
      const byAccount = new Map(accounts.map((account) => [account.id, account]))
      for (const row of rows) {
        const account = byAccount.get(row.accountId)
        if (account) out.set(row.userId, { firstName: account.firstName, public: false })
      }
    } catch {
      return new Map()
    }
    return out
  }
}
