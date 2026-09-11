import { Trophy } from 'lucide-react'
import { redirect } from 'next/navigation'
import { FocusRefresh } from '@/components/kids/focus-refresh'
import { KidsPageHeader } from '@/components/kids/kids-page-header'
import { backToSection } from '@/components/kids/nav'
import { canOpenFreeStudio } from '@/lib/studio-cta'
import {
  checkStudioAccessReadonly,
  getGamificationReadonly,
  getLeagueReadonly,
  getRankingReadonly,
} from '@/server/members'
import { getSession } from '@/server/session'
import { RankingHub } from './ranking-hub'

export const dynamic = 'force-dynamic'

export default async function RankingPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!session.activeProfile) redirect('/perfis')

  const [rankingRes, leagueRes, studioRes, gamRes] = await Promise.all([
    getRankingReadonly({ limit: 20 }).catch(() => null),
    getLeagueReadonly().catch(() => null),
    // O jogo publicado no Mural só aparece como fonte de XP para quem abre o Estúdio
    // livre (posse do produto e o nível da carreira): produto vendido à parte não vira
    // caminho para quem não o tem. As duas buscas são as mesmas do layout (deduplicadas
    // por request) e, num soluço, o cartão só some.
    checkStudioAccessReadonly().catch(() => null),
    getGamificationReadonly({ withRanking: true }).catch(() => null),
  ])
  const ranking = rankingRes?.status === 200 ? (rankingRes.body ?? null) : null
  const league = leagueRes?.status === 200 ? (leagueRes.body ?? null) : null
  const canPublish = canOpenFreeStudio(
    studioRes?.status === 200 && studioRes.body?.access?.['estudio-completo'] === true,
    gamRes?.status === 200 ? gamRes.body?.level?.slug : undefined,
    session.role,
  )

  return (
    <>
      <FocusRefresh />
      {/* O hub traz as próprias faixas: as abas moram na faixa creme do cabeçalho e
          mudam o conteúdo da faixa de baixo, então o estado precisa estar nas duas. */}
      <RankingHub
        header={
          <KidsPageHeader
            back={backToSection('/ranking')}
            eyebrow="Placar da comunidade"
            eyebrowIcon={Trophy}
            title="Ranking dos Criadores"
            subtitle="No ranking geral vale todo o XP que você já conquistou. Na sua liga, a disputa recomeça toda semana."
          />
        }
        initialRanking={ranking}
        league={league}
        canPublish={canPublish}
      />
    </>
  )
}
