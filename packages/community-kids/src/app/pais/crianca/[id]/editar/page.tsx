import { isVoiceInputConfigured } from '@sistemazero/member-shell/server/openrouter-transcribe'
import { redirect } from 'next/navigation'
import { ProfilesUnavailable } from '@/components/kids/profiles-unavailable'
import { listReadonly } from '@/server/profiles'
import { getSession } from '@/server/session'
import { ProfileEditor } from '../../../_components/profile-editor'

export const dynamic = 'force-dynamic'

export default async function EditChildPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (session?.kids?.kind !== 'parent') redirect('/login/responsavel')
  const { id } = await params
  const profilesRes = await listReadonly()
  if (profilesRes.status !== 200) return <ProfilesUnavailable />
  const profile = (profilesRes.body?.profiles ?? []).find((item) => item.id === id)
  if (!profile) redirect('/pais')
  return (
    <ProfileEditor
      parentName={session.firstName}
      profile={profile}
      voiceAvailable={isVoiceInputConfigured()}
    />
  )
}
