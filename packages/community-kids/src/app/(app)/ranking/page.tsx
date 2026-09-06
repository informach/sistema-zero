import { redirect } from 'next/navigation'
import { FocusRefresh } from '@/components/kids/focus-refresh'
import { getLeagueReadonly, getRankingReadonly } from '@/server/members'
import { getSession } from '@/server/session'
import { RankingHub } from './ranking-hub'

export const dynamic = 'force-dynamic'

export default async function RankingPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!session.activeProfile) redirect('/perfis')

  const [rankingRes, leagueRes] = await Promise.all([
    getRankingReadonly({ limit: 20, offset: 0 }).catch(() => null),
    getLeagueReadonly().catch(() => null),
  ])
  const ranking = rankingRes?.status === 200 ? (rankingRes.body ?? null) : null
  const league = leagueRes?.status === 200 ? (leagueRes.body ?? null) : null

  return (
    <div className="flex w-full flex-col gap-6">
      <FocusRefresh />
      <header>
        <p className="font-bold text-primary text-sm uppercase tracking-wide">
          Placar da comunidade
        </p>
        <h1 className="mt-1 sz-display text-3xl md:text-4xl">Ranking dos Criadores</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground text-sm md:text-base">
          No ranking geral vale todo o XP que você já conquistou. Na sua liga, a disputa recomeça
          toda semana.
        </p>
      </header>
      <RankingHub initialRanking={ranking} league={league} />
    </div>
  )
}
