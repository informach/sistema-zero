import { notFound } from 'next/navigation'
import { ComposerClient } from './composer-client'

// Validação superficial dos ids (uuid): lixo na URL vira 404 direto, sem BFF.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Shell server do composer de publicação (Next 16: `params` é Promise). */
export default async function ComposerPage({
  params,
}: {
  params: Promise<{ id: string; pubId: string }>
}) {
  const { id, pubId } = await params
  if (!UUID_RE.test(id) || !UUID_RE.test(pubId)) notFound()
  return <ComposerClient contentId={id} publicationId={pubId} />
}
