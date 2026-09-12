'use client'

import {
  GALLERY_DRAWING_KINDS,
  type GalleryDeliveryConfig,
  type GallerySelection,
} from '@sistemazero/core/learning'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Check, ExternalLink, Images, Send } from 'lucide-react'
import { useRef, useState } from 'react'
import { apiGet, apiSend } from '../lib/api'
import type { CreationIndexView, CreationSummaryView, LessonBlockView } from '../lib/types'
import { useLessonPlayer } from './lesson-player-context'

function errorMessage(error: unknown) {
  return typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
    ? error.message
    : 'Não foi possível carregar seus trabalhos. Tente novamente.'
}

export function LessonGalleryDelivery({
  block,
  tool,
  config,
}: {
  block: LessonBlockView
  tool: 'studio' | 'pinta'
  config: GalleryDeliveryConfig
}) {
  const player = useLessonPlayer()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<CreationSummaryView[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [selected, setSelected] = useState<GallerySelection[]>([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const busy = useRef(false)
  const request = useRef<{ key: string; id: string } | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const submitted =
    confirmed || (tool === 'studio' ? block.studioState?.submitted : block.pintaState?.submitted)
  const label = tool === 'pinta' ? 'Pinta' : 'Estúdio'
  const permitted =
    player &&
    (!player.submissionAllowedBlockIds || player.submissionAllowedBlockIds.includes(block.id))
  async function load(next?: string) {
    if (busy.current) return
    busy.current = true
    setLoading(true)
    setError('')
    try {
      const result = await apiGet<{ items: CreationIndexView[]; nextCursor: string | null }>(
        `/api/members/creations/${tool}?limit=100${next ? `&cursor=${encodeURIComponent(next)}` : ''}`,
        { 'x-sz-viewer': player?.viewerId ?? '' },
      )
      const available = result.items.filter(
        (item): item is CreationSummaryView =>
          'name' in item &&
          !item.deletedAt &&
          (tool !== 'pinta' || GALLERY_DRAWING_KINDS.includes(item.kind)),
      )
      setItems((previous) => [
        ...new Map(
          [...(next ? previous : []), ...available].map((item) => [item.itemId, item]),
        ).values(),
      ])
      setCursor(result.nextCursor)
      if (!next) {
        setSelected([])
        request.current = null
      }
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      busy.current = false
      setLoading(false)
    }
  }
  async function submit() {
    if (
      !player ||
      !permitted ||
      busy.current ||
      selected.length < config.minItems ||
      selected.length > config.maxItems
    )
      return
    busy.current = true
    setSending(true)
    setError('')
    const key = JSON.stringify({ selected, message, revision: block.blockRevision })
    if (request.current?.key !== key) request.current = { key, id: crypto.randomUUID() }
    try {
      await apiSend(
        `/api/members/lessons/${player.lessonId}/blocks/${block.id}/gallery-delivery`,
        'POST',
        {
          requestId: request.current.id,
          revision: block.blockRevision,
          items: selected,
          ...(message.trim() ? { message: message.trim() } : {}),
        },
        { 'x-sz-viewer': player.viewerId ?? '' },
      )
      setConfirmed(true)
      setOpen(false)
      player.refreshAfterStudio?.()
      player.refreshAfterLearning?.()
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      busy.current = false
      setSending(false)
    }
  }
  function toggle(item: CreationSummaryView) {
    setSelected((previous) =>
      previous.some((entry) => entry.itemId === item.itemId)
        ? previous.filter((entry) => entry.itemId !== item.itemId)
        : config.maxItems === 1
          ? [{ itemId: item.itemId, revision: item.revision }]
          : previous.length < config.maxItems
            ? [...previous, { itemId: item.itemId, revision: item.revision }]
            : previous,
    )
  }
  const instruction =
    tool === 'pinta'
      ? 'Escolha os desenhos que você fez para esta missão e envie ao professor.'
      : 'Escolha o projeto desta missão na sua galeria e envie ao professor.'
  return (
    <div className="space-y-4 rounded-2xl border bg-card p-5">
      {player?.renderInstruction?.(instruction) ?? <p>{instruction}</p>}
      {submitted && (
        <p role="status" className="flex items-center gap-2 text-sm">
          <Check aria-hidden className="size-5" /> Trabalho recebido pelo professor.
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          disabled={!permitted}
          onClick={() => {
            setOpen(true)
            void load()
          }}
        >
          <Images aria-hidden className="size-5" />{' '}
          {submitted ? 'Enviar outra versão' : `Escolher no ${label}`}
        </Button>
        <a
          href={tool === 'pinta' ? '/pinta' : '/estudio'}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 underline"
        >
          Abrir meu {label}
          <ExternalLink aria-hidden className="size-4" />
        </a>
      </div>
      <Dialog
        open={open}
        onClose={() => {
          if (!busy.current) setOpen(false)
        }}
        title={`Meus trabalhos do ${label}`}
        description={
          config.maxItems === 1
            ? 'Escolha um projeto para enviar.'
            : `Escolha de ${config.minItems} a ${config.maxItems} desenhos para enviar.`
        }
        className="max-w-3xl"
        footer={
          <Button
            type="button"
            onClick={submit}
            disabled={loading || sending || selected.length < config.minItems}
          >
            <Send aria-hidden className="size-4" />
            {sending
              ? 'Enviando…'
              : `Enviar ao professor${selected.length ? ` (${selected.length})` : ''}`}
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="flex justify-between gap-3">
            <p className="text-sm text-muted-foreground">Trabalhos guardados na sua conta.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading || sending}
              onClick={() => load()}
            >
              Atualizar galeria
            </Button>
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {loading && <p role="status">Abrindo sua galeria…</p>}
          {!loading && !error && items.length === 0 && (
            <p>
              Faça seu trabalho no {label}, guarde na sua conta e volte para atualizar a galeria.
            </p>
          )}
          <div className="grid max-h-[45dvh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
            {items.map((item) => {
              const checked = selected.some((entry) => entry.itemId === item.itemId)
              return (
                <label
                  key={item.itemId}
                  className={`cursor-pointer space-y-2 rounded-xl border-2 p-3 ${checked ? 'border-primary bg-primary/5' : 'border-border'}`}
                >
                  {item.thumb ? (
                    <img
                      src={item.thumb}
                      alt=""
                      className="aspect-video w-full rounded-lg object-contain"
                    />
                  ) : (
                    <Images aria-hidden className="mx-auto my-5 size-10 text-muted-foreground" />
                  )}
                  <span className="flex items-start gap-2 text-sm">
                    <input
                      type={config.maxItems === 1 ? 'radio' : 'checkbox'}
                      name={`gallery-${block.id}`}
                      checked={checked}
                      disabled={
                        sending ||
                        loading ||
                        (!checked && config.maxItems > 1 && selected.length >= config.maxItems)
                      }
                      onChange={() => toggle(item)}
                      className="mt-0.5 size-5 shrink-0 accent-primary"
                    />
                    <span className="break-words">{item.name}</span>
                  </span>
                </label>
              )
            })}
          </div>
          {cursor && (
            <Button
              type="button"
              variant="outline"
              disabled={loading || sending}
              onClick={() => load(cursor)}
            >
              Mostrar mais trabalhos
            </Button>
          )}
          <label className="block space-y-1 text-sm">
            Recado para o professor (opcional)
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              disabled={sending}
              maxLength={2000}
              rows={2}
              className="mt-1 w-full rounded-lg border bg-background p-3"
            />
          </label>
        </div>
      </Dialog>
    </div>
  )
}
