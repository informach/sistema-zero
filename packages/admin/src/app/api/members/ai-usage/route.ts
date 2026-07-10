import { NextResponse } from 'next/server'
import type { AiUsageStatsView, AiUsageTopAccountView, UserView } from '@/lib/types'
import { normalizeUpstreamError } from '@/lib/upstream'
import { getAiUsageStats } from '@/server/members'
import { batchGetUsers } from '@/server/users'

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/

/**
 * Uso de IA por conta (quota diária/mensal): agregados do mês vindos do members
 * + identidade das top contas HIDRATADA do auth em lote (best-effort — sem o
 * batch as linhas vêm só com o id, ainda úteis).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const monthRaw = searchParams.get('month') ?? undefined
  if (monthRaw && !MONTH_RE.test(monthRaw)) {
    return NextResponse.json(
      { error: { code: 'INVALID_MONTH', message: 'Mês inválido (use AAAA-MM).' } },
      { status: 400 },
    )
  }

  const { status, body } = await getAiUsageStats(monthRaw)
  const stats = body as
    | (Omit<AiUsageStatsView, 'topAccounts'> & {
        topAccounts: { accountId: string; used: number; privileged: boolean }[]
      })
    | null
  if (status !== 200 || !stats || !Array.isArray(stats.topAccounts)) {
    const envelope = body as { error?: { code?: string; message?: string } } | null
    const normalized = envelope?.error?.message
      ? normalizeUpstreamError(body)
      : { error: { code: 'UPSTREAM_ERROR', message: 'Não foi possível carregar o uso de IA.' } }
    return NextResponse.json(normalized, { status: status === 200 ? 502 : status })
  }

  const ids = stats.topAccounts.map((a) => a.accountId)
  const usersById = new Map<string, UserView>()
  if (ids.length > 0) {
    const hydration = await batchGetUsers(ids)
    if (hydration.status === 200 && hydration.body?.users) {
      for (const u of hydration.body.users) usersById.set(u.id, u)
    }
  }

  const topAccounts: AiUsageTopAccountView[] = stats.topAccounts.map((a) => {
    const user = usersById.get(a.accountId)
    return {
      ...a,
      name: user ? `${user.firstName} ${user.lastName}`.trim() || undefined : undefined,
      email: user?.email,
    }
  })
  return NextResponse.json({ ...stats, topAccounts } satisfies AiUsageStatsView, { status: 200 })
}
