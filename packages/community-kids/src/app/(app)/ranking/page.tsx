import { Trophy } from 'lucide-react'
import { redirect } from 'next/navigation'
import { FocusRefresh } from '@/components/kids/focus-refresh'
import { KidsBand } from '@/components/kids/kids-band'
import { KidsPageHeader } from '@/components/kids/kids-page-header'
import { getLeagueReadonly, getRankingReadonly } from '@/server/members'
import { getSession } from '@/server/session'
import { RankingHub } from './ranking-hub'

export const dynamic = 'force-dynamic'

export default async function RankingPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!session.activeProfile) redirect('/perfis')

  const [rankingRes, leagueRes] = await Promise.all([
    getRankingReadonly({ limit: 20 }).catch(() => null),
    getLeagueReadonly().catch(() => null),
  ])
  const ranking = rankingRes?.status === 200 ? (rankingRes.body ?? null) : null
  const league = leagueRes?.status === 200 ? (leagueRes.body ?? null) : null

  return (
    <>
      <FocusRefresh />
      <KidsBand tone="creme">
        <KidsPageHeader
          eyebrow="Placar da comunidade"
          eyebrowIcon={Trophy}
          title="Ranking dos Criadores"
          subtitle="No ranking geral vale todo o XP que você já conquistou. Na sua liga, a disputa recomeça toda semana."
        />
      </KidsBand>
      {/* O hub traz as próprias faixas: a aba muda o conteúdo, e a cor de fundo
          precisa mudar junto com ela. */}
      <RankingHub initialRanking={ranking} league={league} />
    </>
  )
}
