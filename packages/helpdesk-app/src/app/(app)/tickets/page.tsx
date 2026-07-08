import { PageHeader } from '@/components/shared/page-header'
import { TicketsClient } from './tickets-client'

export default function TicketsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Caixa de entrada"
        description="Tickets do contato@: e-mails de alunos e interessados, classificados pela IA."
      />
      <TicketsClient />
    </div>
  )
}
