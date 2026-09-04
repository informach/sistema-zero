import { PageHeader } from '@/components/shared/page-header'
import { TicketsClient } from './tickets-client'

export default function TicketsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Caixa de entrada"
        description="Pedidos por e-mail e pelo portal, priorizados pela meta interna de primeira resposta."
      />
      <TicketsClient />
    </div>
  )
}
