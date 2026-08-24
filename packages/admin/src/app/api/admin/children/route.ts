import { NextResponse } from 'next/server'
import { parseLimit, parseOffset } from '@/lib/list-params'
import { normalizeUpstreamError } from '@/lib/upstream'
import { getProfilesOverview, type ProfileOverviewView } from '@/server/members'
import { searchProfiles } from '@/server/users'

export interface ChildListRow {
  profileId: string
  name: string
  avatarUrl: string | null
  birthDate: string | null
  account: { id: string; email: string; firstName: string; lastName: string } | null
  /** Enriquecimento do members — `null` quando o members está fora (best-effort). */
  overview: ProfileOverviewView | null
}

/**
 * Listagem de CRIANÇAS do modo Kids: página da busca no AUTH (nome da criança OU
 * nome/e-mail do responsável) + enriquecimento em LOTE no MEMBERS (nível/XP/
 * ofensiva/última atividade/pendências). O members é BEST-EFFORT: fora → colunas
 * "—" (overview null), a lista continua — padrão do professor-overview.
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const q = url.searchParams.get('q')?.trim() || undefined
  const limit = parseLimit(url.searchParams.get('limit'))
  const offset = parseOffset(url.searchParams.get('offset'))

  const page = await searchProfiles({ q, limit, offset })
  if (page.status !== 200 || !page.body) {
    return NextResponse.json(normalizeUpstreamError(page.body), {
      status: page.status === 200 ? 502 : page.status,
    })
  }

  const ids = page.body.items.map((p) => p.id)
  const overview = ids.length > 0 ? await getProfilesOverview(ids, 'kids') : null
  const overviewById = new Map(
    overview?.status === 200 && overview.body
      ? overview.body.profiles.map((p) => [p.profileId, p])
      : [],
  )

  const items: ChildListRow[] = page.body.items.map((p) => ({
    profileId: p.id,
    name: p.name,
    avatarUrl: p.avatarUrl,
    birthDate: p.birthDate,
    account: p.account,
    overview: overviewById.get(p.id) ?? null,
  }))
  return NextResponse.json({ items, total: page.body.total }, { status: 200 })
}
