import { redirect } from 'next/navigation'
import { ProfilesUnavailable } from '@/components/kids/profiles-unavailable'
import { listAvatarsByProfileIdsReadonly } from '@/server/members'
import { listReadonly } from '@/server/profiles'
import { getSession } from '@/server/session'
import { ProgressClient } from './progress-client'

export const dynamic = 'force-dynamic'

export default async function AcompanhamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ crianca?: string }>
}) {
  const session = await getSession()
  if (session?.kids?.kind !== 'parent') redirect('/login/responsavel')
  const profilesRes = await listReadonly()
  if (profilesRes.status !== 200) return <ProfilesUnavailable />
  const profiles = (profilesRes.body?.profiles ?? []).map(({ id, name }) => ({ id, name }))
  const avatars = profiles.length
    ? await listAvatarsByProfileIdsReadonly(profiles.map((profile) => profile.id)).catch(() => null)
    : null
  const photos = Object.fromEntries(
    Object.entries(avatars?.status === 200 ? (avatars.body?.avatars ?? {}) : {}).map(
      ([id, view]) => [id, view.photoUrl ?? null],
    ),
  )
  return (
    <ProgressClient
      parentName={session.firstName}
      profiles={profiles}
      photoByProfile={photos}
      initialChild={(await searchParams).crianca}
    />
  )
}
