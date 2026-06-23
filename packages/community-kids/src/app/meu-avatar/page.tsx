import { redirect } from 'next/navigation'
import { AvatarConfiguratorClient } from '@/components/kids/avatar3d/configurator-client'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

/**
 * Configurador de avatar 3D — tela cheia IMERSIVA (FORA do grupo `(app)`, sem a sidebar,
 * como `/perfis` e `/jogar`). O proxy gateia `/meu-avatar` (protectedPrefixes + exige
 * perfil): conta sem perfil → `/perfis`. A montagem do WebGL é client-only (`ssr:false`).
 */
export default async function MeuAvatarPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  return <AvatarConfiguratorClient />
}
