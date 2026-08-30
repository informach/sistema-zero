'use client'

import { Badge } from '@sistemazero/ui/badge'
import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Pagination } from '@sistemazero/ui/pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@sistemazero/ui/table'
import { Copy, Eye, Gift, Mail, Plus, Search } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { copyToClipboard } from '@/app/admin/notas-fiscais/copy-to-clipboard'
import { AdminHeader } from '@/components/admin/admin-header'
import { TableSkeletonRows } from '@/components/admin/table-skeleton'
import { useConfirm } from '@/components/admin/use-confirm'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { formatDate } from '@/lib/format'
import type { AmbassadorDetailView, AmbassadorListItemView, AmbassadorView } from '@/lib/types'

const PAGE_SIZE = 25
const WRITE_ROLES = new Set(['superadmin', 'admin'])

/**
 * Embaixadores da Bolsa do Primeiro Jogo: pessoas (com ou sem conta) que
 * distribuem bolsas 100% do Desafio. Criar = nome + e-mail → o referrals gera o
 * código + a página (capability-URL) e envia o magic-link por e-mail.
 */
export function EmbaixadoresClient({ currentRole }: { currentRole: string }) {
  const canWrite = WRITE_ROLES.has(currentRole)
  const { confirm, confirmDialog } = useConfirm()

  const [items, setItems] = useState<AmbassadorListItemView[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const [createOpen, setCreateOpen] = useState(false)
  const [detail, setDetail] = useState<AmbassadorDetailView | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) })
      if (search) params.set('q', search)
      const data = await apiGet<{ items: AmbassadorListItemView[]; total: number }>(
        `/api/admin/referrals/ambassadors?${params.toString()}`,
      )
      setItems(data.items)
      setTotal(data.total)
    } catch (err) {
      toast.error((err as ApiError).message)
    } finally {
      setLoading(false)
    }
  }, [offset, search])

  useEffect(() => {
    void load()
  }, [load])

  async function openDetail(id: string) {
    try {
      const data = await apiGet<AmbassadorDetailView>(`/api/admin/referrals/ambassadors/${id}`)
      setDetail(data)
      setDetailOpen(true)
    } catch (err) {
      toast.error((err as ApiError).message)
    }
  }

  async function resendLink(row: AmbassadorListItemView) {
    try {
      const res = await apiSend<{ sent: boolean }>(
        `/api/admin/referrals/ambassadors/${row.id}/resend-link`,
        'POST',
      )
      if (res.sent) toast.success(`E-mail do link reenviado para ${row.email}.`)
      else toast.warning('Não foi possível enviar o e-mail agora — copie o link no detalhe.')
      void load()
    } catch (err) {
      toast.error((err as ApiError).message)
    }
  }

  function toggleStatus(row: AmbassadorListItemView) {
    const disabling = row.status === 'active'
    confirm({
      title: disabling ? 'Desativar embaixador?' : 'Reativar embaixador?',
      message: disabling
        ? `A página e o link de bolsa de ${row.name} param de funcionar (as bolsas já resgatadas continuam valendo).`
        : `A página e o link de bolsa de ${row.name} voltam a funcionar.`,
      confirmText: disabling ? 'Desativar' : 'Reativar',
      confirmVariant: disabling ? 'destructive' : 'default',
      onConfirm: async () => {
        try {
          await apiSend(`/api/admin/referrals/ambassadors/${row.id}`, 'PATCH', {
            status: disabling ? 'disabled' : 'active',
          })
          toast.success(disabling ? 'Embaixador desativado.' : 'Embaixador reativado.')
          void load()
        } catch (err) {
          toast.error((err as ApiError).message)
        }
      },
    })
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Embaixadores"
        description="Quem distribui bolsas 100% do Desafio do Primeiro Jogo — com ou sem conta na plataforma."
        action={
          canWrite ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" /> Novo embaixador
            </Button>
          ) : undefined
        }
      />

      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          setOffset(0)
          setSearch(q.trim())
        }}
      >
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome ou e-mail"
            className="pl-9"
            aria-label="Buscar embaixadores"
          />
        </div>
        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </form>

      <Card className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Embaixador(a)</TableHead>
              <TableHead>Código</TableHead>
              <TableHead className="text-right">Bolsas resgatadas</TableHead>
              <TableHead className="text-right">Convites</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeletonRows rows={5} columns={7} />
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  <Gift className="mx-auto mb-2 size-6" />
                  Nenhum embaixador ainda. Crie o primeiro e envie o link da página dele.
                </TableCell>
              </TableRow>
            ) : (
              items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="font-medium">{row.name}</div>
                    <div className="text-xs text-muted-foreground">{row.email}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{row.code || '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.redemptionsCompleted}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.invitesSent}</TableCell>
                  <TableCell>
                    {row.status === 'active' ? (
                      <Badge className="bg-success/15 text-success-foreground">Ativo</Badge>
                    ) : (
                      <Badge variant="muted">Desativado</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(row.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Detalhes e resgates"
                        onClick={() => void openDetail(row.id)}
                      >
                        <Eye className="size-4" />
                      </Button>
                      {canWrite && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Reenviar e-mail do link da página"
                            onClick={() => void resendLink(row)}
                          >
                            <Mail className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleStatus(row)}
                            title={row.status === 'active' ? 'Desativar' : 'Reativar'}
                          >
                            {row.status === 'active' ? 'Desativar' : 'Reativar'}
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Pagination
        total={total}
        limit={PAGE_SIZE}
        offset={offset}
        onChange={(next: number) => setOffset(next)}
      />

      {createOpen && (
        <CreateAmbassadorDialog
          onClose={() => setCreateOpen(false)}
          onCreated={(view, emailSent) => {
            setCreateOpen(false)
            if (emailSent)
              toast.success(`Embaixador criado — o link foi enviado para ${view.email}.`)
            else
              toast.warning('Embaixador criado, mas o e-mail falhou — copie o link e envie você.')
            void load()
            if (view.pageUrl) void openDetail(view.id)
          }}
        />
      )}

      {detailOpen && detail && (
        <AmbassadorDetailDialog
          detail={detail}
          onClose={() => setDetailOpen(false)}
          onCopy={copyToClipboard}
        />
      )}

      {confirmDialog}
    </div>
  )
}

function CreateAmbassadorDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (view: AmbassadorView, emailSent: boolean) => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (saving) return
    setSaving(true)
    try {
      const res = await apiSend<{ ambassador: AmbassadorView; emailSent: boolean }>(
        '/api/admin/referrals/ambassadors',
        'POST',
        { name: name.trim(), email: email.trim() },
      )
      onCreated(res.ambassador, res.emailSent)
    } catch (err) {
      const apiErr = err as ApiError
      toast.error(
        apiErr.code === 'AMBASSADOR_EMAIL_EXISTS'
          ? 'Já existe embaixador com esse e-mail.'
          : apiErr.message,
      )
      setSaving(false)
    }
  }

  return (
    <Dialog open onClose={onClose} title="Novo embaixador">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <p className="text-sm text-muted-foreground">
          A pessoa não precisa ter conta: ela recebe por e-mail o link da própria página, com o
          código de bolsa para compartilhar.
        </p>
        <Field label="Nome">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome de quem vai indicar"
            required
            minLength={2}
          />
        </Field>
        <Field label="E-mail">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@dapessoa.com"
            required
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving || name.trim().length < 2 || !email.includes('@')}>
            {saving ? 'Criando…' : 'Criar e enviar o link'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

function AmbassadorDetailDialog({
  detail,
  onClose,
  onCopy,
}: {
  detail: AmbassadorDetailView
  onClose: () => void
  onCopy: (text: string, label: string) => Promise<void>
}) {
  const a = detail.ambassador
  return (
    <Dialog open onClose={onClose} title={a.name} className="max-w-2xl">
      <div className="space-y-5">
        <div className="space-y-2 text-sm">
          <p className="text-muted-foreground">{a.email}</p>
          <p className="text-xs text-muted-foreground">
            {a.linkEmailSentAt
              ? `E-mail do link enviado em ${formatDate(a.linkEmailSentAt)}.`
              : 'O e-mail do link ainda não foi enviado — copie a página abaixo e mande por fora.'}
          </p>
          {a.shareUrl && (
            <LinkRow label="Link de bolsa (compartilhável)" value={a.shareUrl} onCopy={onCopy} />
          )}
          {a.pageUrl && (
            <LinkRow
              label="Página do embaixador (chave de acesso — só para ele)"
              value={a.pageUrl}
              onCopy={onCopy}
            />
          )}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold">
            Resgates pelo código ({detail.redemptions.length})
          </h3>
          {detail.redemptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum resgate ainda.</p>
          ) : (
            <div className="max-h-72 overflow-y-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Quando</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.redemptions.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="text-sm">{r.name}</div>
                        <div className="text-xs text-muted-foreground">{r.email}</div>
                      </TableCell>
                      <TableCell>
                        {r.status === 'completed' ? (
                          <Badge className="bg-success/15 text-success-foreground">Concluído</Badge>
                        ) : r.status === 'failed' ? (
                          <Badge variant="destructive" title={r.lastError ?? undefined}>
                            Falhou{r.failedReason ? ` (${r.failedReason})` : ''}
                          </Badge>
                        ) : (
                          <Badge variant="muted">Pendente</Badge>
                        )}
                        {r.status !== 'completed' && r.lastError && (
                          <div
                            className="mt-1 max-w-52 truncate text-xs text-muted-foreground"
                            title={r.lastError}
                          >
                            {r.lastError}
                            {r.attemptCount ? ` · ${r.attemptCount} tentativa(s)` : ''}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(r.completedAt ?? r.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

function LinkRow({
  label,
  value,
  onCopy,
}: {
  label: string
  value: string
  onCopy: (text: string, label: string) => Promise<void>
}) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-xs">{value}</code>
        <Button
          variant="ghost"
          size="icon"
          title="Copiar"
          onClick={() => void onCopy(value, label)}
        >
          <Copy className="size-4" />
        </Button>
      </div>
    </div>
  )
}
