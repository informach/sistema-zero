'use client'

import { ArrowLeft, Plus } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import { GrantAccessDialog } from '@/components/admin/grant-access-dialog'
import { StatusBadge } from '@/components/admin/status-badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { formatDate } from '@/lib/format'
import type { AdminEntitlementView, MemberDetail } from '@/lib/types'

const SOURCE_LABELS: Record<string, string> = {
  payment: 'Pagamento',
  subscription: 'Assinatura',
  manual: 'Manual',
}

export function MemberDetailClient({
  userId,
  currentRole,
}: {
  userId: string
  currentRole: string
}) {
  const canWrite = currentRole === 'superadmin' || currentRole === 'admin'

  const [detail, setDetail] = useState<MemberDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const [grantOpen, setGrantOpen] = useState(false)

  const [extendOpen, setExtendOpen] = useState(false)
  const [extendTarget, setExtendTarget] = useState<AdminEntitlementView | null>(null)
  const [extendDate, setExtendDate] = useState('')

  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setDetail(await apiGet<MemberDetail>(`/api/members/${userId}`))
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Falha ao carregar o membro.')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  function isoOrNull(date: string): string | null {
    if (!date) return null
    const d = new Date(date)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  }

  async function manage(id: string, action: 'revoke' | 'expire' | 'extend', expiresAt?: string) {
    setBusyId(id)
    try {
      await apiSend(`/api/members/entitlements/${id}`, 'PATCH', {
        action,
        ...(expiresAt ? { expiresAt } : {}),
      })
      toast.success(
        action === 'revoke'
          ? 'Matrícula revogada.'
          : action === 'expire'
            ? 'Matrícula expirada.'
            : 'Validade atualizada.',
      )
      await load()
    } catch (err) {
      const e = err as ApiError
      if (e.status === 409) {
        toast.error('Registro alterado por outra operação. Recarregando…')
        await load()
      } else {
        toast.error(e.message ?? 'Não foi possível atualizar a matrícula.')
      }
    } finally {
      setBusyId(null)
    }
  }

  function confirmRevoke(e: AdminEntitlementView) {
    if (window.confirm(`Revogar o acesso "${e.name}"? O aluno perde o acesso imediatamente.`)) {
      void manage(e.id, 'revoke')
    }
  }
  function confirmExpire(e: AdminEntitlementView) {
    if (window.confirm(`Expirar o acesso "${e.name}"?`)) void manage(e.id, 'expire')
  }
  function openExtend(e: AdminEntitlementView) {
    setExtendTarget(e)
    setExtendDate('')
    setExtendOpen(true)
  }
  async function submitExtend() {
    if (!extendTarget) return
    const iso = isoOrNull(extendDate)
    if (!iso) {
      toast.error('Informe uma data de validade válida.')
      return
    }
    setExtendOpen(false)
    await manage(extendTarget.id, 'extend', iso)
  }

  const title = detail?.user ? `${detail.user.firstName} ${detail.user.lastName}` : 'Membro'
  const description = detail?.user?.email ?? userId

  return (
    <div className="space-y-6">
      <Link
        href="/admin/membros"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Membros
      </Link>

      <AdminHeader
        title={title}
        description={description}
        action={
          canWrite ? (
            <Button onClick={() => setGrantOpen(true)}>
              <Plus className="size-4" /> Conceder acesso
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <Card className="py-10 text-center text-muted-foreground">
          <Spinner className="mx-auto" />
        </Card>
      ) : !detail ? (
        <Card className="py-10 text-center text-muted-foreground">Membro não encontrado.</Card>
      ) : (
        <>
          {detail.progress.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {detail.progress.map((p) => (
                <Card key={p.courseRef} className="space-y-2 p-4">
                  <div className="font-medium">{p.title ?? p.courseRef}</div>
                  <div className="text-xs text-muted-foreground">{p.courseRef}</div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-[color:var(--primary)]"
                      style={{ width: `${p.percent}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {p.completedLessons}/{p.totalLessons} aulas · {p.percent}%
                  </div>
                </Card>
              ))}
            </div>
          ) : null}

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Acesso</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Concedido</TableHead>
                  <TableHead>Validade</TableHead>
                  {canWrite ? <TableHead className="text-right">Ações</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.entitlements.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={canWrite ? 6 : 5}
                      className="py-10 text-center text-muted-foreground"
                    >
                      Nenhuma matrícula.
                    </TableCell>
                  </TableRow>
                ) : (
                  detail.entitlements.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <div className="font-medium">{e.name || e.courseRef || e.productId}</div>
                        <div className="text-xs text-muted-foreground">{e.accessType}</div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={e.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {SOURCE_LABELS[e.sourceKind] ?? e.sourceKind}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(e.grantedAt)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {e.expiresAt ? formatDate(e.expiresAt) : 'Vitalícia'}
                      </TableCell>
                      {canWrite ? (
                        <TableCell className="text-right">
                          {busyId === e.id ? (
                            <Spinner className="ml-auto" />
                          ) : e.status === 'revoked' ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openExtend(e)}>
                                Estender
                              </Button>
                              {e.status === 'active' ? (
                                <Button variant="ghost" size="sm" onClick={() => confirmExpire(e)}>
                                  Expirar
                                </Button>
                              ) : null}
                              <Button variant="ghost" size="sm" onClick={() => confirmRevoke(e)}>
                                Revogar
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      <GrantAccessDialog
        open={grantOpen}
        userId={userId}
        onClose={() => setGrantOpen(false)}
        onGranted={load}
      />

      <Dialog
        open={extendOpen}
        onClose={() => setExtendOpen(false)}
        title="Estender validade"
        description={extendTarget?.name}
        footer={
          <>
            <Button variant="outline" onClick={() => setExtendOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submitExtend}>Salvar</Button>
          </>
        }
      >
        <Field
          label="Nova validade"
          htmlFor="extdate"
          hint="A validade só avança (reativa se expirada)."
        >
          <Input
            id="extdate"
            type="date"
            value={extendDate}
            onChange={(e) => setExtendDate(e.target.value)}
          />
        </Field>
      </Dialog>
    </div>
  )
}
