import 'server-only'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { expireCookieOptions, prefixedCookieName } from '@/lib/cookies'
import { getSession } from '@/server/session'

type RouteHandler<Ctx> = (req: Request, ctx: Ctx) => Promise<Response> | Response

/** A sessão adulta resulta de senha/OTP. O cookie do portão antigo não concede acesso. */
export async function isParentVerifiedFor(accountId: string): Promise<boolean> {
  const user = await getSession()
  return user?.id === accountId && user.kids?.kind === 'parent'
}
export async function clearParentVerified(): Promise<void> {
  const prod = process.env.NODE_ENV === 'production'
  ;(await cookies()).set(prefixedCookieName('sz_kids_parent', prod), '', expireCookieOptions(prod))
}
/** Só usar em edição do próprio perfil: o Auth confere o dono e os campos permitidos. */
export function requireParentGate<Ctx>(handler: RouteHandler<Ctx>): RouteHandler<Ctx> {
  return async (req, ctx) => {
    const user = await getSession()
    if (!user?.kids && !user?.act)
      return NextResponse.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401 })
    return handler(req, ctx)
  }
}
export function requireParentGateAccountOnly<Ctx>(handler: RouteHandler<Ctx>): RouteHandler<Ctx> {
  return async (req, ctx) => {
    const user = await getSession()
    if (user?.kids?.kind !== 'parent')
      return NextResponse.json({ error: { code: 'PARENT_SESSION_REQUIRED' } }, { status: 403 })
    return handler(req, ctx)
  }
}
export function withParentClearedOnLogout<Ctx>(handler: RouteHandler<Ctx>): RouteHandler<Ctx> {
  return async (req, ctx) => {
    const response = await handler(req, ctx)
    if (response.ok) await clearParentVerified()
    return response
  }
}
export const withParentClearedOnPasswordChange = withParentClearedOnLogout
