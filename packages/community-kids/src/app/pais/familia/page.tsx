import { redirect } from 'next/navigation'
import { ProfilesNotIncluded, ProfilesUnavailable } from '@/components/kids/profiles-unavailable'
import { requestedStudyDestination } from '@/lib/entry-destination'
import { resolveProfileAllowance } from '@/lib/profile-allowance'
import { listFamilyGrantsReadonly } from '@/server/family-access'
import {
  getProfileAllowanceReadonly,
  listAvatarsByProfileIdsReadonly,
  listParentCourses,
} from '@/server/members'
import { listReadonly } from '@/server/profiles'
import { getSession } from '@/server/session'
import { resolveParentArea } from '../parent-access'
import { FamilyClient } from './family-client'

export const dynamic = 'force-dynamic'

/**
 * A Família (redesenho de 14/11/2026): um cartão por filho, o lugar de mais um e as regras do
 * Arquipélago que valem para todos. O que pede atenção e o guia ficam no Início (`/pais`).
 */
export default async function FamilyPage({
  searchParams,
}: {
  searchParams: Promise<{ aluno?: string }>
}) {
  const session = await getSession()
  if (session?.kids?.kind !== 'parent') redirect('/login/responsavel')
  const params = await searchParams
  const [profilesRes, allowanceRes, parentCourses] = await Promise.all([
    listReadonly(),
    getProfileAllowanceReadonly(),
    listParentCourses().catch(() => null),
  ])
  if (profilesRes.status !== 200) return <ProfilesUnavailable />
  const profiles = profilesRes.body?.profiles ?? []
  const allowance = resolveProfileAllowance({
    status: allowanceRes.status,
    maxProfiles: allowanceRes.body?.maxProfiles,
  })
  // A mesma régua do Início (`resolveParentArea`): quem comprou só um curso para pais
  // (15/11/2026) vê a Família vazia com o convite do limite.
  const area = resolveParentArea({ profilesCount: profiles.length, allowance, parentCourses })
  if (area.tela === 'indisponivel') return <ProfilesUnavailable reason="allowance" />
  if (area.tela === 'nao-incluido') return <ProfilesNotIncluded />
  const ids = profiles.map((profile) => profile.id)
  const [avatars, access] = await Promise.all([
    ids.length ? listAvatarsByProfileIdsReadonly(ids).catch(() => null) : null,
    listFamilyGrantsReadonly(ids),
  ])
  const photos = Object.fromEntries(
    Object.entries(avatars?.status === 200 ? (avatars.body?.avatars ?? {}) : {}).map(
      ([id, view]) => [id, view.photoUrl ?? null],
    ),
  )
  return (
    <FamilyClient
      parentName={session.firstName}
      profiles={profiles}
      profileAllowance={allowance}
      avatarPhotoByProfile={photos}
      access={access}
      studentDestination={requestedStudyDestination(params.aluno) ?? undefined}
      semAreaDaCrianca={area.purpose === 'curso'}
    />
  )
}
