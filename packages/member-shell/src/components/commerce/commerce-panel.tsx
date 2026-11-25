'use client'
import type { CommerceOrigin } from '@sistemazero/core/commerce'
import { Button, buttonVariants } from '@sistemazero/ui/button'
import { Check, CheckCircle2, Gift, LoaderCircle } from 'lucide-react'
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { apiSend } from '../../lib/api'
import { cn } from '../../lib/cn'
import type { CommerceView, PurchaseView } from '../../lib/commerce'
import { accountPlace, isCommunityProduct, isCourseProduct, isRecurring } from './commerce-copy'
import { type CouponQuote, OrderSummary, PurchaseForm } from './purchase-form'

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

/** O que vem depois do pagamento (a página do curso passa o link da primeira aula). */
export interface CommerceNextStep {
  href: string
  label: string
  /** A frase do "Pronto", sem o recibo (que o painel sempre acrescenta). */
  text?: string
}

/** O valor da cobrança aberta (com o cupom) para o resumo ao lado do Pix. */
function chargedQuote(view: PurchaseView): CouponQuote | null {
  const charge = view.payment?.charge
  return charge
    ? {
        couponCode: charge.couponCode ?? '',
        listPriceCents: charge.listPriceCents,
        discountCents: charge.discountCents,
        finalPriceCents: charge.chargedPriceCents,
      }
    : null
}

/** O que a nova resposta não traz e a tela ainda precisa (cartão e os dois planos). */
function keep(next: CommerceView, current: PurchaseView): CommerceView {
  return next.mode === 'purchase'
    ? {
        ...next,
        cardConfig: next.cardConfig ?? current.cardConfig,
        plans: next.plans ?? current.plans,
      }
    : next
}

