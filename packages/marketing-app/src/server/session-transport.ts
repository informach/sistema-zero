import 'server-only'
import { retryAfterMilliseconds } from '@sistemazero/marketing-contracts'
import { z } from 'zod'
import { getEnv } from '@/lib/env'
import { clientForwardHeaders } from './client-headers'

const accessSchema = z.object({
  accessToken: z.string().min(1),
  tokenType: z.literal('Bearer'),
  expiresIn: z.number().int().positive(),
})
export async function sessionRequest(
  kind: 'browser' | 'desktop',
  action: 'exchange' | 'access' | 'disconnect',
  body: unknown,
) {
  return fetch(new URL(`/auth/${kind}/session/${action}`, getEnv().GATEWAY_URL), {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(await clientForwardHeaders()) },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  })
}
export async function requestSessionAccess(kind: 'browser' | 'desktop', credential: string) {
  const response = await sessionRequest(kind, 'access', { credential })
  if (!response.ok) {
    await response.body?.cancel()
    return {
      ok: false as const,
      status: response.status,
      retryAfterMs: retryAfterMilliseconds(response.headers.get('retry-after')),
    }
  }
  return { ok: true as const, ...accessSchema.parse(await response.json()) }
}
export async function disconnectSession(kind: 'browser' | 'desktop', credential: string) {
  const response = await sessionRequest(kind, 'disconnect', { credential })
  await response.body?.cancel()
  if (!response.ok) throw new Error('Não foi possível revogar a sessão. Tente novamente.')
}
