import { NextResponse } from 'next/server'
import { z } from 'zod'
import { forwardUpstream } from '@/server/forward'
import { gatewayFetch } from '@/server/gateway'

const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('describe'), code: z.string().min(8).max(20) }).strict(),
  z.object({ action: z.literal('approve'), code: z.string().min(8).max(20) }).strict(),
  z.object({ action: z.literal('revoke'), deviceId: z.string().uuid() }).strict(),
])
export async function GET() {
  return forwardUpstream(await gatewayFetch('/auth/desktop/devices'))
}
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success)
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'Código ou computador inválido' } },
      { status: 400 },
    )
  const input = parsed.data
  const response =
    input.action === 'revoke'
      ? await gatewayFetch(`/auth/desktop/devices/${input.deviceId}`, { method: 'DELETE' })
      : await gatewayFetch(`/auth/desktop/pairings/${input.action}`, {
          method: 'POST',
          body: { code: input.code },
        })
  return forwardUpstream(response)
}
