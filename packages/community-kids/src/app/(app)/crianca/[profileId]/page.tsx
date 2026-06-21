import { notFound } from 'next/navigation'
import { PublicProfileView } from '@/components/kids/public-profile-view'
import { getPublicProfile } from '@/server/public-profile'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Perfil PÚBLICO de uma criança, visível DENTRO da comunidade (esta página vive no
 * grupo `(app)` → exige sessão — NÃO é pública como `/jogar`). O `getPublicProfile`
 * GATEIA pela flag dos pais (opt-out → `notFound`). Sem dados sensíveis.
 */
export default async function PublicChildProfilePage({
  params,
}: {
  params: Promise<{ profileId: string }>
}) {
  const { profileId } = await params
  if (!UUID_RE.test(profileId)) notFound()
  const profile = await getPublicProfile(profileId)
  if (!profile) notFound()
  return <PublicProfileView profile={profile} />
}
