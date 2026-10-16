import 'server-only'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { BROWSER_COOKIE } from '@/lib/cookies'
import { disconnectSession, requestSessionAccess, sessionRequest } from './session-transport'

const sessionSchema = z.object({
  credential: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  expiresAt: z.string().datetime(),
})
export async function getBrowserCredential() {
  return (await cookies()).get(BROWSER_COOKIE)?.value ?? null
}
export async function createBrowserSession(refreshToken: string) {
  const response = await sessionRequest('browser', 'exchange', { refreshToken })
  if (!response.ok) {
    await response.body?.cancel()
    return { ok: false as const, status: response.status }
  }
  return { ok: true as const, ...sessionSchema.parse(await response.json()) }
}
// No issuance cache: ordinary web JWTs have no gateway session introspection.
// Every data/UI request checks the stable credential against canonical revocation.
export const requestBrowserAccess = (credential: string) =>
  requestSessionAccess('browser', credential)
export const disconnectBrowserSession = (credential: string) =>
  disconnectSession('browser', credential)
