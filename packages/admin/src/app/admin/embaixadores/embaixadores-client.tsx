'use client'

import { Badge } from '@sistemazero/ui/badge'
import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
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
import { Copy, Eye, Gift, Mail, Plus, Search } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { copyToClipboard } from '@/app/admin/notas-fiscais/copy-to-clipboard'
import { AdminHeader } from '@/components/admin/admin-header'
import { TableSkeletonRows } from '@/components/admin/table-skeleton'
import { useConfirm } from '@/components/admin/use-confirm'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { formatCents, formatCentsStr, formatDate } from '@/lib/format'
import type {
  AmbassadorDetailView,
  AmbassadorListItemView,
  AmbassadorRedemptionView,
  AmbassadorView,
  ConversionAdminView,
  ConversionStatus,
} from '@/lib/types'

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
      else toast.warning('Não foi possível enviar o e-mail agora. Copie o link no detalhe.')
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
        description="Quem distribui bolsas 100% do Desafio do Primeiro Jogo, com ou sem conta na plataforma."
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

      {/* A listagem de bônus carrega chave Pix + e-mail do bolsista: o gateway
          restringe a admin+ (`referrals-admin-conversions-read`). Esconder aqui
          evita oferecer ao staff uma seção que responderia 403. */}
      {canWrite ? <BonusSection canWrite={canWrite} /> : null}

      {createOpen && (
        <CreateAmbassadorDialog
          onClose={() => setCreateOpen(false)}
          onCreated={(view, emailSent) => {
            setCreateOpen(false)
            if (emailSent)
              toast.success(`Embaixador criado! O link foi enviado para ${view.email}.`)
            else
              toast.warning(
                'Embaixador criado, mas o e-mail falhou. Copie o link e envie por fora.',
              )
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

/** Exportado p/ o teste de conformance admin×referrals (union espelhado à mão). */
export const CONVERSION_STATUS_LABEL: Record<ConversionStatus, string> = {
  pending: 'Na garantia',
  eligible: 'Aguardando Pix',
  paid: 'Pago',
  canceled: 'Assinatura estornada',
  self_blocked: 'Autoindicação',
}

const SELF_BLOCKED_HINT = 'Sem bônus: quem assinou é o próprio embaixador'

/**
 * Apresentação por status numa TABELA só (Record EXAUSTIVO: um status novo no
 * referrals reprova a compilação aqui em vez de cair num rótulo errado).
 */
const CONVERSION_STATUS_BADGE: Record<
  ConversionStatus,
  { variant?: 'muted' | 'outline'; className?: string; title?: (c: ConversionAdminView) => string }
> = {
  pending: { variant: 'muted', title: (c) => `A garantia libera em ${formatDate(c.maturesAt)}` },
  eligible: {},
  paid: {
    className: 'bg-success/15 text-success-foreground',
    title: (c) =>
      [
        c.paidMarkedAt
          ? `Pago em ${formatDate(c.paidMarkedAt)} por ${c.paidMarkedBy ?? 'admin'}`
          : '',
        c.note ? `Nota: ${c.note}` : '',
      ]
        .filter(Boolean)
        .join(' · '),
  },
  canceled: { variant: 'muted' },
  self_blocked: { variant: 'muted', title: () => SELF_BLOCKED_HINT },
}

function ConversionStatusBadge({ c }: { c: ConversionAdminView }) {
  const p = CONVERSION_STATUS_BADGE[c.status]
  const title = p.title?.(c)
  return (
    <Badge variant={p.variant} className={p.className} title={title || undefined}>
      {CONVERSION_STATUS_LABEL[c.status]}
    </Badge>
  )
}

/**
 * Bônus de indicação: cada linha é um bolsista que assinou a Comunidade dos
 * Criadores. Passada a garantia de 7 dias o bônus fica "Aguardando Pix": você
 * paga por fora (Pix manual, sem saldo no produto) e marca como pago aqui.
 */
function BonusSection({ canWrite }: { canWrite: boolean }) {
  const { confirm, confirmDialog } = useConfirm()
  const [items, setItems] = useState<ConversionAdminView[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [status, setStatus] = useState<'' | ConversionStatus>('')
  const [loading, setLoading] = useState(true)
  // ⚠️ Falha de carga NÃO pode virar "nenhum bônus" (régua da casa: lista que
  // FALHOU ≠ lista vazia). Numa tela de dinheiro, o vazio falso faz a operadora
  // concluir que não deve nada a ninguém.
  const [failed, setFailed] = useState(false)
  // Última requisição VENCE: trocar o filtro rápido não deixa uma resposta
  // atrasada pintar linhas do filtro anterior sob o dropdown novo.
  const loadSeq = useRef(0)

  const load = useCallback(async () => {
    const seq = ++loadSeq.current
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) })
      if (status) params.set('status', status)
      const data = await apiGet<{ items: ConversionAdminView[]; total: number }>(
        `/api/admin/referrals/conversions?${params.toString()}`,
      )
      if (seq !== loadSeq.current) return
      setItems(data.items)
      setTotal(data.total)
      setFailed(false)
    } catch (err) {
      if (seq !== loadSeq.current) return
      setFailed(true)
      toast.error((err as ApiError).message)
    } finally {
      if (seq === loadSeq.current) setLoading(false)
    }
  }, [offset, status])

  useEffect(() => {
    void load()
  }, [load])

  function markPaid(row: ConversionAdminView) {
    confirm({
      title: 'Marcar bônus como pago?',
      message: `Confirme que você já fez o Pix de ${formatCents(row.bonusCents)} para ${row.ambassadorName ?? 'o embaixador'}${row.ambassadorPixKey ? ` (chave ${row.ambassadorPixKey})` : ''}. Essa marcação não envia dinheiro, só registra o controle.`,
      confirmText: 'Já paguei, marcar',
      onConfirm: async () => {
        try {
          await apiSend(`/api/admin/referrals/conversions/${row.id}/mark-paid`, 'POST', {})
          toast.success('Bônus marcado como pago.')
          void load()
        } catch (err) {
          const apiErr = err as ApiError
          toast.error(
            apiErr.code === 'CONVERSION_NOT_ELIGIBLE'
              ? 'Este bônus não está aguardando pagamento. Recarregue a lista.'
              : apiErr.message,
          )
        }
      },
    })
  }

  function matureNow(row: ConversionAdminView) {
    confirm({
      title: 'Antecipar a garantia?',
      // Nomeia o EMBAIXADOR (é quem recebe), com o bolsista como referência —
      // numa confirmação sobre dinheiro, o nome errado é o que se confere.
      message: `O bônus de ${row.ambassadorName ?? 'este embaixador'}, pela assinatura de ${row.redemptionName}, fica liberado AGORA, antes dos 7 dias de garantia. Se a família pedir estorno depois, o acerto vira ajuste manual. Use para testes ou exceções conscientes.`,
      confirmText: 'Antecipar',
      confirmVariant: 'destructive',
      onConfirm: async () => {
        try {
          await apiSend(`/api/admin/referrals/conversions/${row.id}/mature-now`, 'POST')
          toast.success('Garantia antecipada. O bônus libera no próximo ciclo do serviço.')
          void load()
        } catch (err) {
          const apiErr = err as ApiError
          toast.error(
            apiErr.code === 'CONVERSION_NOT_PENDING'
              ? 'Só conversões na garantia podem antecipar. Recarregue a lista.'
              : apiErr.message,
          )
        }
      },
    })
  }

  return (
    <section className="space-y-3 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Bônus de indicação</h2>
          <p className="text-sm text-muted-foreground">
            Bolsistas que assinaram a Comunidade dos Criadores. Depois da garantia de 7 dias, o
            bônus fica aguardando o seu Pix manual.
          </p>
        </div>
        <div className="w-44">
          <Select
            value={status}
            onChange={(e) => {
              setOffset(0)
              setStatus(e.target.value as '' | ConversionStatus)
            }}
            aria-label="Filtrar bônus por status"
          >
            <option value="">Todos</option>
            {(Object.keys(CONVERSION_STATUS_LABEL) as ConversionStatus[]).map((s) => (
              <option key={s} value={s}>
                {CONVERSION_STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <Card className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Embaixador(a)</TableHead>
              <TableHead>Bolsista que assinou</TableHead>
              <TableHead>Assinou em</TableHead>
              <TableHead className="text-right">Bônus</TableHead>
              <TableHead>Chave Pix</TableHead>
              <TableHead>Status</TableHead>
              {canWrite && <TableHead className="text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeletonRows rows={3} columns={canWrite ? 7 : 6} />
            ) : failed ? (
              <TableRow>
                <TableCell colSpan={canWrite ? 7 : 6} className="py-8 text-center">
                  <p className="text-sm text-destructive">
                    Não consegui carregar os bônus agora. Isto não quer dizer que não há nenhum.
                  </p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => void load()}>
                    Tentar de novo
                  </Button>
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canWrite ? 7 : 6}
                  className="py-8 text-center text-muted-foreground"
                >
                  {status
                    ? 'Nenhum bônus com esse status agora. Tente "Todos" para ver a lista inteira.'
                    : 'Nenhum bônus por aqui ainda. Quando um bolsista assinar a Comunidade, ele aparece nesta lista.'}
                </TableCell>
              </TableRow>
            ) : (
              items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="text-sm font-medium">{row.ambassadorName ?? '—'}</div>
                    <div className="text-xs text-muted-foreground">{row.ambassadorEmail ?? ''}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{row.redemptionName}</div>
                    <div className="text-xs text-muted-foreground">{row.redemptionEmail}</div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div>{formatDate(row.subscribedAt)}</div>
                    <div className="text-xs">
                      {row.offerSlug} · {formatCentsStr(row.amountCents)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {formatCents(row.bonusCents)}
                  </TableCell>
                  <TableCell>
                    {row.ambassadorPixKey ? (
                      <div className="flex items-center gap-1">
                        <code className="max-w-40 truncate rounded bg-muted px-2 py-1 text-xs">
                          {row.ambassadorPixKey}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Copiar a chave Pix"
                          onClick={() =>
                            void copyToClipboard(row.ambassadorPixKey ?? '', 'Chave Pix')
                          }
                        >
                          <Copy className="size-4" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Ainda não informou</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <ConversionStatusBadge c={row} />
                    {/* Datas VISÍVEIS (tooltip não existe no toque nem por
                        teclado, e é justamente o que a operadora usa p/ saber
                        o que liberar esta semana e p/ auditar o Pix). */}
                    {row.status === 'pending' ? (
                      <div className="mt-1 text-xs text-muted-foreground">
                        libera em {formatDate(row.maturesAt)}
                      </div>
                    ) : null}
                    {row.status === 'paid' && row.paidMarkedAt ? (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatDate(row.paidMarkedAt)}
                        {row.paidMarkedBy ? ` · ${row.paidMarkedBy}` : ''}
                      </div>
                    ) : null}
                  </TableCell>
                  {canWrite && (
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {row.status === 'eligible' && (
                          <Button variant="ghost" size="sm" onClick={() => markPaid(row)}>
                            Marcar como pago
                          </Button>
                        )}
                        {row.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Libera o bônus antes da garantia de 7 dias"
                            onClick={() => matureNow(row)}
                          >
                            Antecipar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
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

      {confirmDialog}
    </section>
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
              : 'O e-mail do link ainda não foi enviado. Copie a página abaixo e mande por fora.'}
          </p>
          {a.shareUrl && (
            <LinkRow label="Link de bolsa (compartilhável)" value={a.shareUrl} onCopy={onCopy} />
          )}
          {a.pageUrl && (
            <LinkRow
              label="Página do embaixador (chave de acesso, só para ele)"
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
                    <TableHead>Jornada</TableHead>
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
                      <TableCell>
                        <JourneyBadge r={r} />
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

/** Rótulos da JORNADA (fraseado próprio; Record EXAUSTIVO como o do badge). */
const JOURNEY_LABEL: Record<ConversionStatus, string> = {
  pending: 'Assinou, na garantia',
  eligible: 'Bônus liberado',
  paid: 'Bônus pago',
  canceled: CONVERSION_STATUS_LABEL.canceled,
  self_blocked: CONVERSION_STATUS_LABEL.self_blocked,
}

/**
 * Jornada do bolsista dentro do detalhe: ficou só no Desafio ou virou
 * assinatura (e em que pé o bônus está). Deriva de `redemption.conversion`;
 * variante/tooltip vêm da MESMA tabela do badge da lista (uma fonte só).
 */
function JourneyBadge({ r }: { r: AmbassadorRedemptionView }) {
  if (r.status !== 'completed') return <span className="text-xs text-muted-foreground">—</span>
  const c = r.conversion
  if (!c) return <Badge variant="outline">Só no Desafio</Badge>
  const p = CONVERSION_STATUS_BADGE[c.status]
  const title =
    c.status === 'pending'
      ? `Assinou em ${formatDate(c.subscribedAt)}`
      : c.status === 'self_blocked'
        ? SELF_BLOCKED_HINT
        : undefined
  return (
    <Badge variant={p.variant} className={p.className} title={title}>
      {JOURNEY_LABEL[c.status]}
    </Badge>
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
