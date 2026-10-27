import { NextResponse } from 'next/server'
import { moldaToolAccessFor } from '@/lib/molda-tool-access'
import { getCreativeTools } from '@/server/creator-journey'
import { getSession } from '@/server/session'

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
  return NextResponse.json(
    {
      situacao: disponivel ? 'disponivel' : 'bloqueada',
      ...(id === 'molda' && disponivel && journey
        ? { toolAccess: moldaToolAccessFor({ journey }) ?? null }
        : {}),
    },
    { headers: { 'cache-control': 'no-store' } },
  )
}
