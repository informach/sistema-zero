import { PensaClient } from '@sistemazero/member-shell/components/creator/pensa-client'
import { ToolNotice } from '@/components/community/tool-notice'
import { toolLock } from '@/lib/tool-lock'
import { getCreativeToolsState } from '@/server/creative-tools'
import { getAdultCreatorServices } from '@/server/creator-services'
export const dynamic = 'force-dynamic'
export default async function AdultPensaPage({
  searchParams,
}: {
  searchParams: Promise<{ plano?: string; ajuda?: string }>
}) {
  const [state, query] = await Promise.all([getCreativeToolsState(), searchParams])
  if (state.kind !== 'ready')
    return (
      <ToolNotice
        tool="pensa"
        unavailable={state.kind === 'unavailable'}
        readOnly={state.kind === 'readonly'}
      />
    )
  if (
    !state.access.pensa ||
    !state.journey.capabilities.includes('pensa') ||
    !state.journey.capabilities.includes('ai')
  )
    return <ToolNotice tool="pensa" lock={toolLock('pensa', state)} />
  const services = await getAdultCreatorServices()
  return (
    <PensaClient
      key={state.session.id}
      audience="adult"
      voiceEnabled={services.voiceInputEnabled}
      narrationEnabled={services.narrationEnabled}
      viewerId={state.session.id}
      initialProjectId={query.plano ?? null}
      initialHelpMissionId={query.ajuda ?? null}
    />
  )
}
