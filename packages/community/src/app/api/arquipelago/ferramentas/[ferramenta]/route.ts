import { adultMoldaToolAccess } from '@sistemazero/member-shell/lib/adult-molda-tool-access'
import { isPrivilegedRole } from '@sistemazero/member-shell/lib/studio-tier'
import { NextResponse } from 'next/server'
import { getCreativeToolsState } from '@/server/creative-tools'
import { getAdultCreatorServices } from '@/server/creator-services'
import { getSession } from '@/server/session'

export async function GET(_request: Request, context: { params: Promise<{ ferramenta: string }> }) {
  const { ferramenta } = await context.params
  if (ferramenta === 'avatar') {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    return NextResponse.json(
      session.act ? { situacao: 'bloqueada' } : { situacao: 'disponivel', viewerId: session.id },
      { headers: { 'cache-control': 'private, no-store' } },
    )
  }
  if (!['pinta', 'molda', 'estudio'].includes(ferramenta))
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  const state = await getCreativeToolsState()
  if (state.kind === 'unavailable')
    return NextResponse.json({ situacao: 'indisponivel' }, { status: 503 })
  if (state.kind === 'readonly' || (state.kind === 'ready' && state.session.act))
    return NextResponse.json(
      { situacao: 'bloqueada' },
      { headers: { 'cache-control': 'no-store' } },
    )
  const disponivel =
    ferramenta === 'estudio'
      ? state.studioAvailable
      : ferramenta === 'pinta'
        ? state.access.pinta === true && state.journey.capabilities.includes('pinta')
        : state.access.molda === true && state.journey.capabilities.includes('molda')
  const studioConfig =
    ferramenta === 'estudio' && disponivel
      ? {
          viewerId: state.session.id,
          tier: state.tier,
          showExamples: isPrivilegedRole(state.session.role),
          showPythonCreation: state.showPythonCreation,
          pintaOwned: state.access.pinta === true && state.journey.capabilities.includes('pinta'),
          moldaOwned: state.access.molda === true && state.journey.capabilities.includes('molda'),
          ...(await getAdultCreatorServices()),
        }
      : null
  return NextResponse.json(
    {
      situacao: disponivel ? 'disponivel' : 'bloqueada',
      ...(disponivel ? { viewerId: state.session.id } : {}),
      ...(disponivel && ferramenta !== 'estudio' ? { studioAvailable: state.studioAvailable } : {}),
      ...(ferramenta === 'molda' && disponivel
        ? { toolAccess: adultMoldaToolAccess(state.journey) ?? null }
        : {}),
      ...(studioConfig ? { studioConfig } : {}),
    },
    { headers: { 'cache-control': 'no-store' } },
  )
}
