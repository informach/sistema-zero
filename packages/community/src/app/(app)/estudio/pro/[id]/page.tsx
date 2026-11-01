import { StudioProClient } from '@sistemazero/member-shell/components/creator/studio-pro-client'
import { redirect } from 'next/navigation'
import { ToolNotice } from '@/components/community/tool-notice'
import { toolLock } from '@/lib/tool-lock'
import { getCreativeToolsState } from '@/server/creative-tools'
import { getAdultCreatorServices } from '@/server/creator-services'
export const dynamic = 'force-dynamic'
export default async function AdultProPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ missao?: string; embed?: string }>
}) {
  const [{ id }, query, state] = await Promise.all([params, searchParams, getCreativeToolsState()])
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) redirect('/estudio')
  if (state.kind !== 'ready')
    return (
      <ToolNotice
        tool="estudio-pro"
        unavailable={state.kind === 'unavailable'}
        readOnly={state.kind === 'readonly'}
      />
    )
  if (!state.studioAvailable || !state.tier.pro)
    return <ToolNotice tool="estudio-pro" lock={toolLock('estudio-pro', state)} />
  const services = await getAdultCreatorServices()
  return (
    <StudioProClient
      audience="adult"
      {...services}
      viewerId={state.session.id}
      projectId={id}
      taskId={query.missao && /^[0-9a-f-]{36}$/i.test(query.missao) ? query.missao : null}
      // Num quadro por cima do jogo (lacunas, 01/11/2026): ao sair, avisa o jogo.
      incorporadoNoArquipelago={query.embed === 'arquipelago'}
      pintaOwned={state.access.pinta === true && state.journey.capabilities.includes('pinta')}
      moldaOwned={state.access.molda === true && state.journey.capabilities.includes('molda')}
    />
  )
}
