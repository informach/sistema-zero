import { redirect } from 'next/navigation'
import { ProfilesUnavailable } from '@/components/kids/profiles-unavailable'
import { requestedStudyDestination } from '@/lib/entry-destination'
import { familyAccessReady } from '@/lib/study-access-view'
import { listFamilyGrantsReadonly } from '@/server/family-access'
import { listAvatarsByProfileIdsReadonly } from '@/server/members'
import { listReadonly } from '@/server/profiles'
import { getSession } from '@/server/session'
import { familyHref } from '../../parent-routes'
import { ChildClient } from './child-client'

export const dynamic = 'force-dynamic'

export default async function ChildPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ aba?: string; aluno?: string }>
}) {
  const session = await getSession()
  if (session?.kids?.kind !== 'parent') redirect('/login/responsavel')
  const { id } = await params
  const profilesRes = await listReadonly()
  if (profilesRes.status !== 200) return <ProfilesUnavailable />
  const profiles = profilesRes.body?.profiles ?? []
  const profile = profiles.find((item) => item.id === id)
  const query = await searchParams
  const studentDestination = requestedStudyDestination(query.aluno) ?? undefined
  // Criança de outra família (ou removida): de volta à Família, sem dizer se o perfil existe.
  if (!profile) redirect(familyHref(studentDestination))
  const ids = profiles.map((item) => item.id)
  const [avatars, access] = await Promise.all([
    listAvatarsByProfileIdsReadonly([profile.id]).catch(() => null),
    listFamilyGrantsReadonly(ids),
  ])
  const photoUrl =
    avatars?.status === 200 ? (avatars.body?.avatars?.[profile.id]?.photoUrl ?? null) : null
  const familyReady = familyAccessReady(
    Object.fromEntries(ids.map((profileId) => [profileId, access[profileId] ?? null])),
  )
  return (
    <ChildClient
      accountId={session.id}
      parentName={session.firstName}
      profile={profile}
      photoUrl={photoUrl}
      initialTab={query.aba === 'progresso' ? 'progresso' : 'acesso'}
      familyReady={familyReady}
      studentDestination={studentDestination}
    />
  )
}
