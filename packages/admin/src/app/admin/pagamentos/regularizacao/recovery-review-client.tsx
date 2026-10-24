'use client'

import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Input } from '@sistemazero/ui/input'
import { type FormEvent, useCallback, useEffect, useId, useRef, useState } from 'react'
import { EmptyState } from '@/components/admin/empty-state'
import { apiGet, apiSend } from '@/lib/api'
import { formatCentsStr } from '@/lib/format'
import type { RecoveryReviewItem, RecoveryReviewPage } from '@/lib/subscription-recovery'

const kinds: Record<RecoveryReviewItem['kind'], string> = {
  CASE: 'Acompanhamento',
  ADMISSION: 'Conferir origem',
  OPERATION: 'Resultado da solicitação',
  PERIOD: 'Conferir período pago',
}
const states: Record<string, string> = {
  OPEN: 'Aguardando primeiro aviso',
  PAYMENT_PENDING: 'Prazo de regularização em andamento',
  CANCEL_PENDING: 'Aguardando confirmação do encerramento',
  MANUAL_REVIEW: 'Conferência da equipe',
  REVIEW: 'Conferência da equipe',
  UNKNOWN: 'Resultado ainda não confirmado',
  EXECUTING: 'Solicitação em andamento',
  REVIEW_REQUIRED: 'Período ainda não confirmado',
  HISTORICAL: 'Entrada histórica para revisão',
}
const reasons: Record<string, string> = {
  AUDIENCE_UNKNOWN: 'Confirmar se a assinatura pertence ao Kids ou à comunidade adulta.',
  LEGACY_RENEWAL: 'Cobrança antiga. A revisão deve preservar um novo aviso e prazo completo.',
  SOURCE_DATE_UNKNOWN: 'A data original da cobrança precisa ser conferida.',
  PROVIDER_DIVERGENCE: 'A informação local diverge da operadora.',
  SOURCE_DIVERGENCE: 'A informação do período diverge da operadora.',
  PROVIDER_UNAVAILABLE: 'A consulta à operadora não foi confirmada.',
  PERIOD_UNAVAILABLE: 'Ainda não foi possível confirmar o período original.',
  CONTACT_FAILED: 'O primeiro aviso não teve uma confirmação válida de envio.',
  PAYMENT_UNCERTAIN: 'Conferir pagamento antes de qualquer nova tentativa ou encerramento.',
  PAYMENT_CONFIRMATION_REQUIRED:
    'O resultado do pagamento precisa ser conciliado. Não repetir a cobrança.',
  PROVIDER_UNKNOWN: 'O resultado da solicitação precisa ser conciliado. Não repetir a operação.',
}
const date = (value: string) =>
  new Date(value).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
const selectClass = 'min-h-10 rounded-md border border-input bg-background px-3 text-sm'

