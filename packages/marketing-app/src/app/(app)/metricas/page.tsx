import { PageHeader } from '@/components/shared/page-header'
import { MetricasClient } from './metricas-client'

export default function MetricasPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Métricas" description="Desempenho das publicações por rede e por conta." />
      <MetricasClient />
    </div>
  )
}
