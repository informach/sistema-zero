import { PageHeader } from '@/components/shared/page-header'
import { CalendarioClient } from './calendario-client'

export default function CalendarioPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Calendário" description="Agenda de publicações por rede e formato." />
      <CalendarioClient />
    </div>
  )
}
