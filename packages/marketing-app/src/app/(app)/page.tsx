import { PageHeader } from '@/components/shared/page-header'
import { getSession } from '@/server/session'
import { PainelCards } from './painel-cards'
import { UpcomingPublications } from './upcoming-publications'

export const dynamic = 'force-dynamic'

export default async function PainelPage() {
  const user = await getSession()
  const firstName = user?.firstName || 'time'

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Olá, ${firstName}`}
        description="Visão geral da produção de conteúdo. Acompanhe o pipeline e as publicações."
      />
      <PainelCards />
      <UpcomingPublications />
    </div>
  )
}
