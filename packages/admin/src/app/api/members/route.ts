import { NextResponse } from 'next/server'
import type { MemberRow, MemberSummaryView, Paginated, UserView } from '@/lib/types'
import { listMembers } from '@/server/members'
import { batchGetUsers } from '@/server/users'

function num(value: string | null): number | undefined {
  if (!value) return undefined
  const n = Number(value)
  return Number.isInteger(n) && n >= 0 ? n : undefined
}

/**
 * Lista membros (área de membros) e HIDRATA nome/email do auth em lote. O members
 * é dono da lista (quem tem matrícula); a identidade vem do IdP. Hidratação é
 * best-effort: se o batch falhar, as linhas vêm com `user: null` (ainda úteis).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const { status, body } = await listMembers({
    status: searchParams.get('status') ?? undefined,
    courseRef: searchParams.get('courseRef') ?? undefined,
    limit: num(searchParams.get('limit')),
    offset: num(searchParams.get('offset')),
  })

  const page = body as Paginated<MemberSummaryView> | null
  if (status !== 200 || !page || !Array.isArray(page.items)) {
    // Falha upstream (members/gateway) pode vir com body fora do envelope
    // `{ error: { code, message } }` que o client espera — normaliza p/ a UI
    // mostrar mensagem amigável em vez do genérico "Algo deu errado.".
    const envelope = body as { error?: { code?: string; message?: string } } | null
    const normalized = envelope?.error?.message
      ? body
      : { error: { code: 'UPSTREAM_ERROR', message: 'Não foi possível carregar os membros.' } }
    return NextResponse.json(normalized, { status: status === 200 ? 502 : status })
  }

  const ids = page.items.map((m) => m.userId)
  const usersById = new Map<string, UserView>()
  if (ids.length > 0) {
    const hydration = await batchGetUsers(ids)
    if (hydration.status === 200 && hydration.body?.users) {
      for (const u of hydration.body.users) usersById.set(u.id, u)
    }
  }

  const items: MemberRow[] = page.items.map((m) => ({
    ...m,
    user: usersById.get(m.userId) ?? null,
  }))
  return NextResponse.json({ ...page, items }, { status: 200 })
}
