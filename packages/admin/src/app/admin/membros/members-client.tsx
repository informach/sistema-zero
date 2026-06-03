'use client'

import { ChevronRight, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import { MembersTabs } from '@/components/admin/members-tabs'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { type ApiError, apiGet } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { ENTITLEMENT_STATUSES, type MemberRow, type Paginated } from '@/lib/types'

const LIMIT = 20

const STATUS_LABELS: Record<string, string> = {
  active: 'Com acesso ativo',
  revoked: 'Com matrícula revogada',
  expired: 'Com matrícula expirada',
  pending: 'Com matrícula pendente',
}

export function MembersClient() {
  const router = useRouter()
  const [items, setItems] = useState<MemberRow[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [status, setStatus] = useState('')
  const [courseRef, setCourseRef] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) })
      if (status) params.set('status', status)
      if (courseRef.trim()) params.set('courseRef', courseRef.trim())
      const page = await apiGet<Paginated<MemberRow>>(`/api/members?${params}`)
      setItems(page.items)
      setTotal(page.total)
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Falha ao carregar membros.')
    } finally {
      setLoading(false)
    }
  }, [offset, status, courseRef])

  // Debounce do filtro de curso + recarga ao mudar filtros/página.
  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  function open(userId: string) {
    router.push(`/admin/membros/${userId}`)
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Membros"
        description="Alunos com matrícula. Veja o acesso de cada um, conceda e revogue manualmente."
      />
      <MembersTabs />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filtrar por curso (slug)…"
            value={courseRef}
            onChange={(e) => {
              setOffset(0)
              setCourseRef(e.target.value)
            }}
            className="pl-8"
          />
        </div>
        <Select
          value={status}
          onChange={(e) => {
            setOffset(0)
            setStatus(e.target.value)
          }}
          className="sm:w-60"
        >
          <option value="">Todos os membros</option>
          {ENTITLEMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s] ?? s}
            </option>
          ))}
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Membro</TableHead>
              <TableHead>Matrículas</TableHead>
              <TableHead>Cursos</TableHead>
              <TableHead>Último acesso</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  <Spinner className="mx-auto" />
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Nenhum membro encontrado.
                </TableCell>
              </TableRow>
            ) : (
              items.map((m) => (
                <TableRow key={m.userId} className="cursor-pointer" onClick={() => open(m.userId)}>
                  <TableCell>
                    {m.user ? (
                      <>
                        <div className="font-medium">
                          {m.user.firstName} {m.user.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground">{m.user.email}</div>
                      </>
                    ) : (
                      <>
                        <div className="font-mono text-xs">{m.userId}</div>
                        <div className="text-xs text-muted-foreground">identidade indisponível</div>
                      </>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{m.activeCount}</span>
                    <span className="text-muted-foreground"> / {m.totalCount}</span>
                    <span className="ml-1 text-xs text-muted-foreground">ativas</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.courseRefs.length === 0 ? (
                      '—'
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {m.courseRefs.slice(0, 3).map((c) => (
                          <Badge key={c} variant="outline">
                            {c}
                          </Badge>
                        ))}
                        {m.courseRefs.length > 3 ? (
                          <span className="text-xs">+{m.courseRefs.length - 3}</span>
                        ) : null}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(m.lastGrantedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <ChevronRight className="ml-auto size-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Pagination total={total} limit={LIMIT} offset={offset} onChange={setOffset} />
    </div>
  )
}
