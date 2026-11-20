import { MoldaClient } from '@sistemazero/member-shell/components/creator/molda-client'
import { adultMoldaToolAccess } from '@sistemazero/member-shell/lib/adult-molda-tool-access'
import { ToolNotice } from '@/components/community/tool-notice'
import { toolLock } from '@/lib/tool-lock'
import { getCreativeToolsState } from '@/server/creative-tools'
import { shell } from '@/server/shell'
export const dynamic = 'force-dynamic'
export default async function MoldaPage() {
  const [state, cenarios] = await Promise.all([
    getCreativeToolsState(),
    // O atalho da oficina de cenários: só para quem o members abre (hoje, a equipe).
    shell.members.checkCenariosAccessReadonly().catch(() => null),
  ])
  if (state.kind !== 'ready')
    return (
      <ToolNotice
        tool="molda"
        unavailable={state.kind === 'unavailable'}
        readOnly={state.kind === 'readonly'}
      />
    )
  if (state.access.molda !== true || !state.journey.capabilities.includes('molda'))
    return <ToolNotice tool="molda" lock={toolLock('molda', state)} />
  return (
    <MoldaClient
      key={state.session.id}
      audience="adult"
      viewerId={state.session.id}
      studioAvailable={state.studioAvailable}
      cenariosAvailable={cenarios?.status === 200 && cenarios.body?.aberto === true}
      toolAccess={adultMoldaToolAccess(state.journey)}
    />
  )
}
