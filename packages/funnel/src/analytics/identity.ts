import { createHmac, timingSafeEqual } from 'node:crypto'
import { readCookie } from '../lib/admin-auth'
import { ANALYTICS_PREFERENCE_COOKIE, analyticsEnabled } from './preference'
import { ANALYTICS_COOKIE_DAYS } from './types'

const VISITOR_COOKIE = 'sz_visitor'
const mac = (id: string, secret: string) =>
  createHmac('sha256', secret).update(`analytics:v1:${id}`).digest('hex')
export function visitorId(request: Request, secret: string): string | null {
  const token = readCookie(request, VISITOR_COOKIE)
  if (!token || !/^[a-f0-9-]{36}\.[a-f0-9]{64}$/.test(token)) return null
  const [id, signature] = token.split('.') as [string, string]
  return timingSafeEqual(Buffer.from(signature), Buffer.from(mac(id, secret))) ? id : null
}
export const isAnalyticsEnabled = (request: Request) =>
  analyticsEnabled(readCookie(request, ANALYTICS_PREFERENCE_COOKIE))
export function analyticsCookie(
  name: string,
  value: string,
  secure: boolean,
  age = ANALYTICS_COOKIE_DAYS * 86400,
) {
  return `${name}=${value}; Path=/; SameSite=Lax; Max-Age=${age}${name === VISITOR_COOKIE ? '; HttpOnly' : ''}${secure ? '; Secure' : ''}`
}
export const visitorCookie = (id: string, secret: string, secure: boolean) =>
  analyticsCookie(VISITOR_COOKIE, `${id}.${mac(id, secret)}`, secure)
export const clearVisitorCookie = (secure: boolean) =>
  analyticsCookie(VISITOR_COOKIE, '', secure, 0)

export function sameOrigin(request: Request): boolean {
  return (
    request.headers.get('origin') === new URL(request.url).origin &&
    request.headers.get('sec-fetch-site') !== 'cross-site'
  )
}
