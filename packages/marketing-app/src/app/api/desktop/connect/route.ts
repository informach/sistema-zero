import { NextResponse } from 'next/server'
import { z } from 'zod'
import { forwardUpstream } from '@/server/forward'
import { desktopPairingRequest, gatewayFetch } from '@/server/gateway'
import { setDesktopSessionCookie } from '@/server/session'

const schema = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('start'),
      label: z.string().min(2).max(80),
      challenge: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
    })
    .strict(),
  z
    .object({
      action: z.literal('exchange'),
      deviceCode: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
      verifier: z.string().regex(/^[A-Za-z0-9._~-]{43,128}$/),
    })
    .strict(),
])
const connectedSchema = z.object({
  status: z.literal('connected'),
  deviceId: z.string().uuid(),
  userId: z.string().uuid(),
  credential: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  expiresAt: z.string().datetime(),
})
export async function GET() {
  return forwardUpstream(await gatewayFetch('/auth/desktop/session/validate', { method: 'POST' }))
}
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success)
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'Dados de conexão inválidos' } },
      { status: 400 },
    )
  const { action, ...input } = parsed.data
  const response = await desktopPairingRequest(action, input)
  if (response.status !== 200) return forwardUpstream(response)
  if (action === 'start') return forwardUpstream(response)
  const pending = z.object({ status: z.literal('pending') }).safeParse(response.body)
  if (pending.success) return NextResponse.json(pending.data)
  const result = connectedSchema.safeParse(response.body)
  if (!result.success)
    return NextResponse.json(
      { error: { code: 'INVALID_UPSTREAM', message: 'Resposta de conexão inválida' } },
      { status: 502 },
    )
  await setDesktopSessionCookie(result.data.credential, result.data.expiresAt)
  // No provider or app credentials are exposed to either renderer.
  return NextResponse.json({
    status: 'connected',
    deviceId: result.data.deviceId,
    userId: result.data.userId,
  })
}
