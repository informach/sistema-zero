import { CalendarClock } from 'lucide-react'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { getSession } from '@/server/session'
import { PainelCards } from './painel-cards'

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
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Publicações agendadas</h2>
        <EmptyState
          icon={CalendarClock}
          title="Nada agendado por aqui"
          description="Os agendamentos aparecem nesta lista quando o calendário entrar no ar, na próxima fase."
        />
      </section>
    </div>
  )
}
