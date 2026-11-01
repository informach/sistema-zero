import type { NextResponse } from 'next/server'
import { isProd } from './env'
import type { AuthTokens } from './gateway'
import { ACCESS_COOKIE, REFRESH_COOKIE } from './session'

/** Os cookies da sessão da equipe no palco: só deste domínio, nunca lidos pelo navegador. */
export function setSessionCookies(res: NextResponse, tokens: AuthTokens): void {
  const base = { httpOnly: true, sameSite: 'lax' as const, secure: isProd(), path: '/' }
  // O cookie de acesso vive o tempo do refresh; o vencimento curto do JWT é o que faz renovar.
  res.cookies.set(ACCESS_COOKIE, tokens.accessToken, { ...base, maxAge: tokens.refreshExpiresIn })
  res.cookies.set(REFRESH_COOKIE, tokens.refreshToken, { ...base, maxAge: tokens.refreshExpiresIn })
}

export function clearSessionCookies(res: NextResponse): void {
  const gone = { httpOnly: true, sameSite: 'lax' as const, secure: isProd(), path: '/', maxAge: 0 }
  res.cookies.set(ACCESS_COOKIE, '', gone)
  res.cookies.set(REFRESH_COOKIE, '', gone)
}
