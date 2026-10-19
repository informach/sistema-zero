import { getSession } from '@/server/session'
import { SpaceViewClient } from './space-view-client'

export const dynamic = 'force-dynamic'

export default async function SpacePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ canal?: string | string[] }>
}) {
  const [{ slug }, query, session] = await Promise.all([params, searchParams, getSession()])
  // `?canal=` vem das linhas de canal da Comunidade: abre o espaço já naquele canal.
  const initialChannel = typeof query.canal === 'string' ? query.canal : null
  return (
    <SpaceViewClient
      key={`${slug}:${initialChannel ?? ''}`}
      slug={slug}
      viewerId={session?.id ?? ''}
      initialChannel={initialChannel}
    />
  )
}
