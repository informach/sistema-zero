'use client'
import type {
  CommerceBlock,
  CommerceCatalogOffer,
  CommerceOrigin,
} from '@sistemazero/core/commerce'
import { Button, buttonVariants } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Check, CheckCircle2, Gift, ShoppingBag, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { apiGet, apiSend } from '../../lib/api'
import type { CommerceView, PromotionCardView } from '../../lib/commerce'
import { useLessonPlayer } from '../lesson-player-context'
import { useLessonPreview } from '../lesson-preview-context'
import {
  intervalText,
  isCommunityProduct,
  isRecurring,
  money,
  perMonthCents,
  purchaseDialogTitle,
} from './commerce-copy'
import { type CommerceNextStep, CommercePanel } from './commerce-panel'

/**
 * Os três jeitos do cartão (Canvas "pais-inicio", 25/11/2026):
 * - `community`: o destaque da Comunidade, com a imagem ao lado, o que entra e os dois planos;
 * - `course`: o cartão do curso com capa, selo, preço e "pagamento único";
 * - `default`: o cartão simples dos blocos da aula e dos presentes.
 * Preço, perfis e garantia vêm sempre da oferta; o cartão não guarda número nenhum.
 */
export type CommerceCardVariant = 'community' | 'course' | 'default'

// A assinatura Kids da Comunidade inclui os cursos para pais (confirmado pela dona, 25/11/2026).
const COMMUNITY_KIDS_INCLUDES = [
  'Todos os cursos de criação de jogos, o Estúdio e o Mural',
  'Todos os cursos para pais, inclusive os próximos que forem lançados',
]

function PriceLine({
  offer,
  plans,
}: {
  offer: CommerceCatalogOffer
  plans?: CommerceCatalogOffer[]
}) {
  const monthly = plans?.find((p) => isRecurring(p) && p.billingIntervalMonths === 1)
  const annual = plans?.find((p) => isRecurring(p) && p.billingIntervalMonths === 12)
  if (monthly && annual)
    return (
      <p className="m-0 mt-0.5 text-[15px]">
        <strong className="text-xl">{money(monthly.priceCents)}</strong> por mês ou{' '}
        <strong className="text-xl">{money(annual.priceCents)}</strong> por ano{' '}
        <span className="text-muted-foreground">({money(perMonthCents(annual))} por mês)</span>
      </p>
    )
  return (
    <p className="m-0 mt-0.5 text-[15px]">
      <strong className="text-xl">{money(offer.priceCents)}</strong> {intervalText(offer)}
    </p>
  )
}

/**
 * A janela do mini checkout e a atualização da página (revisão do Lote 6, 25/11/2026): o aviso
 * `sz-commerce-updated` sai na hora, mas o `router.refresh()` espera a janela fechar. Atualizar com
 * ela aberta trocava a página (o curso fechado vira o curso liberado) e a tela de "Pronto" sumia
 * antes de a pessoa ler; num build novo o refresh ainda vira recarregamento.
 */
/**
 * As compras com a janela ABERTA (por oferta): a lista de promoções não tira esse cartão enquanto
 * a janela está aberta, mesmo depois de a oferta passar a "já tem" (o "Pronto" continua na tela).
 * Revisão do Lote 7 (25/11/2026).
 */
const OPEN_PURCHASES = new Set<string>()
export function isPurchaseDialogOpen(key: string | undefined): boolean {
  return key !== undefined && OPEN_PURCHASES.has(key)
}

export function useCommerceDialogRefresh(key?: string) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const pending = useRef(false)
  const updated = useCallback(() => {
    pending.current = true
    window.dispatchEvent(new Event('sz-commerce-updated'))
  }, [])
  const openDialog = useCallback(() => {
    if (key) OPEN_PURCHASES.add(key)
    setOpen(true)
  }, [key])
  const close = useCallback(() => {
    setOpen(false)
    if (key) OPEN_PURCHASES.delete(key)
    if (pending.current) {
      pending.current = false
      // A lista volta a filtrar o que a conta já tem, e a página do servidor atualiza.
      window.dispatchEvent(new Event('sz-commerce-updated'))
      router.refresh()
    }
  }, [key, router])
  // O cartão saiu da tela com a compra pendente (a página mudou por baixo): a atualização não
  // pode se perder junto com ele. O router vai por referência: a limpeza roda só ao desmontar
  // (ou ao trocar de oferta), nunca a cada render.
  const routerRef = useRef(router)
  routerRef.current = router
  useEffect(
    () => () => {
      if (key) OPEN_PURCHASES.delete(key)
      if (pending.current) {
        pending.current = false
        routerRef.current.refresh()
      }
    },
    [key],
  )
  return { open, openDialog, close, updated }
}

