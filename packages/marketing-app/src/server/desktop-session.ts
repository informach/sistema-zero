import 'server-only'
import { cookies } from 'next/headers'
import { DESKTOP_COOKIE } from '@/lib/cookies'
import { getEnv } from '@/lib/env'
import { type DesktopAccess, DesktopAccessCache } from './desktop-access-cache'
import { disconnectSession, requestSessionAccess } from './session-transport'

declare global {
  var __szMktDesktopAccessCache: DesktopAccessCache | undefined
}
globalThis.__szMktDesktopAccessCache ??= new DesktopAccessCache()
const accessCache = globalThis.__szMktDesktopAccessCache
export function forgetDesktopAccess(credential: string) {
  accessCache.forget(getEnv().GATEWAY_URL, credential)
}

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
  return requestSessionAccess('desktop', credential)
}
export async function disconnectDesktopSession(credential: string) {
  await disconnectSession('desktop', credential)
  forgetDesktopAccess(credential)
}
