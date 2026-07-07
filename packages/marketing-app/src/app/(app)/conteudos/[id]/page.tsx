import { notFound } from 'next/navigation'
import { ContentDetailClient } from './content-detail-client'

// Validação superficial do id (uuid): lixo na URL vira 404 direto, sem BFF.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Shell server do detalhe do conteúdo (Next 16: `params` é Promise). */
export default async function ConteudoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID_RE.test(id)) notFound()
  return <ContentDetailClient contentId={id} />
}
