import type { CourseAudience } from '../../domain/course/course'
import { AccessDeniedError } from '../../domain/entitlement/entitlement.errors'
import type {
  AccountIdentity,
  AuthGateway,
  ProfileIdentity,
} from '../../domain/ports/auth-gateway.port'
import type { GamificationRepository } from '../../domain/ports/gamification-repository.port'
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
  ) {}

  async execute(
    userId: string,
    accountId: string,
    input: { audience: CourseAudience; limit: number; offset: number; privileged?: boolean },
  ): Promise<RankingLeaderboardView> {
    const now = this.clock()
    if (
      input.privileged ||
      !(await this.repo.hasActiveAudienceAccess(accountId, input.audience, now))
    ) {
      throw new AccessDeniedError('Você não tem matrícula ativa nesta vitrine')
    }

    const page = await this.ranking.execute({
      audience: input.audience,
      limit: input.limit,
      offset: input.offset,
      viewerUserId: userId,
    })
    const all = [...page.items, ...(page.me ? [page.me] : [])]
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
      items: page.items.map(toPublic),
      total: page.totalParticipants,
      limit: page.limit,
      offset: page.offset,
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
