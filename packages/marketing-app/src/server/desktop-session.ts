import 'server-only'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { DESKTOP_COOKIE } from '@/lib/cookies'
import { getEnv } from '@/lib/env'
import { type DesktopAccess, DesktopAccessCache } from './desktop-access-cache'

declare global {
  var __szMktDesktopAccessCache: DesktopAccessCache | undefined
}
globalThis.__szMktDesktopAccessCache ??= new DesktopAccessCache()
const accessCache = globalThis.__szMktDesktopAccessCache
export function forgetDesktopAccess(credential: string) {
  accessCache.forget(getEnv().GATEWAY_URL, credential)
}

const accessSchema = z.object({
  accessToken: z.string().min(1),
  tokenType: z.literal('Bearer'),
  expiresIn: z.number().int().positive(),
})
export async function getDesktopCredential() {
  return (await cookies()).get(DESKTOP_COOKIE)?.value ?? null
}

/** Stable credential stays HttpOnly. Issued JWTs may be reused for gateway calls;
 * the gateway independently checks revocation and active membership on every call.
 * Local UI authorization requests a fresh issuance rather than relying on this cache. */
export async function requestDesktopAccess(
  credential: string,
  reuseIssuance = false,
): Promise<DesktopAccess> {
  if (reuseIssuance)
    return accessCache.get(getEnv().GATEWAY_URL, credential, () => requestDesktopAccess(credential))
  const response = await fetch(new URL('/auth/desktop/session/access', getEnv().GATEWAY_URL), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ credential }),
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) return { ok: false as const, status: response.status }
  const access = accessSchema.parse(await response.json())
  return { ok: true as const, ...access }
}
export async function disconnectDesktopSession(credential: string) {
  const response = await fetch(new URL('/auth/desktop/session/disconnect', getEnv().GATEWAY_URL), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ credential }),
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error('Não foi possível revogar a sessão. Tente novamente.')
  forgetDesktopAccess(credential)
}