export function CommerceCard({
  origin,
  title,
  description,
  buttonLabel,
  imageUrl,
  mode,
  preview = false,
  manageUrl,
  variant = 'default',
  offer,
  plans,
  label,
  eyebrow,
  badge,
  chips,
  place,
  next,
}: {
  origin: CommerceOrigin
  title: string
  description?: string
  buttonLabel?: string
  imageUrl?: string
  mode: 'gift' | 'purchase'
  preview?: boolean
  manageUrl?: string
  variant?: CommerceCardVariant
  /** A oferta lida do catálogo: preço, perfis e garantia do cartão. */
  offer?: CommerceCatalogOffer
  /** Os dois planos da assinatura, para a linha "por mês ou por ano". */
  plans?: CommerceCatalogOffer[]
  /** O rótulo azul do destaque ("Comunidade dos Criadores"). */
  label?: string
  /** A linha pequena acima do título do curso ("Para você"). */
  eyebrow?: string
  /** O selo sobre a capa do curso ("Curso para pais"). */
  badge?: string
  chips?: string[]
  /** O botão que abriu a compra, para a Origem das vendas. */
  place?: string
  next?: CommerceNextStep
}) {
  const { open, openDialog, close, updated } = useCommerceDialogRefresh(offer?.slug)
  const originKey = JSON.stringify(origin)
  const giftIdentity = mode === 'gift' && !preview ? originKey : null
  const [inclusion, setInclusion] = useState<{
    identity: string
    view: Extract<CommerceView, { mode: 'included' }>
  } | null>(null)
  const included =
    giftIdentity !== null && inclusion?.identity === giftIdentity ? inclusion.view : null
  useEffect(() => {
    if (giftIdentity === null) {
      setInclusion(null)
      return
    }
    let active = true
    let sequence = 0
    let controller: AbortController | undefined
    const inspect = () => {
      const requestSequence = ++sequence
      controller?.abort()
      controller = new AbortController()
      apiSend<CommerceView>(
        '/api/commerce',
        'POST',
        {
          action: 'inspect',
          origin: JSON.parse(giftIdentity),
        },
        undefined,
        { signal: controller.signal },
      )
        .then((view) => {
          if (active && requestSequence === sequence)
            setInclusion(view.mode === 'included' ? { identity: giftIdentity, view } : null)
        })
        .catch(() => {
          if (active && requestSequence === sequence) setInclusion(null)
        })
    }
    inspect()
    window.addEventListener('sz-commerce-updated', inspect)
    return () => {
      active = false
      sequence++
      controller?.abort()
      window.removeEventListener('sz-commerce-updated', inspect)
    }
  }, [giftIdentity])
  const Icon = included ? CheckCircle2 : mode === 'gift' ? Gift : ShoppingBag
  const purchase = mode === 'purchase' && !included
  const dialogTitle = purchase && offer ? purchaseDialogTitle(offer) : title
  const action = included ? (
    <a
      href={included.continueUrl}
      className={buttonVariants({ className: 'h-11 rounded-full font-bold' })}
    >
      {included.continueUrl === '/pais/familia' ? 'Continuar com meu filho' : 'Ir para o curso'}
    </a>
  ) : manageUrl ? (
    <a href={manageUrl} className={buttonVariants({ variant: 'outline' })}>
      Gerenciar meu acesso
    </a>
  ) : (
    <Button
      className={
        variant === 'course'
          ? 'h-12 w-full rounded-full font-extrabold'
          : 'h-12 self-start rounded-full px-6 font-extrabold'
      }
      disabled={preview}
      onClick={openDialog}
    >
      {buttonLabel || (mode === 'gift' ? 'Ativar presente' : 'Ver oferta e continuar')}
    </Button>
  )
  const previewNote = preview ? (
    <p className="m-0 text-xs text-muted-foreground">
      Prévia: nenhuma cobrança ou ativação será realizada.
    </p>
  ) : null
  const dialog = (
    <Dialog
      open={open}
      onClose={close}
      title={dialogTitle}
      className={purchase ? 'max-w-[900px] rounded-[28px]' : 'max-w-xl'}
      bodyClassName="p-0"
    >
      {open ? (
        <CommercePanel
          origin={origin}
          title={title}
          onUpdated={updated}
          onClose={close}
          place={place}
          imageUrl={imageUrl}
          next={next}
        />
      ) : null}
    </Dialog>
  )
  if (variant === 'community' && !included) {
    const includes = [
      ...(offer && offer.product.audience === 'kids' && isCommunityProduct(offer)
        ? COMMUNITY_KIDS_INCLUDES
        : []),
      ...(offer?.content?.maxProfiles && offer.product.audience === 'kids'
        ? [
            offer.content.maxProfiles === 1
              ? 'Um perfil de criança na conta'
              : `Até ${offer.content.maxProfiles} perfis de criança na mesma conta, um para cada filho`,
          ]
        : []),
    ]
    const guarantee = offer?.guaranteeDays
    return (
      <>
        <section className="kids-carta flex min-w-0 flex-wrap overflow-hidden rounded-3xl border border-border bg-card p-0 text-card-foreground">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="max-h-[460px] min-h-[280px] min-w-0 flex-[1_1_260px] bg-muted object-contain p-4"
            />
          ) : null}
          <div className="flex min-w-0 flex-[1.3_1_320px] flex-col gap-3.5 p-7 max-[480px]:p-5">
            <span className="inline-flex items-center gap-1.5 font-bold text-primary text-sm">
              <Sparkles className="size-[18px]" aria-hidden="true" />
              {label ?? offer?.product.name ?? 'Para continuar criando'}
            </span>
            <h2 className="sz-display m-0 text-[30px] leading-tight">{title}</h2>
            {description ? (
              <p className="m-0 text-base text-muted-foreground leading-relaxed">{description}</p>
            ) : null}
            {includes.length ? (
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {includes.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[15px] leading-snug">
                    <Check
                      className="mt-px size-[22px] shrink-0 text-success"
                      strokeWidth={2.6}
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
            {offer && !manageUrl ? <PriceLine offer={offer} plans={plans} /> : null}
            {action}
            {!manageUrl ? (
              <p className="m-0 text-[13px] text-muted-foreground">
                {guarantee
                  ? `Você assina aqui mesmo, com a sua conta, e tem ${guarantee} ${guarantee === 1 ? 'dia' : 'dias'} de garantia.`
                  : 'Você assina aqui mesmo, com a sua conta.'}
              </p>
            ) : null}
            {previewNote}
          </div>
        </section>
        {dialog}
      </>
    )
  }
  if (variant === 'course' && !included)
    return (
      <>
        <article className="kids-carta flex min-w-0 flex-col overflow-hidden rounded-3xl border border-border bg-card p-0 text-card-foreground">
          {imageUrl || badge ? (
            <div className="relative bg-muted">
              {imageUrl ? (
                <img src={imageUrl} alt="" className="block h-[190px] w-full object-cover" />
              ) : (
                <div className="h-[72px]" />
              )}
              {badge ? (
                <span className="absolute top-3.5 left-3.5 inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1 font-extrabold text-[13px] text-primary shadow-sm">
                  {badge}
                </span>
              ) : null}
            </div>
          ) : null}
          <div className="flex flex-col gap-2.5 px-[22px] pt-5 pb-[22px]">
            {eyebrow ? (
              <span className="font-extrabold text-primary text-xs uppercase tracking-[0.1em]">
                {eyebrow}
              </span>
            ) : null}
            <h2 className="sz-display m-0 text-2xl leading-tight">{title}</h2>
            {description ? (
              <p className="m-0 text-[15px] text-muted-foreground leading-normal">{description}</p>
            ) : null}
            {chips?.length ? (
              <div className="flex flex-wrap gap-1.5">
                {chips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full bg-muted px-3 py-1 font-bold text-[13px] text-muted-foreground"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            ) : null}
            {offer && !manageUrl ? (
              <div className="mt-1.5 flex items-baseline justify-between gap-2.5 border-border border-t-2 border-dashed pt-3.5">
                <strong className="sz-display text-[26px]">{money(offer.priceCents)}</strong>
                <span className="font-bold text-[13px] text-muted-foreground">
                  {isRecurring(offer) ? intervalText(offer) : 'pagamento único'}
                </span>
              </div>
            ) : null}
            {action}
            {previewNote}
          </div>
        </article>
        {dialog}
      </>
    )
  return (
    <>
      <section className="kids-carta flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-6">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="aspect-video w-full rounded-2xl object-cover" />
        ) : null}
        <span className="flex items-center gap-2 font-bold text-primary text-sm">
          <Icon className="size-5" aria-hidden="true" />
          {included || manageUrl
            ? 'Seu acesso'
            : mode === 'gift'
              ? 'Seu presente'
              : 'Para continuar criando'}
        </span>
        <h3 className="sz-display font-bold text-xl leading-tight">
          {included ? `${included.courseTitle} já está incluído no seu acesso` : title}
        </h3>
        {included || description ? (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {included?.message ?? description}
          </p>
        ) : null}
        {action}
        {previewNote}
      </section>
      {dialog}
    </>
  )
}
export function CommerceLessonBlock({
  content,
  blockId,
}: {
  content: CommerceBlock
  blockId: string
}) {
  const player = useLessonPlayer()
  const rehearsal = useLessonPreview()
  const preview = Boolean(rehearsal) || !player?.lessonId || !player.viewerId
  return (
    <CommerceCard
      origin={{
        kind: 'lesson',
        courseSlug: player?.courseSlug ?? 'preview',
        lessonId: player?.lessonId ?? '00000000-0000-4000-8000-000000000000',
        blockId,
      }}
      mode={content.kind}
      title={
        content.title ||
        (content.kind === 'gift' ? 'Um presente para você' : 'Continue com esta oferta')
      }
      description={content.description}
      buttonLabel={content.buttonLabel}
      preview={preview}
    />
  )
}
/**
 * O botão de compra sozinho (25/11/2026): abre a mesma janela do mini checkout que o cartão, para
 * uma página que desenha a própria oferta (o curso fechado na área dos pais).
 */
export function CommercePurchaseButton({
  origin,
  offer,
  label,
  place,
  imageUrl,
  next,
  className,
}: {
  origin: CommerceOrigin
  offer: CommerceCatalogOffer
  label: string
  place?: string
  imageUrl?: string
  next?: CommerceNextStep
  className?: string
}) {
  const { open, openDialog, close, updated } = useCommerceDialogRefresh()
  return (
    <>
      <Button
        className={className ?? 'h-12 w-full rounded-full font-extrabold'}
        onClick={openDialog}
      >
        {label}
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title={purchaseDialogTitle(offer)}
        className="max-w-[900px] rounded-[28px]"
        bodyClassName="p-0"
      >
        {open ? (
          <CommercePanel
            origin={origin}
            onUpdated={updated}
            onClose={close}
            place={place}
            imageUrl={imageUrl}
            next={next}
          />
        ) : null}
      </Dialog>
    </>
  )
}

/** As promoções da Início, lidas uma vez e relidas a cada `sz-commerce-updated`. */
export interface CommercePromotionsState {
  items: PromotionCardView[]
  /** `true` depois da primeira resposta (com ou sem itens). */
  loaded: boolean
  unavailable: boolean
  retry: () => void
}

/**
 * Uma leitura de `/api/commerce/promotions` para a página inteira (revisão do Lote 6, 25/11/2026):
 * o Início dos pais mostra o destaque da Comunidade e os outros cartões em dois lugares, e cada
 * `CommercePromotions` buscava a mesma lista.
 */
export function useCommercePromotions(): CommercePromotionsState {
  const [items, setItems] = useState<PromotionCardView[]>([])
  const [loaded, setLoaded] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const refresh = () => setRevision((v) => v + 1)
    window.addEventListener('sz-commerce-updated', refresh)
    return () => window.removeEventListener('sz-commerce-updated', refresh)
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    apiGet<{ items: PromotionCardView[] }>(
      `/api/commerce/promotions?revision=${revision}`,
      undefined,
      {
        signal: controller.signal,
      },
    )
      .then((result) => {
        if (!controller.signal.aborted) {
          setItems(result.items)
          setUnavailable(false)
          setLoaded(true)
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setUnavailable(true)
          setLoaded(true)
        }
      })
    return () => controller.abort()
  }, [revision])
  const retry = useCallback(() => setRevision((r) => r + 1), [])
  return { items, loaded, unavailable, retry }
}

