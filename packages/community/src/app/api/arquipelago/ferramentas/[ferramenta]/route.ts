import { adultMoldaToolAccess } from '@sistemazero/member-shell/lib/adult-molda-tool-access'
import { NextResponse } from 'next/server'
import { getCreativeToolsState } from '@/server/creative-tools'

export async function GET(_request: Request, context: { params: Promise<{ ferramenta: string }> }) {
  const { ferramenta } = await context.params
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
  return NextResponse.json(
    {
      situacao: disponivel ? 'disponivel' : 'bloqueada',
      ...(ferramenta === 'molda' && disponivel
        ? { toolAccess: adultMoldaToolAccess(state.journey) ?? null }
        : {}),
    },
    { headers: { 'cache-control': 'no-store' } },
  )
}
