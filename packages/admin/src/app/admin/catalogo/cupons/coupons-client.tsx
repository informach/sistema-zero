'use client'

import { Pencil, Plus, Search } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import { CatalogTabs } from '@/components/admin/catalog-tabs'
import { StatusBadge } from '@/components/admin/status-badge'
import { type OfferOption, OffersMultiSelect } from '@/components/catalog/offers-multi-select'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
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
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { formatCents, reaisToCents } from '@/lib/format'
import type { CouponView, OfferListItem, Paginated } from '@/lib/types'

const LIMIT = 20
const COUPON_STATUSES = ['active', 'inactive', 'archived']

interface FormState {
  code: string
  type: 'percent' | 'fixed'
  percentOff: string
  amount: string
  appliesToAll: boolean
  offerIds: string[]
  maxRedemptions: string
  status: string
}

const EMPTY_FORM: FormState = {
  code: '',
  type: 'percent',
  percentOff: '',
  amount: '',
  appliesToAll: true,
  offerIds: [],
  maxRedemptions: '',
  status: 'active',
}

function optInt(v: string): number | null {
  const n = Number.parseInt(v, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function CouponsClient() {
  const [items, setItems] = useState<CouponView[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<CouponView | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // Ofertas p/ o multi-select de escopo (carregadas 1x, sob demanda do dialog).
  const [offerOptions, setOfferOptions] = useState<OfferOption[] | null>(null)
  const [offersLoading, setOffersLoading] = useState(false)

  async function ensureOfferOptions() {
    if (offerOptions !== null || offersLoading) return
    setOffersLoading(true)
    try {
      const page = await apiGet<Paginated<OfferListItem>>('/api/catalog/offers?limit=100')
      setOfferOptions(
        page.items.map((o) => ({
          id: o.id,
          label: o.productName ? `${o.name} — ${o.productName}` : o.name,
        })),
      )
    } catch {
      setOfferOptions([])
      toast.error('Não foi possível carregar as ofertas.')
    } finally {
      setOffersLoading(false)
    }
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) })
      if (q.trim()) params.set('q', q.trim())
      if (status) params.set('status', status)
      const page = await apiGet<Paginated<CouponView>>(`/api/catalog/coupons?${params}`)
      setItems(page.items)
      setTotal(page.total)
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Falha ao carregar cupons.')
    } finally {
      setLoading(false)
    }
  }, [offset, q, status])

  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    void ensureOfferOptions()
    setOpen(true)
  }

  function openEdit(c: CouponView) {
    setEditing(c)
    setForm({
      code: c.code,
      type: c.type === 'fixed' ? 'fixed' : 'percent',
      percentOff: c.percentOff != null ? String(c.percentOff) : '',
      amount: c.amountOffCents != null ? (c.amountOffCents / 100).toFixed(2) : '',
      appliesToAll: c.appliesToAll,
      offerIds: c.offerIds,
      maxRedemptions: c.maxRedemptions != null ? String(c.maxRedemptions) : '',
      status: c.status,
    })
    void ensureOfferOptions()
    setOpen(true)
  }

  async function save() {
    if (!form.appliesToAll && form.offerIds.length === 0) {
      toast.error('Escolha ao menos uma oferta (ou marque "vale para todas").')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await apiSend(`/api/catalog/coupons/${editing.id}`, 'PATCH', {
          status: form.status,
          appliesToAll: form.appliesToAll,
          // PATCH substitui a coleção — envia o escopo completo escolhido.
          offerIds: form.appliesToAll ? [] : form.offerIds,
          maxRedemptions: optInt(form.maxRedemptions),
        })
        toast.success('Cupom atualizado.')
      } else {
        if (!form.code.trim()) {
          toast.error('Informe o código do cupom.')
          setSaving(false)
          return
        }
        const base = {
          code: form.code.trim(),
          type: form.type,
          appliesToAll: form.appliesToAll,
          ...(form.appliesToAll ? {} : { offerIds: form.offerIds }),
          status: form.status,
          ...(optInt(form.maxRedemptions) ? { maxRedemptions: optInt(form.maxRedemptions) } : {}),
        }
        if (form.type === 'percent') {
          const percentOff = optInt(form.percentOff)
          if (!percentOff || percentOff > 100) {
            toast.error('Percentual deve ser entre 1 e 100.')
            setSaving(false)
            return
          }
          await apiSend('/api/catalog/coupons', 'POST', { ...base, percentOff })
        } else {
          const amountOffCents = reaisToCents(form.amount)
          if (!Number.isFinite(amountOffCents) || amountOffCents <= 0) {
            toast.error('Informe um valor de desconto válido.')
            setSaving(false)
            return
          }
          await apiSend('/api/catalog/coupons', 'POST', { ...base, amountOffCents })
        }
        toast.success('Cupom criado.')
      }
      setOpen(false)
      await load()
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Não foi possível salvar.')
    } finally {
      setSaving(false)
    }
  }

  function discountLabel(c: CouponView): string {
    if (c.type === 'percent') return `${c.percentOff ?? 0}%`
    return c.amountOffCents != null ? formatCents(c.amountOffCents, c.currency) : '—'
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Catálogo"
        description="Produtos, ofertas e cupons da plataforma."
        action={
          <Button onClick={openCreate}>
            <Plus className="size-4" /> Novo cupom
          </Button>
        }
      />
      <CatalogTabs />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por código…"
            value={q}
            onChange={(e) => {
              setOffset(0)
              setQ(e.target.value)
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
          className="sm:w-44"
        >
          <option value="">Todos os status</option>
          {COUPON_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Desconto</TableHead>
              <TableHead>Escopo</TableHead>
              <TableHead>Usos</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  <Spinner className="mx-auto" />
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Nenhum cupom encontrado.
                </TableCell>
              </TableRow>
            ) : (
              items.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono font-medium">{c.code}</TableCell>
                  <TableCell>{discountLabel(c)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.appliesToAll ? 'Todas as ofertas' : `${c.offerIds.length} oferta(s)`}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.timesRedeemed}
                    {c.maxRedemptions != null ? ` / ${c.maxRedemptions}` : ''}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                      <Pencil className="size-4" /> Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Pagination total={total} limit={LIMIT} offset={offset} onChange={setOffset} />

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Editar cupom' : 'Novo cupom'}
        description={editing ? editing.code : 'Cadastre um cupom de desconto.'}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Spinner /> : null}
              Salvar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {editing ? (
            <p className="text-xs text-muted-foreground">
              Código <span className="font-mono">{editing.code}</span> · desconto{' '}
              {discountLabel(editing)} (tipo/valor não são editáveis).
            </p>
          ) : (
            <>
              <Field
                label="Código"
                htmlFor="code"
                tooltip="O que o cliente digita no checkout para ganhar o desconto (ex.: PROMO10). Não muda depois de criado."
              >
                <Input
                  id="code"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="PROMO10"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Tipo"
                  htmlFor="type"
                  tooltip="Percentual desconta uma fração do preço; valor fixo desconta um montante em reais. Não muda depois de criado."
                >
                  <Select
                    id="type"
                    value={form.type}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, type: e.target.value as 'percent' | 'fixed' }))
                    }
                  >
                    <option value="percent">Percentual (%)</option>
                    <option value="fixed">Valor fixo (R$)</option>
                  </Select>
                </Field>
                {form.type === 'percent' ? (
                  <Field label="Percentual (1–100)" htmlFor="percentOff">
                    <Input
                      id="percentOff"
                      inputMode="numeric"
                      value={form.percentOff}
                      onChange={(e) => setForm((f) => ({ ...f, percentOff: e.target.value }))}
                    />
                  </Field>
                ) : (
                  <Field label="Valor (R$)" htmlFor="amount">
                    <Input
                      id="amount"
                      inputMode="decimal"
                      value={form.amount}
                      onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    />
                  </Field>
                )}
              </div>
            </>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Máx. usos (opcional)"
              htmlFor="maxRedemptions"
              tooltip="Limite total de resgates do cupom. Vazio = ilimitado."
            >
              <Input
                id="maxRedemptions"
                inputMode="numeric"
                value={form.maxRedemptions}
                onChange={(e) => setForm((f) => ({ ...f, maxRedemptions: e.target.value }))}
              />
            </Field>
            <Field label="Status" htmlFor="cstatus">
              <Select
                id="cstatus"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                {COUPON_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.appliesToAll}
              onChange={(e) => setForm((f) => ({ ...f, appliesToAll: e.target.checked }))}
              className="size-4 accent-[color:var(--primary)]"
            />
            Vale para todas as ofertas ativas
            <InfoTooltip text="Marcado: o cupom funciona em qualquer oferta ativa. Desmarcado: escolha abaixo em quais ofertas ele vale." />
          </label>
          {!form.appliesToAll ? (
            <Field
              label="Ofertas em que o cupom vale"
              tooltip="O cupom só será aceito no checkout destas ofertas."
            >
              <OffersMultiSelect
                options={offerOptions ?? []}
                value={form.offerIds}
                onChange={(offerIds) => setForm((f) => ({ ...f, offerIds }))}
                loading={offersLoading}
              />
            </Field>
          ) : null}
        </div>
      </Dialog>
    </div>
  )
}
