import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isReadonlyImpersonation } from '../lib/act'
import type { GatewayModule } from '../server/gateway'
import type { SessionModule } from '../server/session'

export function createProfilePreferencesRoutes(
  session: Pick<SessionModule, 'getSession'>,
  gateway: Pick<GatewayModule, 'gatewayFetch'>,
) {
  async function handle(req: Request) {
    const user = await session.getSession()
    if (!user)
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Sessão expirada.' } },
        { status: 401 },
      )
    if (user.status !== 'active' || (req.method === 'PUT' && isReadonlyImpersonation(user)))
      return NextResponse.json(
        {
          error: { code: 'FORBIDDEN', message: 'Não é possível alterar este perfil nesta sessão.' },
        },
        { status: 403 },
      )
    if (req.headers.get('x-sz-viewer') !== user.id)
      return NextResponse.json(
        { error: { code: 'VIEWER_CHANGED', message: 'O perfil mudou. Abra a página novamente.' } },
        { status: 409 },
      )
    let input: { theme: 'padrao' | 'pink' } | undefined
    if (req.method === 'PUT') {
      const raw = await req.text()
      if (raw.length > 1000)
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Tema inválido.' } },
          { status: 400 },
        )
      let value: unknown
      try {
        value = JSON.parse(raw)
      } catch {
        value = null
      }
      const parsed = z
        .object({ theme: z.enum(['padrao', 'pink']) })
        .strict()
        .safeParse(value)
      if (!parsed.success)
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Tema inválido.' } },
          { status: 400 },
        )
      input = parsed.data
    }
    const { status, body } = await gateway.gatewayFetch('/members/preferences/kids', {
      method: req.method === 'PUT' ? 'PUT' : 'GET',
      ...(input ? { body: input } : {}),
    })
    return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
  }
  return { GET: handle, PUT: handle }
}
