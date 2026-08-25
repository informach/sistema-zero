'use client'

import { Badge } from '@sistemazero/ui/badge'
import { Card } from '@sistemazero/ui/card'
import { Input } from '@sistemazero/ui/input'
import { Pagination } from '@sistemazero/ui/pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@sistemazero/ui/table'
import { Search } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { ChildListRow } from '@/app/api/admin/children/route'
import { AdminHeader } from '@/components/admin/admin-header'
import { TableSkeletonRows } from '@/components/admin/table-skeleton'
import { ageFrom } from '@/lib/age'
import { type ApiError, apiGet } from '@/lib/api'
import { relativeCivilDayLabel } from '@/lib/format'
import { STUDENT_RANK_LABELS } from '@/lib/student-rank'

const LIMIT = 20

/**
 * Listagem de CRIANÇAS (modo Kids): a criança é a entidade de primeira classe —
 * busca pelo NOME dela (ou do responsável), idade em vez de e-mail, nível/XP,
 * ofensiva, última atividade e pendências de entrega. A linha abre a ficha da
 * família FOCADA na criança (`?learner=`).
 */
export function ChildrenClient() {
  const [items, setItems] = useState<ChildListRow[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) })
      if (q.trim()) params.set('q', q.trim())
      const page = await apiGet<{ items: ChildListRow[]; total: number }>(
        `/api/admin/children?${params}`,
      )
      setItems(page.items)
      setTotal(page.total)
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Falha ao carregar as crianças.')
    } finally {
      setLoading(false)
    }
  }, [offset, q])

  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Alunos"
        description="As crianças da plataforma Kids — busque pelo nome da criança ou do responsável."
      />

      <div className="relative">
        <Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2.5 size-4 text-muted-foreground" />
        <Input
          placeholder="Nome da criança ou responsável…"
          value={q}
          onChange={(e) => {
            setOffset(0)
            setQ(e.target.value)
          }}
          className="pl-8"
        />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Criança</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Nível</TableHead>
              <TableHead>Ofensiva</TableHead>
              <TableHead>Última atividade</TableHead>
              <TableHead>Pendências</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeletonRows columns={6} />
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  {q.trim() ? 'Nenhuma criança encontrada.' : 'Nenhum perfil de criança ainda.'}
                </TableCell>
              </TableRow>
            ) : (
              items.map((child) => {
                const age = ageFrom(child.birthDate)
                const last = relativeCivilDayLabel(child.overview?.lastActivityDate)
                const pending = child.overview?.pendingSubmissions ?? 0
                return (
                  <TableRow key={child.profileId} className="hover:bg-muted/50">
                    <TableCell>
                      {/* A ficha é a da FAMÍLIA — perfil sem conta (órfão de
                          conta apagada) não tem destino, então fica sem link. */}
                      {child.account ? (
                        <Link
                          href={`/admin/membros/${encodeURIComponent(child.account.id)}?learner=${encodeURIComponent(child.profileId)}`}
                          className="flex items-center gap-2"
                        >
                          <ChildIdentity child={child} age={age} />
                        </Link>
                      ) : (
                        <span className="flex items-center gap-2">
                          <ChildIdentity child={child} age={age} />
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {child.account ? (
                        <Link href={`/admin/membros/${encodeURIComponent(child.account.id)}`}>
                          <div>{`${child.account.firstName} ${child.account.lastName}`.trim()}</div>
                          <div className="text-xs">{child.account.email}</div>
                        </Link>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      {child.overview ? (
                        <>
                          <div className="text-sm">
                            {STUDENT_RANK_LABELS[child.overview.levelSlug] ??
                              child.overview.levelSlug}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {child.overview.xp} XP
                          </div>
                        </>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {child.overview && child.overview.streakCurrent > 0
                        ? `${child.overview.streakCurrent} ${child.overview.streakCurrent === 1 ? 'dia' : 'dias'}`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{last ?? 'Nunca'}</TableCell>
                    <TableCell>
                      {pending > 0 ? (
                        <Link
                          href={`/admin/professor/entregas?userId=${encodeURIComponent(child.profileId)}`}
                        >
                          <Badge variant="destructive">
                            {pending} {pending === 1 ? 'entrega' : 'entregas'}
                          </Badge>
                        </Link>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <Pagination total={total} limit={LIMIT} offset={offset} onChange={setOffset} />
    </div>
  )
}

/** Avatar + nome + idade — o miolo da célula, com ou sem link (conta apagada). */
function ChildIdentity({ child, age }: { child: ChildListRow; age: number | null }) {
  return (
    <>
      <ChildAvatar name={child.name} avatarUrl={child.avatarUrl} />
      <span className="font-medium">
        {child.name}
        {age !== null ? <span className="text-muted-foreground"> · {age} anos</span> : null}
      </span>
    </>
  )
}

function ChildAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    return (
      // biome-ignore lint/performance/noImgElement: avatar de R2 (URL externa arbitrária)
      <img
        src={avatarUrl}
        alt={name}
        className="size-8 rounded-full border border-border object-cover"
      />
    )
  }
  return (
    <span className="flex size-8 items-center justify-center rounded-full bg-[color:var(--primary)]/15 font-semibold text-xs">
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  )
}
