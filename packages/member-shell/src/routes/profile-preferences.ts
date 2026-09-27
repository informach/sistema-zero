import { PALETTES, readPalette } from '@sistemazero/core/palette'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isReadonlyImpersonation } from '../lib/act'
import { isProd } from '../lib/env'
import { encodePaletteCookie, PALETTE_COOKIE_MAX_AGE } from '../lib/palette-cookie'
import type { GatewayModule } from '../server/gateway'
import type { SessionModule } from '../server/session'

/** Derivado do catálogo, nunca reescrito: cor nova entra no core e esta borda a aceita sozinha. */
const PaletteBody = z.object({ palette: z.union([z.enum(PALETTES), z.null()]) }).strict()

export function createProfilePreferencesRoutes(
  session: Pick<SessionModule, 'getSession'>,
  gateway: Pick<GatewayModule, 'gatewayFetch'>,
  paletteCookie: string,
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
    // O irmão que entrou no meio de um clique em voo: a escolha não pode cair no perfil errado.
    if (req.headers.get('x-sz-viewer') !== user.id)
      return NextResponse.json(
        { error: { code: 'VIEWER_CHANGED', message: 'O perfil mudou. Abra a página novamente.' } },
        { status: 409 },
      )

    let input: { palette: string | null } | undefined
    if (req.method === 'PUT') {
      const raw = await req.text()
      if (raw.length > 1000)
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Cor inválida.' } },
          { status: 400 },
        )
      let value: unknown
      try {
        value = JSON.parse(raw)
      } catch {
        value = null
      }
      const parsed = PaletteBody.safeParse(value)
      if (!parsed.success)
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Cor inválida.' } },
          { status: 400 },
        )
      input = parsed.data
    }

    const { status, body } = await gateway.gatewayFetch<{ palette?: unknown }>(
      '/members/preferences',
      { method: req.method === 'PUT' ? 'PUT' : 'GET', ...(input ? { body: input } : {}) },
    )

    const res = NextResponse.json(body, {
      status,
      headers: { 'Cache-Control': 'private, no-store' },
    })
    // ⭐ O espelho em cookie é escrito AQUI, e é por isso que o seletor funciona sem recarregar:
    // um layout (Server Component) não pode gravar cookie; um route handler pode. O GET também
    // grava — é o auto-conserto de um espelho que ficou para trás.
    if (status >= 200 && status < 300) {
      res.cookies.set(paletteCookie, encodePaletteCookie(user.id, readPalette(body?.palette)), {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProd(),
        path: '/',
        maxAge: PALETTE_COOKIE_MAX_AGE,
      })
    }
    return res
  }
  return { GET: handle, PUT: handle }
}
