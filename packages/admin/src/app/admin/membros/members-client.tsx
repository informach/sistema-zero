'use client'

import { Badge } from '@sistemazero/ui/badge'
import { Card } from '@sistemazero/ui/card'
import { Input } from '@sistemazero/ui/input'
import { Pagination } from '@sistemazero/ui/pagination'
import { Select } from '@sistemazero/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@sistemazero/ui/table'
import { ChevronRight, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import { EmptyState, LoadError } from '@/components/admin/empty-state'
import { AlunosTabs } from '@/components/admin/section-tabs'
import { TableSkeletonRows } from '@/components/admin/table-skeleton'
import { type ApiError, apiGet } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { ENTITLEMENT_STATUSES, type MemberRow, type Paginated } from '@/lib/types'

const LIMIT = 20

const STATUS_LABELS: Record<string, string> = {
  active: 'Com acesso ativo',
  revoked: 'Com acesso tirado',
  expired: 'Com acesso encerrado',
  pending: 'Com acesso aguardando',
}

export function MembersClient() {
  const router = useRouter()
  const [items, setItems] = useState<MemberRow[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [status, setStatus] = useState('')
  const [courseRef, setCourseRef] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) })
      if (status) params.set('status', status)
      if (courseRef.trim()) params.set('courseRef', courseRef.trim())
      const page = await apiGet<Paginated<MemberRow>>(`/api/members?${params}`)
      setItems(page.items)
      setTotal(page.total)
      setError(false)
    } catch (err) {
      setError(true)
      toast.error((err as ApiError).message ?? 'Não conseguimos carregar os alunos.')
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
        title="Alunos"
        description="Os alunos com acesso a algum curso. Abra a ficha para ver, liberar ou tirar um acesso."
      />
      <AlunosTabs />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filtrar pelo endereço do curso"
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
          <option value="">Todos os alunos</option>
          {ENTITLEMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s] ?? s}
            </option>
          ))}
        </Select>
      </div>

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aluno</TableHead>
              <TableHead>Acessos</TableHead>
              <TableHead>Cursos</TableHead>
              <TableHead>Último acesso liberado</TableHead>
              <TableHead className="text-right">
                <span className="sr-only">Abrir a ficha</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeletonRows columns={5} />
            ) : error ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <LoadError what="os alunos" onRetry={() => void load()} />
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  {status || courseRef.trim() ? (
                    <EmptyState
                      title="Nenhum aluno com estes filtros."
                      description="Tente outro curso ou outra situação de acesso."
                    />
                  ) : (
                    <EmptyState
                      zappy="happy"
                      title="Nenhum aluno com acesso ainda."
                      description="Quando alguém comprar ou receber um acesso, aparece aqui."
                    />
                  )}
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
                        <div className="font-medium">Nome não disponível</div>
                        <details
                          className="text-xs text-muted-foreground"
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                        >
                          <summary className="cursor-pointer">Detalhes técnicos</summary>
                          <span className="font-mono">{m.userId}</span>
                        </details>
                      </>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{m.activeCount}</span>
                    <span className="text-muted-foreground"> / {m.totalCount}</span>
                    <span className="ml-1 text-xs text-muted-foreground">
                      {m.activeCount === 1 ? 'ativo' : 'ativos'}
                    </span>
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
