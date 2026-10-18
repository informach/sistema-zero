import { PintaClient } from '@sistemazero/member-shell/components/creator/pinta-client'
import { ToolNotice } from '@/components/community/tool-notice'
import { getCreativeToolsState } from '@/server/creative-tools'
export const dynamic = 'force-dynamic'
export default async function PintaPage() {
  const state = await getCreativeToolsState()
  if (state.kind !== 'ready')
    return (
      <ToolNotice
        name="Pinta"
        unavailable={state.kind === 'unavailable'}
        readOnly={state.kind === 'readonly'}
      />
    )
  if (state.access.pinta !== true || !state.journey.capabilities.includes('pinta'))
    return <ToolNotice name="Pinta" />
  return (
    <PintaClient
      key={state.session.id}
      audience="adult"
      viewerId={state.session.id}
      studioAvailable={state.studioAvailable}
    />
  )
}