export function CommercePanel({
  origin,
  checkoutId,
  title,
  onUpdated,
  onClose,
  place,
  imageUrl,
  next: nextStep,
}: {
  origin: CommerceOrigin
  checkoutId?: string
  title?: string
  onUpdated?: () => void
  /** Fecha a janela (os botões "Fechar" do Pix e do "Pronto"). */
  onClose?: () => void
  /** O botão que abriu a compra (`pais-inicio`, `pais-curso-fechado`...). O BFF confere. */
  place?: string
  imageUrl?: string
  next?: CommerceNextStep
}) {
  const [view, setView] = useState<CommerceView | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [giftResult, setGiftResult] = useState<{ kind: string; expiresAt?: string | null } | null>(
    null,
  )
  const locked = useRef(false)
  const alive = useRef(true)
  // O plano que a pessoa escolheu no alternador: recarregar (oferta mudou, "Tentar novamente")
  // reabre ESTE plano, não a oferta principal.
  const chosenPlan = useRef<string | undefined>(undefined)
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
            ...(chosenPlan.current ? { offerRef: chosenPlan.current } : {}),
            ...(place ? { place } : {}),
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
    [originKey, checkoutId, place],
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
    const result = await apiSend<CommerceView>('/api/commerce', 'POST', {
      action: 'status',
      origin: current.origin ?? origin,
      checkoutId: current.checkoutId,
    })
    if (!alive.current) return
    setView(keep(result, current))
    if (result.mode === 'purchase' && result.status === 'PAID' && result.accessGranted)
      onUpdated?.()
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
        const result = await apiSend<CommerceView>(
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
        setView(keep(result, current))
        setError('')
        if (result.mode === 'purchase' && result.status === 'PAID' && result.accessGranted)
          onUpdated?.()
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
  async function switchPlan(offerSlug: string) {
    if (locked.current || view?.mode !== 'purchase') return
    locked.current = true
    setBusy(true)
    setError('')
    const current = view
    try {
      const result = await apiSend<CommerceView>('/api/commerce', 'POST', {
        action: 'inspect',
        origin: current.origin ?? origin,
        offerRef: offerSlug,
        ...(place ? { place } : {}),
      })
      if (!alive.current) return
      if (result.mode === 'purchase') chosenPlan.current = result.offer.slug
      setView(keep(result, current))
    } catch (e) {
      if (alive.current) setError(errorMessage(e))
    } finally {
      locked.current = false
      if (alive.current) setBusy(false)
    }
  }
  async function quote(couponCode: string): Promise<CouponQuote> {
    if (view?.mode !== 'purchase') throw new Error('Abra a compra de novo para usar o cupom.')
    const result = await apiSend<{
      couponCode?: string | null
      listPriceCents: number
      discountCents: number
      finalPriceCents: number
    }>('/api/commerce', 'POST', {
      action: 'quote',
      origin: view.origin ?? origin,
      offerRef: view.offer.slug,
      data: { couponCode },
    })
    return {
      couponCode: result.couponCode || couponCode,
      listPriceCents: result.listPriceCents,
      discountCents: result.discountCents,
      finalPriceCents: result.finalPriceCents,
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
        offerRef: view.offer.slug,
        ...(place ? { place } : {}),
        data,
      })
      if (alive.current) setView(keep(result, view))
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
      const result = await apiSend<CommerceView>('/api/commerce', 'POST', {
        action: 'restart',
        origin: view.origin ?? origin,
        checkoutId: view.checkoutId,
        offerRef: view.offer.slug,
        ...(place ? { place } : {}),
      })
      if (alive.current) setView(keep(result, view))
    } catch (e) {
      if (alive.current) setError(errorMessage(e))
    } finally {
      locked.current = false
      if (alive.current) setBusy(false)
    }
  }
  const errorBox = error ? (
    <div
      role="alert"
      className="flex flex-col gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3"
    >
      <p className="m-0 text-destructive text-sm">{error}</p>
      {!view ? (
        <Button variant="outline" onClick={() => load()}>
          Tentar novamente
        </Button>
      ) : null}
    </div>
  ) : null
  if (view?.mode === 'purchase')
    return (
      <div className="flex flex-col" aria-busy={busy}>
        <PurchaseSteps view={view} />
        {view.status === 'READY' ? (
          <PurchaseForm
            key={`${view.checkoutId}:${view.termsVersion}:${view.offer.priceCents}`}
            view={view}
            busy={busy}
            onPay={pay}
            onSwitchPlan={switchPlan}
            onQuote={quote}
            imageUrl={imageUrl}
          />
        ) : (
          <div className="flex flex-wrap">
            <div className="flex min-w-0 flex-[999_1_440px] flex-col gap-4 px-7 py-6 max-[480px]:px-4">
              <PurchaseStatus
                view={view}
                busy={busy}
                imageUrl={imageUrl}
                next={nextStep}
                onClose={onClose}
                onCheck={() => refresh(view).catch((e) => setError(errorMessage(e)))}
                onResume={() => pay({ resume: true })}
                onRestart={restart}
              />
            </div>
            <OrderSummary
              offer={view.offer}
              method={view.payment?.pix ? 'pix' : 'card'}
              coupon={chargedQuote(view)}
              imageUrl={imageUrl}
            />
          </div>
        )}
        {errorBox ? <div className="px-7 pb-6 max-[480px]:px-4">{errorBox}</div> : null}
      </div>
    )
  return (
    <div className="flex flex-col gap-5 p-5" aria-busy={busy}>
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
              <h3 className="font-bold text-lg">
                {view.gift.courseTitle || view.gift.offerTitle || title}
              </h3>
              <p className="mt-1 text-muted-foreground text-sm">
                {view.gift.accessDays === null
                  ? ''
                  : `${view.gift.accessDays} dias de acesso. O prazo começa quando você ativa o presente e corre mesmo sem uso. `}
                Sem cobrança ou cartão.
              </p>
            </div>
          </div>
          {giftResult?.kind === 'completed' || giftResult?.kind === 'already_redeemed' ? (
            <div role="status" className="flex flex-col gap-3">
              <p className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="size-5 text-primary" />
                {giftResult.kind === 'completed'
                  ? 'Presente ativado.'
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
      {errorBox}
    </div>
  )
}

/** "1 · Plano e pagamento / 2 · Pagar / 3 · Pronto" (no curso, "1 · Pagamento"). */
function PurchaseSteps({ view }: { view: PurchaseView }) {
  const current = view.status === 'READY' ? 1 : view.status === 'PAID' ? 3 : 2
  const labels = [isRecurring(view.offer) ? 'Plano e pagamento' : 'Pagamento', 'Pagar', 'Pronto']
  return (
    <ol
      aria-label="Etapas"
      className="m-0 flex list-none flex-wrap gap-2 border-border border-b px-7 py-3.5 font-bold text-[13px] max-[480px]:px-4"
    >
      {labels.map((label, index) => {
        const n = index + 1
        return (
          <li
            key={label}
            aria-current={n === current ? 'step' : undefined}
            className={cn(
              'rounded-full px-2.5 py-1',
              n === current
                ? 'bg-primary text-primary-foreground'
                : n < current
                  ? 'bg-success/15 text-success'
                  : 'bg-muted text-muted-foreground',
            )}
          >
            {n} · {label}
          </li>
        )
      })}
    </ol>
  )
}

function Actions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap justify-center gap-2.5">{children}</div>
}

function PurchaseStatus({
  view,
  busy,
  imageUrl,
  next,
  onClose,
  onCheck,
  onResume,
  onRestart,
}: {
  view: PurchaseView
  busy: boolean
  imageUrl?: string
  next?: CommerceNextStep
  onClose?: () => void
  onCheck: () => void
  onResume: () => void
  onRestart: () => void
}) {
  const audience = view.offer.product.audience
  const close = onClose ? (
    <Button variant="outline" className="h-12 rounded-full px-6 font-extrabold" onClick={onClose}>
      Fechar
    </Button>
  ) : null
  if (view.status === 'PAID')
    return view.accessGranted ? (
      <PurchaseDone view={view} imageUrl={imageUrl} next={next} close={close} />
    ) : (
      <div role="status" className="flex flex-col items-center gap-3.5 py-3 text-center">
        <ConfirmedChip />
        <p className="m-0">Estamos liberando seu acesso. Esta janela avisa sozinha.</p>
      </div>
    )
  if (view.status === 'PROCESSING')
    return (
      <div className="flex flex-col gap-3">
        <p role="status" className="m-0">
          Estamos conferindo o processamento da sua compra. A mesma tentativa será retomada.
        </p>
        <Button disabled={busy} onClick={onResume}>
          Conferir processamento
        </Button>
      </div>
    )
  if (['FAILED', 'EXPIRED', 'CANCELED', 'REFUNDED'].includes(view.status))
    return (
      <div className="flex flex-col gap-3">
        <p role="status" className="m-0">
          {view.status === 'FAILED'
            ? 'O pagamento não foi aprovado.'
            : view.status === 'EXPIRED'
              ? 'O prazo deste pagamento terminou.'
              : view.status === 'REFUNDED'
                ? 'Este pagamento foi estornado.'
                : 'Este pagamento foi cancelado.'}
        </p>
        {view.status !== 'REFUNDED' ? (
          <Button disabled={busy} onClick={onRestart}>
            Iniciar outro pagamento
          </Button>
        ) : null}
      </div>
    )
  const pix = view.payment?.pix
  return (
    <div className="flex flex-col items-center gap-3.5 text-center">
      {pix ? (
        <>
          <p className="m-0 font-extrabold text-lg">Escaneie o QR Code no app do seu banco</p>
          {pix.imagemQrcodeBase64 ? (
            <img
              src={`data:image/png;base64,${pix.imagemQrcodeBase64}`}
              alt="QR Code do Pix"
              className="size-52 rounded-2xl bg-card p-3 ring-2 ring-border"
            />
          ) : null}
          <FieldCopy value={pix.copiaECola} />
        </>
      ) : null}
      <div
        role="status"
        className="box-border flex w-full items-center gap-2.5 rounded-2xl bg-(--kids-ouro-tint,var(--color-muted)) px-4 py-3 text-left text-sm"
      >
        <LoaderCircle
          className="size-5 shrink-0 animate-spin text-(--kids-ouro-texto,currentColor) motion-reduce:animate-none"
          aria-hidden="true"
        />
        <span>
          Aguardando o pagamento.
          {pix ? ' Assim que o Pix cair, esta janela avisa sozinha.' : ''}
          {pix?.expiresAt ? ` Válido até ${date(pix.expiresAt)}.` : ''}
        </span>
      </div>
      <Actions>
        {close}
        <Button disabled={busy} className="h-12 rounded-full px-6 font-extrabold" onClick={onCheck}>
          Já paguei, conferir
        </Button>
      </Actions>
      <p className="m-0 text-muted-foreground text-[13px]">
        Pode fechar e voltar depois: o pagamento continua {accountPlace(audience)}.
      </p>
    </div>
  )
}

function ConfirmedChip() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3.5 py-1.5 font-extrabold text-sm text-success">
      <Check className="size-4" strokeWidth={2.8} aria-hidden="true" />
      Pagamento confirmado
    </span>
  )
}

