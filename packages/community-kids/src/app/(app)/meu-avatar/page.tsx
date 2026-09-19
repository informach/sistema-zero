import { redirect } from 'next/navigation'
import { AvatarConfiguratorClient } from '@/components/kids/avatar3d/configurator-client'
import { resolveAvatarReturnPath } from '@/lib/avatar-return'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

/**
 * Configurador de avatar 3D — app de criação embarcado, como o Pinta e o Estúdio: DENTRO do
 * grupo `(app)`, ocupando a área útil inteira com o menu da esquerda recolhido e a alça
 * de mostrar presa ao menu pelo shell (`EMBEDDED_APP_PREFIXES`). O proxy gateia
 * `/meu-avatar` (protectedPrefixes + exige perfil): conta sem perfil → `/perfis`. A montagem do
 * WebGL é client-only (`ssr:false`).
 *
 * ⚠️ Até 19/09/2026 ele era tela cheia SOLTA (fora do grupo, `fixed inset-0`), e por isso não
 * havia menu nenhum para mostrar. A URL não mudou: `(app)` é grupo de rota.
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