/** Bounded queue; source confirmation has separate authorization and durable audit. */
export function RecoveryReviewClient({
  canWrite,
  canAdmit,
}: {
  canWrite: boolean
  canAdmit: boolean
}) {
  const formId = useId()
  const [kind, setKind] = useState('')
  const [audience, setAudience] = useState('')
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')
  const [offset, setOffset] = useState(0)
  const requestRef = useRef<AbortController | null>(null)
  const actionRef = useRef<AbortController | null>(null)
  const loadRef = useRef<() => void>(() => {})
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [audiences, setAudiences] = useState<Record<string, 'kids' | 'adult' | ''>>({})
  const [notice, setNotice] = useState('')
  const [page, setPage] = useState<RecoveryReviewPage | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const load = useCallback(() => {
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setPage(null)
    setError('')
    setLoading(true)
    const query = new URLSearchParams({ limit: '25', offset: String(offset) })
    if (kind) query.set('kind', kind)
    if (audience) query.set('audience', audience)
    if (q) query.set('q', q)
    void apiGet<RecoveryReviewPage>(`/api/payments/recovery/review?${query}`, {
      signal: controller.signal,
    })
      .then((next) => {
        if (!controller.signal.aborted) setPage(next)
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError('Não foi possível carregar as conferências. Tente novamente.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
  }, [kind, audience, q, offset])
  useEffect(() => {
    loadRef.current = load
    load()
    return () => requestRef.current?.abort()
  }, [load])
  useEffect(() => () => actionRef.current?.abort(), [])
  function audienceFor(item: RecoveryReviewItem): 'kids' | 'adult' | '' {
    return item.audience === 'unknown' ? (audiences[item.id] ?? '') : item.audience
  }
  async function confirmItem(item: RecoveryReviewItem, audience?: 'kids' | 'adult') {
    if (
      !canWrite ||
      actionRef.current ||
      !item.paymentId ||
      !['PERIOD', 'OPERATION', 'ADMISSION'].includes(item.kind)
    )
      return
    const period = item.kind === 'PERIOD'
    const admission = item.kind === 'ADMISSION'
    if (admission && (!canAdmit || !audience)) return
    const controller = new AbortController()
    actionRef.current = controller
    setPendingAction(item.id)
    setNotice('')
    try {
      await apiSend(
        admission
          ? `/api/payments/recovery/payments/${encodeURIComponent(item.paymentId)}/admit`
          : period
            ? `/api/payments/recovery/payments/${encodeURIComponent(item.paymentId)}/confirm-period`
            : `/api/payments/recovery/operations/${encodeURIComponent(item.id)}/confirm-payment`,
        'POST',
        {
          ...(period || admission
            ? { expectedVersion: item.version }
            : { expectedAttempt: item.version }),
          ...(admission ? { audience } : {}),
          requestId: crypto.randomUUID(),
        },
        { signal: controller.signal },
      )
      if (!controller.signal.aborted)
        setNotice(
          admission
            ? 'Revisão registrada. O prazo começará no aceite do primeiro aviso. Esta ação não cobra nem cancela a assinatura.'
            : period
              ? 'Período conferido e registrado. A área de membros receberá o período original; a validade não recomeça hoje.'
              : 'Pagamento confirmado e conferência registrada. Nenhuma nova cobrança foi feita; o período original foi preservado.',
        )
    } catch {
      if (!controller.signal.aborted)
        setNotice(
          admission
            ? 'A abertura não foi confirmada. A lista será atualizada; confira se o acompanhamento já aparece. A operadora precisa confirmar a cobrança mais recente e a assinatura ativa.'
            : 'Não foi possível confirmar a resposta. A lista será consultada novamente; nenhum pagamento foi solicitado por esta ação.',
        )
    } finally {
      if (actionRef.current === controller) actionRef.current = null
      if (!controller.signal.aborted) {
        setPendingAction(null)
        loadRef.current()
      }
    }
  }
  function filter(event: FormEvent) {
    event.preventDefault()
    setOffset(0)
    setQ(search.trim())
  }
  return (
    <Card className="space-y-5 p-5 md:p-6" aria-busy={loading}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="font-display text-lg font-bold">Casos e conferências</h2>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Acompanhe avisos, pagamentos e resultados pendentes. Consultar esta lista não cobra,
            cancela ou envia mensagens.
          </p>
        </div>
        <Button variant="outline" disabled={loading} onClick={load}>
          Atualizar lista
        </Button>
      </div>
      <form onSubmit={filter} className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm" htmlFor={`${formId}-audience`}>
          Comunidade
          <select
            id={`${formId}-audience`}
            className={selectClass}
            value={audience}
            onChange={(event) => {
              setAudience(event.target.value)
              setOffset(0)
            }}
          >
            <option value="">Kids e Adultos</option>
            <option value="kids">Kids</option>
            <option value="adult">Adultos</option>
            <option value="unknown">Público a confirmar</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm" htmlFor={`${formId}-kind`}>
          Tipo de conferência
          <select
            id={`${formId}-kind`}
            className={selectClass}
            value={kind}
            onChange={(event) => {
              setKind(event.target.value)
              setOffset(0)
            }}
          >
            <option value="">Todos os tipos</option>
            {Object.entries(kinds).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="min-w-48 flex-1 space-y-1">
          <label className="text-sm" htmlFor={`${formId}-search`}>
            Nome, e-mail ou identificação
          </label>
          <Input
            id={`${formId}-search`}
            value={search}
            maxLength={120}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </form>
      {loading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Carregando conferências…
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="text-sm">
          {notice}
        </p>
      ) : null}
      {page?.items.length === 0 ? (
        <EmptyState
          title="Nenhuma conferência neste filtro"
          description="Os resultados mudam conforme o público, o tipo e a busca."
          zappy="happy"
        />
      ) : null}
      {page && page.items.length > 0 ? (
        <ul className="divide-y divide-border">
          {page.items.map((item) => (
            <li key={`${item.kind}:${item.id}`} className="space-y-2 py-4 first:pt-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {item.customerName ?? 'Titular não identificado'}
                    {item.customerEmail ? ` · ${item.customerEmail}` : ''}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {item.audience === 'kids'
                      ? 'Kids'
                      : item.audience === 'adult'
                        ? 'Adultos'
                        : 'Público a confirmar'}{' '}
                    · {kinds[item.kind]} · {formatCentsStr(item.amountInCents)}
                  </p>
                </div>
                <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold">
                  {states[item.state] ?? 'Conferência pendente'}
                </span>
              </div>
              {item.reason ? (
                <p className="text-sm">
                  {reasons[item.reason] ?? 'A equipe precisa conferir os dados deste caso.'}
                </p>
              ) : null}
              {item.kind === 'ADMISSION' && item.paymentId ? (
                <div className="space-y-2">
                  <label className="grid gap-1 text-sm" htmlFor={`${formId}-${item.id}-audience`}>
                    Público da assinatura
                    <select
                      id={`${formId}-${item.id}-audience`}
                      className={selectClass}
                      value={audienceFor(item)}
                      disabled={
                        !canWrite ||
                        !canAdmit ||
                        pendingAction !== null ||
                        item.audience !== 'unknown'
                      }
                      onChange={(event) => {
                        const value = event.target.value
                        if (value === '' || value === 'kids' || value === 'adult')
                          setAudiences((current) => ({ ...current, [item.id]: value }))
                      }}
                    >
                      <option value="">Selecione a comunidade</option>
                      <option value="kids">Kids — responsável</option>
                      <option value="adult">Adultos — titular</option>
                    </select>
                  </label>
                  <Button
                    variant="outline"
                    disabled={
                      !canWrite || !canAdmit || pendingAction !== null || !audienceFor(item)
                    }
                    onClick={() => {
                      const audience = audienceFor(item)
                      if (audience) void confirmItem(item, audience)
                    }}
                  >
                    {pendingAction === item.id
                      ? 'Conferindo entrada…'
                      : 'Revisar e iniciar acompanhamento'}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Consulta a operadora e registra sua revisão. Abre um aviso com prazo novo, sem
                    cobrança ou cancelamento imediato.
                    {!canAdmit
                      ? ' Ative a política e confira as comunicações antes de iniciar.'
                      : ''}
                  </p>
                </div>
              ) : null}
              {item.kind === 'PERIOD' || (item.kind === 'OPERATION' && item.paymentId) ? (
                <div className="space-y-1">
                  <Button
                    variant="outline"
                    disabled={!canWrite || pendingAction !== null}
                    onClick={() => void confirmItem(item)}
                  >
                    {pendingAction === item.id
                      ? 'Conferindo na operadora…'
                      : item.kind === 'PERIOD'
                        ? 'Conferir período na operadora'
                        : 'Conferir pagamento na operadora'}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Consulta a fonte e registra a confirmação com auditoria. Não permite escolher
                    datas ou cobrar novamente.
                  </p>
                </div>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Registrado em {date(item.openedAt)}
                {item.deadlineAt
                  ? ` · ${item.kind === 'OPERATION' ? 'Autorização até' : 'Prazo informado até'} ${date(item.deadlineAt)}`
                  : ''}
              </p>
              <p className="break-all font-mono text-xs text-muted-foreground">
                Assinatura: {item.subscriptionId ?? 'origem a confirmar'}
                {item.paymentId ? ` · Pagamento: ${item.paymentId}` : ''}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
      {page ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p>{page.total} registro(s)</p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={loading || offset === 0}
              onClick={() => setOffset((value) => Math.max(0, value - 25))}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              disabled={loading || offset + page.limit >= page.total}
              onClick={() => setOffset((value) => value + 25)}
            >
              Próxima
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  )
}
