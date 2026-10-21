import 'server-only'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { isSameOriginRequest } from '@/lib/csrf'
import type { SessionUser } from '@/lib/types'
import { tryRefresh } from './gateway'
import { type AccessVerdict, getAccessToken, getRefreshToken, verifyAccessToken } from './session'

/**
 * Autoriza rotas locais que não passam pelo gateway. Revalida o token, tenta uma
 * única renovação e aplica a mesma proteção de origem usada pelo painel.
 */
export async function requireLocalAdminSession(
  forbiddenMessage = 'Sem permissão para realizar esta operação.',
  /**
   * `staff` também passa: a professora de uma turma pode ser da equipe sem ser admin (a gravação
   * do encontro é publicada por ela). A autorização fina continua no members.
   */
  { allowStaff = false, signal }: { allowStaff?: boolean; signal?: AbortSignal } = {},
): Promise<SessionUser | NextResponse> {
  signal?.throwIfAborted()
  const requestHeaders = await headers()
  signal?.throwIfAborted()
  if (
    !isSameOriginRequest({
      secFetchSite: requestHeaders.get('sec-fetch-site'),
      origin: requestHeaders.get('origin'),
      host: requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host'),
    })
  ) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Origem não permitida.' } },
      { status: 403 },
    )
  }

  const access = await getAccessToken()
  const refresh = await getRefreshToken()
  let verdict: AccessVerdict =
    access && refresh ? await verifyAccessToken(access) : { ok: false, expired: false }
  signal?.throwIfAborted()
  if (!verdict.ok && verdict.expired) {
    const renewed = await tryRefresh(signal)
    if (renewed) verdict = await verifyAccessToken(renewed)
  }
  signal?.throwIfAborted()
  if (!verdict.ok) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Sessão expirada. Faça login novamente.' } },
      { status: 401 },
    )
  }

  const session = verdict.user
  if (
    session.role !== 'superadmin' &&
    session.role !== 'admin' &&
    !(allowStaff && session.role === 'staff')
  ) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: forbiddenMessage } },
      { status: 403 },
    )
  }
  if (session.status !== 'active') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Conta sem acesso.' } },
      { status: 403 },
    )
  }
  return session
}
