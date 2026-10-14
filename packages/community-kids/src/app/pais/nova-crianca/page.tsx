import { isVoiceInputConfigured } from '@sistemazero/member-shell/server/openrouter-transcribe'
import { redirect } from 'next/navigation'
import { ProfilesNotIncluded, ProfilesUnavailable } from '@/components/kids/profiles-unavailable'
import { canAddProfile, resolveProfileAllowance } from '@/lib/profile-allowance'
import { getProfileAllowanceReadonly } from '@/server/members'
import { listReadonly } from '@/server/profiles'
import { getSession } from '@/server/session'
import { ProfileEditor } from '../_components/profile-editor'

export const dynamic = 'force-dynamic'

export default async function NewChildPage() {
  const session = await getSession()
  if (session?.kids?.kind !== 'parent') redirect('/login/responsavel')
  const [profilesRes, allowanceRes] = await Promise.all([
    listReadonly(),
    getProfileAllowanceReadonly(),
  ])
  if (profilesRes.status !== 200) return <ProfilesUnavailable />
  const count = profilesRes.body?.profiles?.length ?? 0
  const allowance = resolveProfileAllowance({
    status: allowanceRes.status,
    maxProfiles: allowanceRes.body?.maxProfiles,
  })
  // A trava real é o servidor; aqui só não se oferece um formulário que ele recusaria.
  if (!canAddProfile(allowance, count)) {
    if (!count && allowance.kind === 'none') return <ProfilesNotIncluded />
    if (allowance.kind === 'unavailable') return <ProfilesUnavailable reason="allowance" />
    redirect('/pais')
  }
  return (
    <ProfileEditor
      parentName={session.firstName}
      showGuideHint={count === 0}
      voiceAvailable={isVoiceInputConfigured()}
    />
  )
}
