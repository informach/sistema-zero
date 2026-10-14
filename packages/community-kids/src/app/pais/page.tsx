import { isVoiceInputConfigured } from '@sistemazero/member-shell/server/openrouter-transcribe'
import { redirect } from 'next/navigation'
import { ProfilesNotIncluded, ProfilesUnavailable } from '@/components/kids/profiles-unavailable'
import { requestedStudyDestination } from '@/lib/entry-destination'
import { resolveProfileAllowance } from '@/lib/profile-allowance'
import { listFamilyGrantsReadonly } from '@/server/family-access'
import { getProfileAllowanceReadonly, listAvatarsByProfileIdsReadonly } from '@/server/members'
import { listReadonly } from '@/server/profiles'
import { getSession } from '@/server/session'
import { childHref } from './parent-routes'
import { ParentsClient } from './parents-client'

export const dynamic = 'force-dynamic'
export default async function ParentsPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string; aluno?: string }>
}) {
  const session = await getSession()
  if (session?.kids?.kind !== 'parent') redirect('/login/responsavel')
  const params = await searchParams
  const [profilesRes, allowanceRes] = await Promise.all([
    listReadonly(),
    getProfileAllowanceReadonly(),
  ])
  if (profilesRes.status !== 200) return <ProfilesUnavailable />
  const profiles = profilesRes.body?.profiles ?? []
  // O atalho antigo de reautenticação (`?child=`) abre a página da criança, onde mora o acesso.
  const studentDestination = requestedStudyDestination(params.aluno) ?? undefined
  if (params.child && profiles.some((profile) => profile.id === params.child))
    redirect(childHref(params.child, undefined, studentDestination))
  const allowance = resolveProfileAllowance({
    status: allowanceRes.status,
    maxProfiles: allowanceRes.body?.maxProfiles,
  })
  if (!profiles.length && allowance.kind === 'unavailable')
    return <ProfilesUnavailable reason="allowance" />
  if (!profiles.length && allowance.kind === 'none') return <ProfilesNotIncluded />
  const ids = profiles.map((profile) => profile.id)
  // As autorizações de cada criança: o guia e o aviso de vencimento seguem o estado REAL da
  // família desde o primeiro quadro, não só o painel que o responsável abrir.
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
    <ParentsClient
      accountId={session.id}
      parentName={session.firstName}
      initialProfiles={profiles}
      profileAllowance={allowance}
      avatarPhotoByProfile={photos}
      initialAccess={access}
      studentDestination={studentDestination}
      voiceAvailable={isVoiceInputConfigured()}
    />
  )
}
