import { AvatarConfiguratorClient } from '@sistemazero/member-shell/components/cosmetics/avatar3d/configurator-client'
import { resolveAvatarReturnPath } from '@sistemazero/member-shell/lib/avatar-return'

export const dynamic = 'force-dynamic'
export default async function AdultAvatarPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>
}) {
  const { returnTo } = await searchParams
  // A pele adulta do editor compartilhado (prancha "Meu avatar 3D", 18/10/2026).
  return <AvatarConfiguratorClient returnTo={resolveAvatarReturnPath(returnTo)} skin="adult" />
}
