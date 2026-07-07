import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'

export default function CalendarioPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Calendário" description="Agenda de publicações por rede e formato." />
      <EmptyState
        title="Em construção"
        description="O calendário de publicações chega na próxima fase da ferramenta."
      />
    </div>
  )
}
