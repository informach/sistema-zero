'use client'
import type { CommerceOrigin } from '@sistemazero/core/commerce'
import { Button, buttonVariants } from '@sistemazero/ui/button'
import { CheckCircle2, Gift } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { apiSend } from '../../lib/api'
import type { CommerceView, PurchaseView } from '../../lib/commerce'
import { PurchaseForm } from './purchase-form'

function errorMessage(error: unknown) {
  return typeof error === 'object' &&
    error &&
    'message' in error &&
    typeof error.message === 'string'
    ? error.message
    : 'Não foi possível continuar. Confira o andamento e tente novamente.'
}
const date = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(iso))
export function CommercePanel({
  origin,
  checkoutId,
  title,
  onUpdated,
}: {
  origin: CommerceOrigin
  checkoutId?: string
  title?: string
  onUpdated?: () => void
}) {
  const [view, setView] = useState<CommerceView | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [giftResult, setGiftResult] = useState<{ kind: string; expiresAt?: string | null } | null>(
    null,
  )
  const locked = useRef(false)
  const alive = useRef(true)
  const originKey = JSON.stringify(origin)
  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const result = await apiSend<CommerceView>(
          '/api/commerce',
          'POST',
          {
            action: 'inspect',
            origin: JSON.parse(originKey),
            ...(checkoutId ? { checkoutId } : {}),
          },
          undefined,
          { signal },
        )
        if (!signal?.aborted && alive.current) {
          setView(result)
          setGiftResult(
            result.mode === 'gift' && result.redemption
              ? {
                  kind:
                    result.redemption.status === 'completed' ? 'already_redeemed' : 'processing',
                  expiresAt: result.redemption.expiresAt,
                }
              : null,
          )
          setError('')
        }
      } catch (e) {
        if (!signal?.aborted && alive.current) setError(errorMessage(e))
      }
    },
    [originKey, checkoutId],
  )
  useEffect(() => {
    alive.current = true
    const controller = new AbortController()
    void load(controller.signal)
    return () => {
      alive.current = false
      controller.abort()
    }
  }, [load])
  async function refresh(current: PurchaseView) {
    const next = await apiSend<CommerceView>('/api/commerce', 'POST', {
      action: 'status',
      origin: current.origin ?? origin,
      checkoutId: current.checkoutId,
    })
    if (!alive.current) return
    setView(next.mode === 'purchase' ? { ...next, cardConfig: current.cardConfig } : next)
    if (next.mode === 'purchase' && next.status === 'PAID' && next.accessGranted) onUpdated?.()
  }
  const pending =
    view?.mode === 'purchase' &&
    (view.status === 'PENDING' || (view.status === 'PAID' && !view.accessGranted))
  useEffect(() => {
    if (!pending || view?.mode !== 'purchase') return
    const controller = new AbortController()
    const current = view
    let reading = false
    const timer = window.setInterval(async () => {
      if (reading || document.visibilityState === 'hidden') return
      reading = true
      try {
        const next = await apiSend<CommerceView>(
          '/api/commerce',
          'POST',
          {
            action: 'status',
            origin: current.origin ?? JSON.parse(originKey),
            checkoutId: current.checkoutId,
          },
          undefined,
          { signal: controller.signal },
        )
        if (controller.signal.aborted) return
        setView(next.mode === 'purchase' ? { ...next, cardConfig: current.cardConfig } : next)
        setError('')
        if (next.mode === 'purchase' && next.status === 'PAID' && next.accessGranted) onUpdated?.()
      } catch (e) {
        if (!controller.signal.aborted) setError(errorMessage(e))
      } finally {
        reading = false
      }
    }, 5000)
    return () => {
      controller.abort()
      window.clearInterval(timer)
    }
  }, [pending, view, originKey, onUpdated])
  async function activate() {
    if (locked.current) return
    locked.current = true
    setBusy(true)
    setError('')
    try {
      const result = await apiSend<
        { kind: string; expiresAt?: string | null } | Extract<CommerceView, { mode: 'included' }>
      >('/api/commerce', 'POST', { action: 'redeem', origin })
      if (!alive.current) return
      if ('mode' in result) {
        setView(result)
        onUpdated?.()
        return
      }
      setGiftResult(result)
      if (result.kind === 'completed') onUpdated?.()
    } catch (e) {
      if (alive.current) setError(errorMessage(e))
    } finally {
      locked.current = false
      if (alive.current) setBusy(false)
    }
  }
  async function pay(data: Record<string, unknown>) {
    if (locked.current || view?.mode !== 'purchase') return
    locked.current = true
    setBusy(true)
    setError('')
    try {
      const result = await apiSend<CommerceView>('/api/commerce', 'POST', {
        action: 'pay',
        origin: view.origin ?? origin,
        checkoutId: view.checkoutId,
        data,
      })
      if (alive.current)
        setView(result.mode === 'purchase' ? { ...result, cardConfig: view.cardConfig } : result)
      if (result.mode === 'purchase' && result.status === 'PAID' && result.accessGranted)
        onUpdated?.()
    } catch (e) {
      if (alive.current) setError(errorMessage(e))
      if (typeof e === 'object' && e && 'code' in e && e.code === 'OFFER_CHANGED') {
        await load()
        if (alive.current) setError(errorMessage(e))
        return
      }
      // Consulta a tentativa persistida, inclusive quando a resposta da cobrança se perdeu.
      try {
        await refresh(view)
      } catch (statusError) {
        if (alive.current) setError(errorMessage(statusError))
      }
    } finally {
      locked.current = false
      if (alive.current) setBusy(false)
    }
  }
  async function restart() {
    if (locked.current || view?.mode !== 'purchase') return
    locked.current = true
    setBusy(true)
    setError('')
    try {
      const next = await apiSend<CommerceView>('/api/commerce', 'POST', {
        action: 'restart',
        origin: view.origin ?? origin,
        checkoutId: view.checkoutId,
      })
      if (alive.current)
        setView(next.mode === 'purchase' ? { ...next, cardConfig: view.cardConfig } : next)
    } catch (e) {
      if (alive.current) setError(errorMessage(e))
    } finally {
      locked.current = false
      if (alive.current) setBusy(false)
    }
  }
  return (
    <div className="flex flex-col gap-5" aria-busy={busy}>
      {!view && !error ? (
        <p role="status" className="py-6 text-center text-muted-foreground">
          Conferindo sua conta e a oferta…
        </p>
      ) : null}
      {view?.mode === 'manage' ? (
        <div className="flex flex-col gap-4">
          <p>{view.message}</p>
          <a href={view.manageUrl} className={buttonVariants()}>
            Ver meus acessos e compras
          </a>
        </div>
      ) : null}
      {view?.mode === 'included' ? (
        <div role="status" className="flex flex-col gap-4 rounded-2xl bg-primary/5 p-4">
          <p className="flex items-center gap-2 font-bold text-primary">
            <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />
            {view.courseTitle} já está incluído no seu acesso
          </p>
          <p className="text-sm text-muted-foreground">{view.message}</p>
          <a href={view.continueUrl} className={buttonVariants()}>
            {view.continueUrl === '/pais/familia' ? 'Continuar com meu filho' : 'Ir para o curso'}
          </a>
        </div>
      ) : null}
      {view?.mode === 'gift' ? (
        <>
          <div className="flex items-start gap-3 rounded-2xl bg-muted/50 p-4">
            <Gift className="mt-1 size-6 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <h3 className="font-bold text-lg">{view.gift.courseTitle || view.gift.offerTitle}</h3>
              <p className="mt-1 text-muted-foreground text-sm">
                {view.gift.accessDays === null
                  ? 'Presente sem prazo para terminar.'
                  : `${view.gift.accessDays} dias de acesso. O prazo começa quando você ativa o presente e corre mesmo sem uso.`}{' '}
                Sem cobrança ou cartão.
              </p>
            </div>
          </div>
          {giftResult?.kind === 'completed' || giftResult?.kind === 'already_redeemed' ? (
            <div role="status" className="flex flex-col gap-3">
              <p className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="size-5 text-primary" />
                {giftResult.kind === 'completed'
                  ? 'Presente ativado!'
                  : 'Este presente já foi ativado.'}
              </p>
              {giftResult.expiresAt ? (
                <p className="text-sm">
                  {new Date(giftResult.expiresAt).getTime() <= Date.now()
                    ? 'O prazo terminou em'
                    : 'Acesso até'}{' '}
                  {date(giftResult.expiresAt)} (horário de Brasília).
                </p>
              ) : null}
              <p className="text-sm text-muted-foreground">
                {view.gift.learner === 'child'
                  ? 'Use o perfil do seu filho ou crie o primeiro em Família. Se necessário, autorize o aparelho para ele começar.'
                  : 'O curso fica disponível na sua conta.'}
              </p>
              <a
                className={buttonVariants()}
                href={
                  view.gift.learner === 'child'
                    ? '/pais/familia'
                    : view.gift.learner === 'parents'
                      ? '/pais/cursos'
                      : '/cursos'
                }
              >
                Continuar na plataforma
              </a>
            </div>
          ) : (view.redemption && !view.redemption.canResume) ||
            (view.state !== 'active' && !view.redemption?.canResume) ? (
            <p role="status">
              {view.redemption?.expiresAt &&
              new Date(view.redemption.expiresAt).getTime() <= Date.now()
                ? `O prazo deste presente terminou em ${date(view.redemption.expiresAt)} (horário de Brasília).`
                : 'Esta campanha não está disponível para novas ativações.'}
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                O presente será vinculado à conta com que você está logado.
              </p>
              {giftResult?.kind === 'processing' ? (
                <p role="status">
                  A ativação está em andamento. Confira novamente em alguns instantes.
                  {giftResult.expiresAt
                    ? ` O prazo original do acesso termina em ${date(giftResult.expiresAt)} (horário de Brasília).`
                    : ''}
                </p>
              ) : null}
              <Button disabled={busy} onClick={activate} className="h-12 rounded-full font-bold">
                {busy
                  ? 'Ativando…'
                  : giftResult?.kind === 'processing'
                    ? 'Conferir ativação'
                    : 'Ativar meu presente'}
              </Button>
            </>
          )}
        </>
      ) : null}
      {view?.mode === 'purchase' ? (
        <>
          {view.offer.name !== title ? (
            <h3 className="font-bold text-lg">{view.offer.name}</h3>
          ) : null}
          {view.status === 'READY' ? (
            <PurchaseForm
              key={`${view.checkoutId}:${view.termsVersion}:${view.offer.priceCents}`}
              view={view}
              busy={busy}
              onPay={pay}
            />
          ) : view.status === 'PAID' ? (
            <div role="status" className="flex flex-col gap-3">
              <p className="font-bold">Pagamento confirmado!</p>
              <p>
                {view.accessGranted
                  ? 'Seu acesso já está disponível na plataforma.'
                  : 'Estamos liberando seu acesso. Você pode acompanhar por aqui.'}
              </p>
              {view.accessGranted ? (
                <Button onClick={() => window.location.reload()}>Continuar na plataforma</Button>
              ) : null}
            </div>
          ) : view.status === 'PROCESSING' ? (
            <div className="flex flex-col gap-3">
              <p role="status">
                Estamos conferindo o processamento da sua compra. A mesma tentativa será retomada.
              </p>
              <Button disabled={busy} onClick={() => pay({ resume: true })}>
                Conferir processamento
              </Button>
            </div>
          ) : ['FAILED', 'EXPIRED', 'CANCELED', 'REFUNDED'].includes(view.status) ? (
            <div className="flex flex-col gap-3">
              <p role="status">
                {view.status === 'FAILED'
                  ? 'O pagamento não foi aprovado.'
                  : view.status === 'EXPIRED'
                    ? 'O prazo deste pagamento terminou.'
                    : view.status === 'REFUNDED'
                      ? 'Este pagamento foi estornado.'
                      : 'Este pagamento foi cancelado.'}
              </p>
              {view.status !== 'REFUNDED' ? (
                <Button disabled={busy} onClick={restart}>
                  Iniciar outro pagamento
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <p role="status" className="font-bold">
                Aguardando a confirmação do pagamento.
              </p>
              {view.payment?.pix ? (
                <>
                  {view.payment.pix.imagemQrcodeBase64 ? (
                    <img
                      src={`data:image/png;base64,${view.payment.pix.imagemQrcodeBase64}`}
                      alt="QR Code para pagar com Pix"
                      className="mx-auto size-52 rounded-xl bg-white p-3"
                    />
                  ) : null}
                  <FieldCopy value={view.payment.pix.copiaECola} />
                  {view.payment.pix.expiresAt ? (
                    <p className="text-sm text-muted-foreground">
                      Pix válido até {date(view.payment.pix.expiresAt)}.
                    </p>
                  ) : null}
                </>
              ) : null}
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => refresh(view).catch((e) => setError(errorMessage(e)))}
              >
                Conferir pagamento
              </Button>
              <p className="text-sm text-muted-foreground">
                Você pode fechar e voltar. Este pagamento continuará vinculado à sua conta.
              </p>
            </div>
          )}
        </>
      ) : null}
      {error ? (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3"
        >
          <p className="text-sm text-destructive">{error}</p>
          {!view ? (
            <Button variant="outline" onClick={() => load()}>
              Tentar novamente
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
function FieldCopy({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-bold" htmlFor="commerce-pix-code">
        Pix copia e cola
      </label>
      <textarea
        id="commerce-pix-code"
        className="w-full rounded-xl border border-input bg-background p-3 text-xs"
        value={value}
        readOnly
        rows={3}
      />
      <Button
        variant="outline"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value)
            setCopied(true)
          } catch {
            setCopied(false)
          }
        }}
      >
        {copied ? 'Código copiado' : 'Copiar código Pix'}
      </Button>
    </div>
  )
}
