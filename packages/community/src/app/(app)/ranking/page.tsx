import { shell } from '@/server/shell'
import { RankingClient } from './ranking-client'
export const dynamic = 'force-dynamic'
export default async function RankingPage() {
  const [ranking, league] = await Promise.all([
    shell.members.getRankingReadonly({ limit: 20 }).catch(() => null),
    shell.members.getLeagueReadonly().catch(() => null),
  ])
  return (
    <RankingClient
      initial={
        ranking?.status === 200 && ranking.body?.audience === 'adult'
          ? (ranking.body ?? null)
          : null
      }
      league={
        league?.status === 200 && league.body?.audience === 'adult' ? (league.body ?? null) : null
      }
    />
  )
}
