import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'

export default function MetricasPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Métricas" description="Desempenho das publicações por rede e por conta." />
      <EmptyState
        title="Em construção"
        description="As métricas chegam quando as contas sociais estiverem conectadas, em uma fase futura."
      />
    </div>
  )
}