/** O recorte de `only`/`skipManaged` (o destaque da Comunidade ou o resto). */
export function selectPromotions(
  items: PromotionCardView[],
  { only, skipManaged = false }: { only?: 'community' | 'others'; skipManaged?: boolean } = {},
): PromotionCardView[] {
  return items.filter((item) => {
    // A compra que acabou de virar "já tem" fica enquanto a janela dela está aberta.
    if (
      skipManaged &&
      item.decision.kind === 'manage' &&
      !isPurchaseDialogOpen(item.offer?.slug ?? item.offerRef)
    )
      return false
    const community = Boolean(item.offer && isCommunityProduct(item.offer))
    return only === 'community' ? community : only === 'others' ? !community : true
  })
}

/**
 * Os cartões de uma leitura já feita (`useCommercePromotions`). `showUnavailable` desligado não
 * repete o "Não foi possível conferir as ofertas" quando a página tem dois recortes.
 */
export function CommercePromotionList({
  state,
  only,
  skipManaged = false,
  showUnavailable = true,
}: {
  state: CommercePromotionsState
  only?: 'community' | 'others'
  skipManaged?: boolean
  showUnavailable?: boolean
}) {
  if (state.unavailable)
    return showUnavailable ? (
      <p role="status" className="text-sm text-muted-foreground">
        Não foi possível conferir as ofertas agora.{' '}
        <button type="button" className="underline" onClick={state.retry}>
          Tentar novamente
        </button>
      </p>
    ) : null
  const shown = selectPromotions(state.items, { only, skipManaged })
  return (
    <>
      {shown.map(({ origin, offerRef, promotion, decision, offer, plans }) => (
        <CommerceCard
          key={offerRef}
          origin={origin ?? { kind: 'promotion', offerRef }}
          mode={promotion.mode}
          variant={
            promotion.mode === 'purchase' && offer
              ? isCommunityProduct(offer)
                ? 'community'
                : isRecurring(offer)
                  ? 'default'
                  : 'course'
              : 'default'
          }
          offer={offer}
          plans={plans}
          title={promotion.title}
          description={
            decision.giftEndsAt
              ? `${promotion.description} Seu presente atual continua válido até ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(decision.giftEndsAt))}.`
              : promotion.description
          }
          buttonLabel={promotion.buttonLabel}
          imageUrl={promotion.imageUrl}
          manageUrl={decision.kind === 'manage' ? (decision.manageUrl ?? '/pais/conta') : undefined}
          place={offer?.product.audience === 'adult' ? 'inicio' : 'pais-inicio'}
        />
      ))}
    </>
  )
}

/**
 * As ofertas da Início, com a leitura própria. `only` separa o destaque da Comunidade (coluna
 * principal) dos outros cartões (a lateral); `skipManaged` esconde o que a conta já tem. Página
 * com dois recortes usa `useCommercePromotions` + `CommercePromotionList` (uma leitura só).
 */
export function CommercePromotions({
  only,
  skipManaged = false,
}: {
  only?: 'community' | 'others'
  skipManaged?: boolean
} = {}) {
  const state = useCommercePromotions()
  return <CommercePromotionList state={state} only={only} skipManaged={skipManaged} />
}
