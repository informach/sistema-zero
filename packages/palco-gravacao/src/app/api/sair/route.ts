import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { clearSessionCookies } from '~/server/cookies'
import { logout } from '~/server/gateway'
import { REFRESH_COOKIE } from '~/server/session'

export async function POST(req: Request): Promise<Response> {
  const refreshToken = (await cookies()).get(REFRESH_COOKIE)?.value
  if (refreshToken) await logout(refreshToken)
  const res = NextResponse.redirect(new URL('/entrar', req.url), 303)
  clearSessionCookies(res)
  return res
}