/** A tela "Pronto": o que já está liberado e o próximo passo. */
function PurchaseDone({
  view,
  imageUrl,
  next,
  close,
}: {
  view: PurchaseView
  imageUrl?: string
  next?: CommerceNextStep
  close: ReactNode
}) {
  const offer = view.offer
  const kids = offer.product.audience === 'kids'
  const community = isCommunityProduct(offer)
  const go = (href: string, label: string) => (
    <a
      href={href}
      className={buttonVariants({ className: 'h-12 rounded-full px-6 font-extrabold' })}
    >
      {label}
    </a>
  )
  if (isRecurring(offer))
    return (
      <div role="status" className="flex flex-col items-center gap-3.5 py-4 text-center">
        <span className="flex size-[72px] items-center justify-center rounded-full bg-success/15 text-success">
          <Check className="size-9" strokeWidth={2.6} aria-hidden="true" />
        </span>
        <h3 className="sz-display m-0 text-[28px] leading-tight">
          {kids && community
            ? `A ${offer.product.name} está liberada`
            : 'Sua assinatura está ativa'}
        </h3>
        <p className="m-0 max-w-[30rem] text-base text-muted-foreground">
          {/* "E você ganhou todos os cursos para pais" volta quando a dona confirmar que a
              assinatura Kids inclui os cursos para pais. */}
          {community
            ? kids
              ? 'Os cursos de criação de jogos, o Estúdio e o Mural já estão liberados para os seus filhos.'
              : 'Os cursos, o Estúdio e o Mural já estão liberados na sua conta.'
            : `O acesso a ${offer.product.name} já está liberado ${kids ? 'para os seus filhos' : 'na sua conta'}.`}
        </p>
        {kids ? (
          <ol className="m-0 box-border w-full rounded-2xl bg-muted py-4 pr-5 pl-9 text-left text-[15px] leading-relaxed">
            <li>Em Família, crie o perfil do seu filho ou confira o que já existe.</li>
            <li>Autorize o computador em que ele vai usar a plataforma.</li>
            <li>O recibo e a nota fiscal chegam no seu e-mail.</li>
          </ol>
        ) : (
          <p className="m-0 text-muted-foreground text-sm">
            O recibo e a nota fiscal chegam no seu e-mail.
          </p>
        )}
        <Actions>
          {close}
          {next
            ? go(next.href, next.label)
            : kids
              ? go('/pais/familia', 'Ir para Família')
              : go('/cursos', 'Ir para os cursos')}
        </Actions>
      </div>
    )
  return (
    <div role="status" className="flex flex-col items-center gap-3.5 py-3 text-center">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="h-[170px] w-full max-w-[360px] rounded-[20px] object-cover"
        />
      ) : null}
      <ConfirmedChip />
      <h3 className="sz-display m-0 text-[28px] leading-tight">
        {isCourseProduct(offer) ? 'O curso já é seu' : 'Compra confirmada'}
      </h3>
      <p className="m-0 max-w-[30rem] text-base text-muted-foreground">
        {next?.text ?? `O acesso a ${offer.product.name} já está liberado na sua conta.`} O recibo e
        a nota fiscal chegam no seu e-mail.
      </p>
      <Actions>
        {close}
        {next ? (
          go(next.href, next.label)
        ) : (
          <Button
            className="h-12 rounded-full px-6 font-extrabold"
            onClick={() => window.location.reload()}
          >
            Continuar na plataforma
          </Button>
        )}
      </Actions>
    </div>
  )
}

function FieldCopy({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex w-full flex-col gap-1.5 text-left">
      <label className="font-bold text-sm" htmlFor="commerce-pix-code">
        Pix copia e cola
      </label>
      <div className="flex gap-2">
        <input
          id="commerce-pix-code"
          className="h-12 min-w-0 flex-1 rounded-[14px] border border-input bg-background px-3.5 text-sm"
          value={value}
          readOnly
          onFocus={(e) => e.currentTarget.select()}
        />
        <Button
          className="h-12 shrink-0 rounded-full px-[18px] font-extrabold"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value)
              setCopied(true)
            } catch {
              setCopied(false)
            }
          }}
        >
          {copied ? 'Copiado' : 'Copiar'}
        </Button>
      </div>
    </div>
  )
}
