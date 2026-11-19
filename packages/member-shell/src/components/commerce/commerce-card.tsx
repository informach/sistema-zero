'use client'
import type { CommerceBlock, CommerceOrigin } from '@sistemazero/core/commerce'
import { Button, buttonVariants } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Gift, ShoppingBag } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { apiGet } from '../../lib/api'
import type { PromotionCardView } from '../../lib/commerce'
import { useLessonPlayer } from '../lesson-player-context'
import { useLessonPreview } from '../lesson-preview-context'
import { CommercePanel } from './commerce-panel'

export function CommerceCard({
  origin,
  title,
  description,
  buttonLabel,
  imageUrl,
  mode,
  preview = false,
  manageUrl,
}: {
  origin: CommerceOrigin
  title: string
  description?: string
  buttonLabel?: string
  imageUrl?: string
  mode: 'gift' | 'purchase'
  preview?: boolean
  manageUrl?: string
}) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const updated = useCallback(() => {
    router.refresh()
    window.dispatchEvent(new Event('sz-commerce-updated'))
  }, [router])
  const Icon = mode === 'gift' ? Gift : ShoppingBag
  return (
    <>
      <section className="kids-carta flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-6">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="aspect-video w-full rounded-2xl object-cover" />
        ) : null}
        <span className="flex items-center gap-2 font-bold text-primary text-sm">
          <Icon className="size-5" aria-hidden="true" />
          {mode === 'gift' ? 'Seu presente' : manageUrl ? 'Seu acesso' : 'Para continuar criando'}
        </span>
        <h3 className="sz-display font-bold text-xl leading-tight">{title}</h3>
        {description ? (
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        ) : null}
        {manageUrl ? (
          <a href={manageUrl} className={buttonVariants({ variant: 'outline' })}>
            Gerenciar meu acesso
          </a>
        ) : (
          <Button
            className="h-11 rounded-full font-bold"
            disabled={preview}
            onClick={() => setOpen(true)}
          >
            {buttonLabel || (mode === 'gift' ? 'Ativar presente' : 'Ver oferta e continuar')}
          </Button>
        )}
        {preview ? (
          <p className="text-xs text-muted-foreground">
            Prévia: nenhuma cobrança ou ativação será realizada.
          </p>
        ) : null}
      </section>
      <Dialog open={open} onClose={() => setOpen(false)} title={title} className="max-w-xl">
        {open ? <CommercePanel origin={origin} title={title} onUpdated={updated} /> : null}
      </Dialog>
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
export function CommercePromotions() {
  const [items, setItems] = useState<PromotionCardView[]>([])
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
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setUnavailable(true)
      })
    return () => controller.abort()
  }, [revision])
  if (unavailable)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Não foi possível conferir as ofertas agora.{' '}
        <button type="button" className="underline" onClick={() => setRevision((r) => r + 1)}>
          Tentar novamente
        </button>
      </p>
    )
  return (
    <>
      {items.map(({ origin, offerRef, promotion, decision }) => (
        <CommerceCard
          key={offerRef}
          origin={origin ?? { kind: 'promotion', offerRef }}
          mode={promotion.mode}
          title={promotion.title}
          description={
            decision.giftEndsAt
              ? `${promotion.description} Seu presente atual continua válido até ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(decision.giftEndsAt))}.`
              : promotion.description
          }
          buttonLabel={promotion.buttonLabel}
          imageUrl={promotion.imageUrl}
          manageUrl={decision.kind === 'manage' ? (decision.manageUrl ?? '/pais/conta') : undefined}
        />
      ))}
    </>
  )
}
