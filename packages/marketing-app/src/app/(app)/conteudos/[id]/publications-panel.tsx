'use client'

import { Button, buttonVariants } from '@sistemazero/ui/button'
import { Card, CardContent } from '@sistemazero/ui/card'
import { Dialog } from '@sistemazero/ui/dialog'
import { InfoTooltip } from '@sistemazero/ui/info-tooltip'
import { Field } from '@sistemazero/ui/label'
import { Textarea } from '@sistemazero/ui/textarea'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { NetworkChip } from '@/components/shared/network-chip'
import { PubStatusBadge } from '@/components/shared/pub-status-badge'
import { type ApiError, apiSend } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatShortSp } from '@/lib/dates'
import {
  FORMAT_LABELS,
  FORMAT_NETWORK,
  NETWORK_LABELS,
  PUBLICATION_FORMATS,
  type PublicationFormat,
  SOCIAL_NETWORKS,
} from '@/lib/networks'
import type { ContentStage } from '@/lib/pipeline'
import { canCreatePublications, isActivePublication } from '@/lib/publications'
import type { PublicationView } from '@/lib/types'

/**
 * Publicações do conteúdo: linhas com rede/status/horário + criação em lote
 * (checkboxes dos 9 formatos agrupados por rede, caption base opcional).
 * Criar exige conteúdo aprovado (gate `canCreatePublications`, espelho do
 * backend).
 */
export function PublicationsPanel({
  contentId,
  stage,
  publications,
  onCreated,
}: {
  contentId: string
  stage: ContentStage
  publications: PublicationView[]
  onCreated: (views: PublicationView[]) => void
}) {
  const [createOpen, setCreateOpen] = useState(false)
  const [selected, setSelected] = useState<ReadonlySet<PublicationFormat>>(new Set())
  const [caption, setCaption] = useState('')
  const [creating, setCreating] = useState(false)

  const allowed = canCreatePublications(stage)
  const activeFormats = new Set(
    publications.filter((pub) => isActivePublication(pub.status)).map((pub) => pub.format),
  )

  function toggleFormat(format: PublicationFormat) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(format)) next.delete(format)
      else next.add(format)
      return next
    })
  }

  async function create() {
    if (selected.size === 0 || creating) return
    setCreating(true)
    try {
      const trimmed = caption.trim()
      const views = await apiSend<PublicationView[]>(
        `/api/marketing/contents/${contentId}/publications`,
        'POST',
        { formats: [...selected], ...(trimmed ? { caption: trimmed } : {}) },
      )
      onCreated(views)
      toast.success(
        views.length === 1 ? 'Publicação criada.' : `${views.length} publicações criadas.`,
      )
      setSelected(new Set())
      setCaption('')
      setCreateOpen(false)
    } catch (error) {
      toast.error((error as ApiError).message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {publications.length === 0
              ? 'Nenhuma publicação ainda.'
              : `${publications.length} ${publications.length === 1 ? 'publicação' : 'publicações'}`}
          </p>
          <span className="flex items-center gap-1.5">
            <Button onClick={() => setCreateOpen(true)} disabled={!allowed}>
              Criar publicações
            </Button>
            {!allowed ? <InfoTooltip text="Aprove o conteúdo para criar publicações" /> : null}
          </span>
        </div>

        {publications.length > 0 ? (
          <ul className="space-y-2">
            {publications.map((pub) => (
              <li
                key={pub.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5"
              >
                <NetworkChip format={pub.format} />
                <PubStatusBadge status={pub.status} />
                {pub.scheduledAt ? (
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {formatShortSp(pub.scheduledAt)}
                  </span>
                ) : null}
                <Link
                  href={`/conteudos/${contentId}/publicacoes/${pub.id}`}
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'ml-auto')}
                >
                  Abrir
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Criar publicações"
        description="Escolha os formatos. Cada um vira uma publicação própria, com legenda e horário editáveis depois."
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancelar
            </Button>
            <Button onClick={create} disabled={selected.size === 0 || creating}>
              {creating ? 'Criando…' : 'Criar'}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {SOCIAL_NETWORKS.map((network) => (
              <fieldset key={network} className="space-y-2">
                <legend className="text-sm font-medium">{NETWORK_LABELS[network]}</legend>
                <div className="space-y-1.5">
                  {PUBLICATION_FORMATS.filter((format) => FORMAT_NETWORK[format] === network).map(
                    (format) => {
                      const taken = activeFormats.has(format)
                      return (
                        <label
                          key={format}
                          className={cn(
                            'flex items-center gap-2 text-sm',
                            taken ? 'cursor-not-allowed text-muted-foreground' : 'cursor-pointer',
                          )}
                        >
                          <input
                            type="checkbox"
                            className="size-4 accent-primary"
                            checked={selected.has(format)}
                            disabled={taken}
                            onChange={() => toggleFormat(format)}
                          />
                          {FORMAT_LABELS[format]}
                          {taken ? (
                            <span className="text-xs text-muted-foreground">(já criada)</span>
                          ) : null}
                        </label>
                      )
                    },
                  )}
                </div>
              </fieldset>
            ))}
          </div>
          <Field
            label="Legenda base (opcional)"
            htmlFor="pub-base-caption"
            hint="Vale para todas as publicações criadas agora. Depois cada uma ajusta a sua."
          >
            <Textarea
              id="pub-base-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
            />
          </Field>
        </div>
      </Dialog>
    </Card>
  )
}
