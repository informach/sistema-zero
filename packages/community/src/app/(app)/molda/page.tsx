import { MoldaClient } from '@sistemazero/member-shell/components/creator/molda-client'
import { ToolNotice } from '@/components/community/tool-notice'
import { getCreativeToolsState } from '@/server/creative-tools'
export const dynamic = 'force-dynamic'
export default async function MoldaPage() {
  const state = await getCreativeToolsState()
  if (state.kind !== 'ready')
    return (
      <ToolNotice
        name="Molda"
        unavailable={state.kind === 'unavailable'}
        readOnly={state.kind === 'readonly'}
      />
    )
  if (state.access.molda !== true || !state.journey.capabilities.includes('molda'))
    return <ToolNotice name="Molda" />
  return (
    <MoldaClient
      key={state.session.id}
      audience="adult"
      viewerId={state.session.id}
      studioAvailable={state.studioAvailable}
    />
  )
}
