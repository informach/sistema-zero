'use client'

import { Button } from '@sistemazero/ui/button'
import { ExternalLink } from 'lucide-react'
import { formatShortSp } from '@/lib/dates'
import type { PublicationView } from '@/lib/types'

/**
 * Banner de estado do composer: falha (com lastError + CTAs), agendada,
 * aguardando publicação manual, publicada (com link do post) e cancelada.
 */
export function StatusBanner({
  view,
  onReschedule,
  onMarkPublished,
  onLinkExternal,
}: {
  view: PublicationView
  onReschedule: () => void
  onMarkPublished: () => void
  /** Publicada SEM post vinculado: abre o dialog de vincular o post real. */
  onLinkExternal: () => void
}) {
  if (view.status === 'failed') {
    return (
      <div
        role="alert"
        className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3"
      >
        <p className="text-sm font-medium text-destructive">A publicação falhou.</p>
        {view.lastError ? <p className="text-xs text-destructive/90">{view.lastError}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={onReschedule}>
            Reagendar
          </Button>
          <Button size="sm" variant="outline" onClick={onMarkPublished}>
            Marcar como publicada
          </Button>
        </div>
      </div>
    )
  }

  if (view.status === 'scheduled') {
    return (
      <div
        role="status"
        className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary"
      >
        {view.scheduledAt ? `Agendada para ${formatShortSp(view.scheduledAt)}.` : 'Agendada.'}
      </div>
    )
  }

  if (view.status === 'awaiting_manual') {
    return (
      <div
        role="status"
        className="space-y-2 rounded-lg border border-chart-5/30 bg-chart-5/10 px-4 py-3"
      >
        <p className="text-sm font-medium text-chart-5">
          Hora de publicar. Poste na rede e marque como publicada.
        </p>
        <Button size="sm" variant="outline" onClick={onMarkPublished}>
          Marcar como publicada
        </Button>
      </div>
    )
  }

  if (view.status === 'published') {
    return (
      <div
        role="status"
        className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-success/30 bg-success/15 px-4 py-3 text-sm text-success-foreground"
      >
        <span>Publicada{view.publishedAt ? ` em ${formatShortSp(view.publishedAt)}` : ''}.</span>
        {view.externalUrl ? (
          <a
            href={view.externalUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-medium underline underline-offset-2"
          >
            Ver post
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        ) : null}
        {!view.externalPostId ? (
          <Button size="sm" variant="outline" onClick={onLinkExternal}>
            Vincular post real
          </Button>
        ) : null}
      </div>
    )
  }

  if (view.status === 'canceled') {
    return (
      <div
        role="status"
        className="rounded-lg border border-border bg-muted px-4 py-3 text-sm text-muted-foreground"
      >
        Esta publicação foi cancelada.
      </div>
    )
  }

  return null
}
