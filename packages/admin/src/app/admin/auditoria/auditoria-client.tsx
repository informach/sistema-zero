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
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import { TableSkeletonRows } from '@/components/admin/table-skeleton'
import { type ApiError, apiGet } from '@/lib/api'
import { dateInputToSaoPauloEndOfDayIso, dateInputToSaoPauloStartOfDayIso } from '@/lib/dates'
import { formatDate } from '@/lib/format'
import type { AuditLogPage } from '@/lib/types'

const LIMIT = 50
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

/** Rótulos PT das ações auditadas (id da rota do gateway → texto). */
const ACTION_LABELS: Record<string, string> = {
  'members-admin-grant': 'Concedeu acesso',
  'members-admin-entitlement-manage': 'Gerenciou matrícula',
  'members-admin-certificate-revoke': 'Revogou certificado',
  'payments-admin-refund': 'Estornou pagamento',
  'payments-admin-subscription-cancel': 'Cancelou assinatura',
  'auth-admin-user-create': 'Criou usuário',
  'auth-admin-user-update': 'Editou usuário',
  'auth-admin-user-impersonate': 'Entrou como (suporte)',
}

const ACTION_OPTIONS = Object.entries(ACTION_LABELS)

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action
}

export function AuditoriaClient() {
  const [data, setData] = useState<AuditLogPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)

  // Filtros (aplicados ao buscar; texto debounced via submit do input).
  const [action, setAction] = useState('')
  const [actorId, setActorId] = useState('')
  const [targetId, setTargetId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('limit', String(LIMIT))
    params.set('offset', String(offset))
    if (action) params.set('action', action)
    const actor = actorId.trim()
    if (actor && UUID_RE.test(actor)) params.set('actorId', actor)
    if (targetId.trim()) params.set('targetId', targetId.trim())
    const fromIso = from ? dateInputToSaoPauloStartOfDayIso(from) : null
    const toIso = to ? dateInputToSaoPauloEndOfDayIso(to) : null
    if (fromIso) params.set('from', fromIso)
    if (toIso) params.set('to', toIso)
    try {
      setData(await apiGet<AuditLogPage>(`/api/admin/audit?${params.toString()}`))
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Falha ao carregar a auditoria.')
    } finally {
      setLoading(false)
    }
  }, [offset, action, actorId, targetId, from, to])

  // Debounce: digitar nos filtros de texto (ator/alvo) não dispara um request por tecla.
  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  // Trocar filtro volta à 1ª página (o offset é dependência do load).
  function resetTo(setter: (v: string) => void, value: string) {
    setter(value)
    setOffset(0)
  }

  const items = data?.items ?? []
  // Ator só filtra com UUID completo (ver `load`); avisa quando o texto não é um UUID.
  const actorIdInvalid = actorId.trim().length > 0 && !UUID_RE.test(actorId.trim())

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Auditoria"
        description="Trilha de ações administrativas: quem fez o quê, quando e de onde."
      />

      <Card className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground text-xs">Ação</span>
          <Select value={action} onChange={(e) => resetTo(setAction, e.target.value)}>
            <option value="">Todas</option>
            {ACTION_OPTIONS.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </Select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground text-xs">Ator (id)</span>
          <Input
            value={actorId}
            onChange={(e) => resetTo(setActorId, e.target.value)}
            placeholder="uuid do admin"
            aria-invalid={actorIdInvalid}
          />
          {actorIdInvalid ? (
            <span className="text-destructive text-xs">Informe o UUID completo para filtrar.</span>
          ) : null}
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground text-xs">Alvo (id)</span>
          <Input
            value={targetId}
            onChange={(e) => resetTo(setTargetId, e.target.value)}
            placeholder="uuid afetado"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground text-xs">De</span>
          <Input type="date" value={from} onChange={(e) => resetTo(setFrom, e.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground text-xs">Até</span>
          <Input type="date" value={to} onChange={(e) => resetTo(setTo, e.target.value)} />
        </label>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quando</TableHead>
              <TableHead>Ator</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Alvo</TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeletonRows rows={8} columns={6} />
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Nenhum registro de auditoria.
                </TableCell>
              </TableRow>
            ) : (
              items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(it.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{it.actorEmail ?? it.actorId}</div>
                    {it.actorRole ? (
                      <div className="text-muted-foreground text-xs capitalize">{it.actorRole}</div>
                    ) : null}
                    {it.impersonatorId ? (
                      <div className="font-mono text-amber-600 text-xs dark:text-amber-500">
                        via suporte: {it.impersonatorId}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{actionLabel(it.action)}</div>
                    <div className="text-muted-foreground text-xs">
                      {it.method} {it.path}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground text-xs">
                    {it.targetId ?? '—'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        it.status >= 400 ? 'destructive' : it.status < 300 ? 'success' : 'muted'
                      }
                    >
                      {it.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{it.ip ?? '—'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Pagination total={data?.total ?? 0} limit={LIMIT} offset={offset} onChange={setOffset} />
    </div>
  )
}
