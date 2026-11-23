import { PintaClient } from '@sistemazero/member-shell/components/creator/pinta-client'
import { ToolNotice } from '@/components/community/tool-notice'
import { toolLock } from '@/lib/tool-lock'
import { getCreativeToolsState } from '@/server/creative-tools'
export const dynamic = 'force-dynamic'
export default async function PintaPage() {
  const state = await getCreativeToolsState()
  if (state.kind !== 'ready')
    return (
      <ToolNotice
        tool="pinta"
        unavailable={state.kind === 'unavailable'}
        readOnly={state.kind === 'readonly'}
      />
    )
  if (state.access.pinta !== true || !state.journey.capabilities.includes('pinta'))
    return <ToolNotice tool="pinta" lock={toolLock('pinta', state)} />
  return (
    <PintaClient
      key={state.session.id}
      audience="adult"
      viewerId={state.session.id}
      studioAvailable={state.studioAvailable}
    />
  )
}
