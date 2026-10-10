import { redirect } from 'next/navigation'
import { KidsScreen } from '@/components/kids/kids-screen'
import { ProfilesUnavailable } from '@/components/kids/profiles-unavailable'
import { StudentEntry } from '@/components/kids/student-entry'
import { SupportProfileSelector } from '@/components/kids/support-profile-selector'
import { actorLabel } from '@/lib/act'
import { shell } from '@/server/shell'

export const dynamic = 'force-dynamic'
export default async function ProfilesPage({
  searchParams,
}: {
  searchParams: Promise<{ manage?: string }>
}) {
  if ((await searchParams).manage === '1') redirect('/pais')
  const session = await shell.session.getSession()
  // A grade é só das crianças. O responsável (inclusive o que chega por um link antigo de
  // e-mail para `/perfis`) vai para a área dele; a troca para a criança é o "Ir para a área
  // do aluno", que encerra a sessão adulta antes.
  if (session?.kids?.kind === 'parent') redirect('/pais')
  if (session?.act) {
    const profiles = await shell.profiles.listReadonly()
    if (profiles.status !== 200) return <ProfilesUnavailable />
    return (
      <KidsScreen innerClassName="max-w-xl">
        <SupportProfileSelector
          profiles={(profiles.body?.profiles ?? []).map(({ id, name }) => ({ id, name }))}
          actorName={actorLabel(session.act)}
          familyName={session.firstName}
          mode={session.act.mode}
        />
      </KidsScreen>
    )
  }
  const device = await shell.study.recognize()
  return (
    <KidsScreen innerClassName="max-w-xl">
      <StudentEntry profiles={device.body.profiles} unavailable={device.status !== 200} />
    </KidsScreen>
  )
}
