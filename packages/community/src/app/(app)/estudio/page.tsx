import { StudioFullClient } from '@sistemazero/member-shell/components/creator/studio-full-client'
import { canShowPythonCreation, isPrivilegedRole } from '@sistemazero/member-shell/lib/studio-tier'
import { ToolNotice } from '@/components/community/tool-notice'
import { toolLock } from '@/lib/tool-lock'
import { getCreativeToolsState } from '@/server/creative-tools'
import { getAdultCreatorServices } from '@/server/creator-services'
import { shell } from '@/server/shell'
export const dynamic = 'force-dynamic'

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{ projeto?: string; missao?: string }>
}) {
  const [state, query, challenge, access] = await Promise.all([
    getCreativeToolsState(),
    searchParams,
    shell.members.getChallengeReadonly().catch(() => null),
    shell.members.checkChallengeAccessReadonly().catch(() => null),
  ])
  if (state.kind !== 'ready')
    return (
      <ToolNotice
        tool="estudio"
        unavailable={state.kind === 'unavailable'}
        readOnly={state.kind === 'readonly'}
      />
    )
  if (!state.studioAvailable) return <ToolNotice tool="estudio" lock={toolLock('estudio', state)} />
  const services = await getAdultCreatorServices()
  return (
    <StudioFullClient
      key={state.session.id}
      audience="adult"
      {...services}
      viewerId={state.session.id}
      tier={state.tier}
      challenge={
        challenge?.status === 200 &&
        challenge.body?.audience === 'adult' &&
        access?.status === 200 &&
        access.body?.access?.['adult-clube-dos-criadores'] === true
          ? { key: challenge.body.challenge.key, title: challenge.body.challenge.title }
          : null
      }
      initialProjectId={query.projeto ?? null}
      taskId={query.missao && /^[0-9a-f-]{36}$/i.test(query.missao) ? query.missao : null}
      pintaOwned={state.access.pinta === true && state.journey.capabilities.includes('pinta')}
      moldaOwned={state.access.molda === true && state.journey.capabilities.includes('molda')}
      showExamples={isPrivilegedRole(state.session.role)}
      showPythonCreation={canShowPythonCreation(state.session.role)}
    />
  )
}
