import { NextResponse } from 'next/server'
import type { Paginated, TeamMember } from '@/lib/types'
import { TEAM_ROLES } from '@/lib/types'
import { forwardUpstream } from '@/server/forward'
import { gatewayFetch } from '@/server/gateway'

interface AuthUserView {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
}

// Micro-cache do time (TTL 60s) em `globalThis` (mesma lição do single-flight
// do refresh: escopo de módulo duplica por bundle do Turbopack). A lista é a
// MESMA p/ qualquer operador logado (todos staff+) — sem risco de vazamento
// entre sessões. ⚠️ Por processo → réplica única (como o resto do app).
const teamGlobal = globalThis as typeof globalThis & {
  __szMktTeamCache?: { at: number; items: TeamMember[] }
}

const TEAM_CACHE_TTL_MS = 60_000

/**
 * Equipe p/ o select de responsável do pipeline: `GET /auth/admin/users` via
 * gateway, UMA busca POR PAPEL de equipe → `{ id, name, role }[]`. Filtrar no
 * servidor (`?role=`) em vez de filtrar a lista geral aqui: a base tem
 * clientes aos milhares e a equipe não caberia na primeira página.
 */
export async function GET() {
  const cached = teamGlobal.__szMktTeamCache
  if (cached && Date.now() - cached.at < TEAM_CACHE_TTL_MS) {
    return NextResponse.json(cached.items)
  }

  // Paralelo é seguro: o refresh-on-401 do gatewayFetch é single-flight.
  const results = await Promise.all(
    TEAM_ROLES.map((role) =>
      gatewayFetch<Paginated<AuthUserView>>('/auth/admin/users', { query: { role, limit: 100 } }),
    ),
  )
  const failed = results.find((r) => r.status >= 400)
  if (failed) return forwardUpstream({ status: failed.status, body: failed.body })

  const items: TeamMember[] = results
    .flatMap((r) => r.body?.items ?? [])
    .map((u) => ({
      id: u.id,
      name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email,
      role: u.role,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

  teamGlobal.__szMktTeamCache = { at: Date.now(), items }
  return NextResponse.json(items)
}
