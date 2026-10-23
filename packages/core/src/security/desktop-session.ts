import { normalizePolicyPath } from './kids-session'
export type DesktopSessionClaim = { app: 'marketing'; deviceId: string; sessionId: string }
const id = (v: unknown): v is string =>
  typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
export function parseDesktopSessionClaim(value: unknown): DesktopSessionClaim | null {
  if (
    !value ||
    typeof value !== 'object' ||
    !('app' in value) ||
    !('deviceId' in value) ||
    !('sessionId' in value)
  )
    return null
  if (value.app !== 'marketing' || !id(value.deviceId) || !id(value.sessionId)) return null
  return { app: 'marketing', deviceId: value.deviceId, sessionId: value.sessionId }
}
export function desktopMayAccess(raw: string, method: string) {
  const path = normalizePolicyPath(raw)
  if (!path) return false
  if (path.startsWith('/marketing/')) return true
  if (method === 'GET' && ['/auth/me', '/auth/desktop/devices'].includes(path)) return true
  return false
}
