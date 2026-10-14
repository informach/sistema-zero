import { NextResponse } from 'next/server'
import type { FamilyAccount } from '@/lib/live-teachers'
import { isAdminRole } from '@/lib/types'
import { normalizeUpstreamError } from '@/lib/upstream'
import { getSession } from '@/server/session'
import { batchGetUsers } from '@/server/users'

const UUID = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i

/**
 * Nome e e-mail do responsável de cada conta, em lote (até 100). Usado pela lista de inscrições
 * das oficinas ao vivo: a vaga guarda só o id da conta. Só devolve id, nome e e-mail.
 */
export async function POST(req: Request) {
  const user = await getSession()
  if (user?.status !== 'active' || !isAdminRole(user.role))
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Entre novamente para continuar.' } },
      { status: 401 },
    )
  const json = (await req.json().catch(() => null)) as { ids?: unknown } | null
  const raw = Array.isArray(json?.ids) ? json.ids : null
  const ids = raw ? [...new Set(raw)] : []
  if (
    !raw ||
    !ids.length ||
    ids.length > 100 ||
    !ids.every((id): id is string => typeof id === 'string' && UUID.test(id))
  )
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'Envie de 1 a 100 contas.' } },
      { status: 400 },
    )
  const result = await batchGetUsers(ids as string[])
  if (result.status !== 200 || !result.body)
    return NextResponse.json(normalizeUpstreamError(result.body), {
      status: result.status === 200 ? 502 : result.status,
    })
  const accounts: FamilyAccount[] = result.body.users.map((account) => ({
    id: account.id,
    name: `${account.firstName ?? ''} ${account.lastName ?? ''}`.trim(),
    email: account.email,
  }))
  return NextResponse.json({ accounts }, { headers: { 'Cache-Control': 'private, no-store' } })
}
