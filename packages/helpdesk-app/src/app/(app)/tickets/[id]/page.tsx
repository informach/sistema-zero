import { notFound } from 'next/navigation'
import { TicketDetailClient } from './ticket-detail-client'

// Validação superficial do id (uuid): lixo na URL vira 404 direto, sem BFF.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Shell server do detalhe do ticket (Next 16: `params` é Promise). */
export default async function TicketDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID_RE.test(id)) notFound()
  return <TicketDetailClient ticketId={id} />
}
