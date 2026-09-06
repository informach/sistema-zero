import { NextResponse } from 'next/server'
import { parseLimit, parseOffset } from '@/lib/list-params'
import type { UserView } from '@/lib/types'
import { normalizeUpstreamError } from '@/lib/upstream'
import { resolveIdentities } from '@/server/identities'
import { type AdminRankingEntryRaw, getAdminRanking } from '@/server/members'
import { type AdminProfileSearchRow, listUsers, searchProfiles } from '@/server/users'

const SEARCH_LIMIT = 100

export interface RankingListRow {
  learnerId: string
  accountId: string
  name: string | null
  accountName: string | null
  accountEmail: string | null
  photoUrl: string | null
  levelSlug: string
  position: number
  xp: number
  lastActivityDate: string | null
  href: string
}

export interface RankingListResponse {
  items: RankingListRow[]
  total: number
  totalParticipants: number
  limit: number
  offset: number
  searchTruncated: boolean
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const audience = url.searchParams.get('audience') === 'kids' ? 'kids' : 'adult'
  const q = url.searchParams.get('q')?.trim() || undefined
  const limit = parseLimit(url.searchParams.get('limit'), 100) ?? 20
  const offset = parseOffset(url.searchParams.get('offset')) ?? 0

  let profilesById = new Map<string, AdminProfileSearchRow>()
  let usersById = new Map<string, UserView>()
  let userIds: string[] | undefined
  let searchTruncated = false

  if (q) {
    if (audience === 'kids') {
      const search = await searchProfiles({ q, limit: SEARCH_LIMIT, offset: 0 })
      if (search.status !== 200 || !search.body) return upstream(search.status, search.body)
      profilesById = new Map(search.body.items.map((profile) => [profile.id, profile]))
      userIds = search.body.items.map((profile) => profile.id)
      searchTruncated = search.body.total > SEARCH_LIMIT
    } else {
      const search = await listUsers({ q, limit: SEARCH_LIMIT, offset: 0 })
      if (search.status !== 200 || !search.body) return upstream(search.status, search.body)
      usersById = new Map(search.body.items.map((user) => [user.id, user]))
      userIds = search.body.items.map((user) => user.id)
      searchTruncated = search.body.total > SEARCH_LIMIT
    }
  }

  const ranking = await getAdminRanking({ audience, limit, offset, userIds })
  if (ranking.status !== 200 || !ranking.body || !Array.isArray(ranking.body.items)) {
    return upstream(ranking.status, ranking.body)
  }

  const identityOf = q
    ? null
    : await resolveIdentities(
        ranking.body.items.map((item) => ({ userId: item.userId, accountId: item.accountId })),
      )
  const items = ranking.body.items.map((item): RankingListRow => {
    if (audience === 'kids') {
      const searched = profilesById.get(item.userId)
      const identity = identityOf?.({ userId: item.userId, accountId: item.accountId })
      const account = searched?.account
      return {
        ...common(item),
        name: searched?.name ?? identity?.childName ?? null,
        accountName: account
          ? `${account.firstName} ${account.lastName}`.trim()
          : (identity?.accountName ?? null),
        accountEmail: account?.email ?? identity?.accountEmail ?? null,
        href: `/admin/membros/${encodeURIComponent(item.accountId)}?learner=${encodeURIComponent(item.userId)}`,
      }
    }

    const searched = usersById.get(item.accountId)
    const identity = identityOf?.({ userId: item.userId, accountId: item.accountId })
    return {
      ...common(item),
      name: searched
        ? `${searched.firstName} ${searched.lastName}`.trim()
        : (identity?.accountName ?? null),
      accountName: null,
      accountEmail: searched?.email ?? identity?.accountEmail ?? null,
      href: `/admin/membros/${encodeURIComponent(item.accountId)}`,
    }
  })

  return NextResponse.json(
    {
      items,
      total: ranking.body.totalMatches,
      totalParticipants: ranking.body.totalParticipants,
      limit: ranking.body.limit,
      offset: ranking.body.offset,
      searchTruncated,
    } satisfies RankingListResponse,
    { status: 200 },
  )
}

function common(item: AdminRankingEntryRaw) {
  return {
    learnerId: item.userId,
    accountId: item.accountId,
    photoUrl: item.photoUrl,
    levelSlug: item.levelSlug,
    position: item.position,
    xp: item.xp,
    lastActivityDate: item.lastActivityDate,
  }
}

function upstream(status: number, body: unknown) {
  return NextResponse.json(normalizeUpstreamError(body), { status: status === 200 ? 502 : status })
}
