import { MORADA_LIMITS, MoradaHouseSchema } from '@sistemazero/core/morada/schema'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isReadonlyImpersonation } from '../lib/act'
import type { GatewayModule } from '../server/gateway'
import type { SessionModule } from '../server/session'

const Body = z.strictObject({
  house: MoradaHouseSchema,
  revision: z.number().int().nonnegative(),
  scope: z.enum(['room', 'house']).optional(),
})

export function createMoradaHouseRoutes(
  session: Pick<SessionModule, 'getSession' | 'audience'>,
  gateway: Pick<GatewayModule, 'gatewayFetch'>,
) {
  return {
    GET: async () => {
      if (!(await session.getSession()))
        return NextResponse.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401 })
      const result = await gateway.gatewayFetch('/members/house', {
        query: { audience: session.audience },
      })
      return NextResponse.json(result.body, {
        status: result.status,
        headers: { 'cache-control': 'private, no-store' },
      })
    },
    PUT: async (request: Request) => {
      const user = await session.getSession()
      if (!user) return NextResponse.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401 })
      if (isReadonlyImpersonation(user))
        return NextResponse.json({ error: { code: 'IMPERSONATION_READONLY' } }, { status: 403 })
      const reader = request.body?.getReader()
      const chunks: Uint8Array[] = []
      let length = 0
      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          length += value.byteLength
          if (length > MORADA_LIMITS.bytes + 1024) {
            await reader.cancel()
            return NextResponse.json({ error: { code: 'PAYLOAD_TOO_LARGE' } }, { status: 413 })
          }
          chunks.push(value)
        }
      }
      const bytes = new Uint8Array(length)
      let offset = 0
      for (const chunk of chunks) {
        bytes.set(chunk, offset)
        offset += chunk.byteLength
      }
      let value: unknown
      try {
        value = JSON.parse(new TextDecoder().decode(bytes))
      } catch {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Casa inválida.' } },
          { status: 400 },
        )
      }
      const parsed = Body.safeParse(value)
      if (!parsed.success)
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Casa inválida.' } },
          { status: 400 },
        )
      const result = await gateway.gatewayFetch('/members/house', {
        method: 'PUT',
        query: { audience: session.audience },
        body: parsed.data,
      })
      return NextResponse.json(result.body, {
        status: result.status,
        headers: { 'cache-control': 'private, no-store' },
      })
    },
  }
}
