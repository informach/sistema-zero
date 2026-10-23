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
import { type AuditLogPage, roleLabel } from '@/lib/types'

const LIMIT = 50
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

/** Rótulos PT das ações auditadas (id da rota do gateway → texto). */
const ACTION_LABELS: Record<string, string> = {
  'members-admin-grant': 'Concedeu acesso',
  'members-admin-entitlement-manage': 'Mudou um acesso',
  'members-admin-certificate-revoke': 'Tirou um certificado',
  'payments-admin-refund': 'Estornou uma venda',
  'payments-admin-subscription-cancel': 'Cancelou uma assinatura',
  'auth-admin-user-create': 'Criou uma conta',
  'auth-admin-user-update': 'Editou uma conta',
  'auth-admin-user-impersonate': 'Entrou como a pessoa (suporte)',
}

const ACTION_OPTIONS = Object.entries(ACTION_LABELS)

/** A área de uma ação sem rótulo, pelo serviço no começo do id da rota do gateway. */
const ACTION_AREAS: Record<string, string> = {
  members: 'Alunos',
  payments: 'Vendas',
  auth: 'Contas',
  catalog: 'Catálogo',
  referrals: 'Campanhas',
  fiscal: 'Notas fiscais',
  nfse: 'Notas fiscais',
  helpdesk: 'Atendimento',
  hub: 'Clube e Comunidade',
}

/** O rótulo da ação; sem rótulo, diz ao menos a área (o id cru fica nos detalhes técnicos). */
function actionLabel(action: string): string {
  const known = ACTION_LABELS[action]
  if (known) return known
  const area = ACTION_AREAS[action.split('-')[0] ?? '']
  return area ? `Outra ação em ${area}` : 'Outra ação da equipe'
}

/** O resultado em palavras: o código HTTP fica no `title` e nos detalhes técnicos. */
function resultOf(status: number): { label: string; variant: 'success' | 'destructive' | 'muted' } {
  if (status >= 200 && status < 300) return { label: 'Deu certo', variant: 'success' }
  if (status >= 400) return { label: 'Recusado', variant: 'destructive' }
  return { label: 'Sem resposta final', variant: 'muted' }
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
      toast.error((err as ApiError).message ?? 'A auditoria não carregou. Tente de novo.')
    } finally {
      setLoading(false)
    }
  }, [offset, action, actorId, targetId, from, to])

  // Debounce: digitar nos filtros de texto (quem fez/sobre quem) não dispara um request por tecla.
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
        description="Tudo o que a equipe fez no admin: quem, o quê, quando e de onde. Nada aqui pode ser editado."
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
          <span className="text-muted-foreground text-xs">Quem fez (ID da conta)</span>
          <Input
            value={actorId}
            onChange={(e) => resetTo(setActorId, e.target.value)}
            placeholder="Cole o ID da conta"
            aria-invalid={actorIdInvalid}
          />
          {actorIdInvalid ? (
            <span className="text-destructive text-xs">
              Cole o ID inteiro da conta (36 letras e números com hífens) para filtrar.
            </span>
          ) : null}
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground text-xs">Sobre quem (ID)</span>
          <Input
            value={targetId}
            onChange={(e) => resetTo(setTargetId, e.target.value)}
            placeholder="Cole o ID da conta ou do item"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground text-xs">Desde o dia</span>
          <Input type="date" value={from} onChange={(e) => resetTo(setFrom, e.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground text-xs">Até o dia</span>
          <Input type="date" value={to} onChange={(e) => resetTo(setTo, e.target.value)} />
        </label>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quando</TableHead>
              <TableHead>Quem fez</TableHead>
              <TableHead>O quê</TableHead>
              <TableHead>Sobre quem</TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead>De onde (IP)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeletonRows rows={8} columns={6} />
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Nada registrado com esses filtros.
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
                      <div className="text-muted-foreground text-xs">{roleLabel(it.actorRole)}</div>
                    ) : null}
                    {it.impersonatorId ? (
                      <div className="text-warning text-xs">
                        Entrou como a pessoa, pelo suporte de{' '}
                        <span className="font-mono">{it.impersonatorId}</span>
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{actionLabel(it.action)}</div>
                    <details className="mt-0.5 text-muted-foreground text-xs">
                      <summary className="cursor-pointer">Detalhes técnicos</summary>
                      <div className="mt-1 space-y-0.5 font-mono">
                        <div>
                          {it.method} {it.path}
                        </div>
                        <div>{it.action}</div>
                        <div>HTTP {it.status}</div>
                      </div>
                    </details>
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground text-xs">
                    {it.targetId ?? '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={resultOf(it.status).variant} title={`Código ${it.status}`}>
                      {resultOf(it.status).label}
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
