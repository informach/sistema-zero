import { redirect } from 'next/navigation'
import { AvatarConfiguratorClient } from '@/components/kids/avatar3d/configurator-client'
import { resolveAvatarReturnPath } from '@/lib/avatar-return'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

/**
 * Configurador de avatar 3D — tela cheia IMERSIVA (FORA do grupo `(app)`, sem a sidebar,
 * como `/perfis` e `/jogar`). O proxy gateia `/meu-avatar` (protectedPrefixes + exige
 * perfil): conta sem perfil → `/perfis`. A montagem do WebGL é client-only (`ssr:false`).
 */
export default async function MeuAvatarPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')
  const { returnTo } = await searchParams
  return <AvatarConfiguratorClient returnTo={resolveAvatarReturnPath(returnTo)} />
}
