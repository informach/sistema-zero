import type { ArquipelagoStudioConfig } from '@sistemazero/member-shell/lib/arquipelago-studio'
import { isPrivilegedRole } from '@sistemazero/member-shell/lib/studio-tier'
import { canShowPythonCreation } from '@sistemazero/member-shell/server/studio-unlocks'
import { NextResponse } from 'next/server'
import { moldaToolAccessFor } from '@/lib/molda-tool-access'
import { getCreativeTools } from '@/server/creator-journey'
import { getStudioUnlocksReadonly } from '@/server/members'
import { getSession } from '@/server/session'
import { studioGate } from '@/server/studio-gate'
import { prepareStudioServices } from '@/server/studio-services'

export async function GET(_request: Request, context: { params: Promise<{ ferramenta: string }> }) {
  const { ferramenta } = await context.params
  const id = ferramenta === 'estudio' ? 'estudio-completo' : ferramenta
  if (!['pinta', 'molda', 'estudio-completo'].includes(id))
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  const session = await getSession()
  if (!session?.activeProfile || session.kids?.kind === 'parent')
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (session.act)
    return NextResponse.json(
      { situacao: 'bloqueada' },
      { headers: { 'cache-control': 'no-store' } },
    )
  const { tools, journey } = await getCreativeTools()
  const tool = tools.find((item) => item.id === id)
  if (
    !tool ||
    tool.state === 'unavailable' ||
    (id === 'estudio-completo' && tool.studioCurriculum === 'unavailable')
  )
    return NextResponse.json({ situacao: 'indisponivel' }, { status: 503 })
  const disponivel =
    tool.state === 'available' && (id !== 'estudio-completo' || tool.studioCurriculum === 'ready')
  if (id === 'molda' && disponivel && !journey)
    return NextResponse.json({ situacao: 'indisponivel' }, { status: 503 })
  let studioConfig: ArquipelagoStudioConfig | null = null
  if (id === 'estudio-completo' && disponivel) {
    if (!journey) return NextResponse.json({ situacao: 'indisponivel' }, { status: 503 })
    const unlocks = await getStudioUnlocksReadonly().catch(() => null)
    const gate = studioGate(journey, unlocks)
    if (gate.kind !== 'open')
      return NextResponse.json({ situacao: 'indisponivel' }, { status: 503 })
    const services = await prepareStudioServices()(session, journey)
    studioConfig = {
      viewerId: session.id,
      tier: gate.tier,
      showExamples: isPrivilegedRole(session.role),
      showPythonCreation: canShowPythonCreation(
        session.role,
        unlocks?.status === 200 && unlocks.body ? unlocks.body.blocks : [],
      ),
      pintaOwned: tools.find((item) => item.id === 'pinta')?.owned === true,
      moldaOwned: tools.find((item) => item.id === 'molda')?.owned === true,
      ...services,
    }
  }
  return NextResponse.json(
    {
      situacao: disponivel ? 'disponivel' : 'bloqueada',
      ...(disponivel ? { viewerId: session.id } : {}),
      ...(disponivel && id !== 'estudio-completo'
        ? {
            studioAvailable: tools.some(
              (item) =>
                item.id === 'estudio-completo' &&
                item.state === 'available' &&
                item.studioCurriculum === 'ready',
            ),
          }
        : {}),
      ...(id === 'molda' && disponivel && journey
        ? { toolAccess: moldaToolAccessFor({ journey }) ?? null }
        : {}),
      ...(studioConfig ? { studioConfig } : {}),
    },
    { headers: { 'cache-control': 'no-store' } },
  )
}
