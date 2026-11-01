import { NextResponse } from 'next/server'
import { setSessionCookies } from '~/server/cookies'
import { login } from '~/server/gateway'
import { verifyAccess } from '~/server/session'

/**
 * A entrada da equipe: e-mail e senha da conta no auth do ambiente. Só uma conta da equipe
 * fica: qualquer outra sessão que o auth devolva é recusada aqui, sem cookie.
 */
export async function POST(req: Request): Promise<Response> {
  const form = await req.formData().catch(() => null)
  const email = String(form?.get('email') ?? '').trim()
  const password = String(form?.get('senha') ?? '')
  const volta = String(form?.get('volta') ?? '/')
  const back = volta.startsWith('/') && !volta.startsWith('//') ? volta : '/'
  const fail = (motivo: string) => {
    const url = new URL('/entrar', req.url)
    url.searchParams.set('erro', motivo)
    url.searchParams.set('volta', back)
    return NextResponse.redirect(url, 303)
  }
  if (!email || !password) return fail('vazio')
  const tokens = await login(email, password)
  if (!tokens) return fail('senha')
  if (!(await verifyAccess(tokens.accessToken)).ok) return fail('equipe')
  const res = NextResponse.redirect(new URL(back, req.url), 303)
  setSessionCookies(res, tokens)
  return res
}
