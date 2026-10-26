'use client'

import type { GallerySubmission } from '@sistemazero/core/learning'
import {
  type GallerySnapshotTicket,
  readGallerySnapshot,
} from '@sistemazero/member-shell/lib/gallery-snapshot'
import { assetFromJson, assetToJson, type PintaAsset } from '@sistemazero/pinta/assets'
import type { PintaHandle } from '@sistemazero/pinta/lesson'
import type { EditableStudioProject, StudioHandle } from '@sistemazero/studio'
import { prepareEditableStudioProject } from '@sistemazero/studio/editable-project-validation'
import { Button } from '@sistemazero/ui/button'
import { useEffect, useRef, useState } from 'react'
import { PintaEmbed } from '@/components/pinta/pinta-embed'
import { StudioEmbed } from '@/components/studio/studio-embed'
import { StudioReviewSource } from '@/components/studio/studio-review-source'
import type { StudioMasteryReviewScope } from '@/components/studio/use-studio-mastery-review-runtime'
import { apiGet } from '@/lib/api'

type Loaded =
  | { key: string; tool: 'pinta'; value: PintaAsset }
  | { key: string; tool: 'studio'; value: EditableStudioProject }
type GallerySubmissionViewerProps = {
  snapshot: GallerySubmission
  previous?: boolean
} & (
  | { blockId: string; userId: string; masteryReviewScope?: never }
  | { masteryReviewScope: StudioMasteryReviewScope; blockId?: never; userId?: never }
)

export function GallerySubmissionViewer(props: GallerySubmissionViewerProps) {
  const owner = props.masteryReviewScope
    ? `mastery:${props.masteryReviewScope.submissionId}:${props.masteryReviewScope.userId}`
    : `lesson:${props.blockId}:${props.userId}:${Boolean(props.previous)}`
  return (
    <GallerySubmissionContent
      key={`${owner}:${props.snapshot.requestId}:${props.snapshot.copyGeneration ?? 'historical'}`}
      {...props}
    />
  )
}

function GallerySubmissionContent({
  snapshot,
  blockId,
  userId,
  previous = false,
  masteryReviewScope,
}: GallerySubmissionViewerProps) {
  const [selected, setSelected] = useState(snapshot.items[0]?.itemId ?? '')
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [error, setError] = useState<{ key: string; message: string } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const studio = useRef<StudioHandle | null>(null),
    pinta = useRef<PintaHandle | null>(null)
  const ticketPath = masteryReviewScope
    ? `/api/members/journey/masteries/submissions/${encodeURIComponent(masteryReviewScope.submissionId)}/gallery/${encodeURIComponent(selected)}`
    : `/api/members/blocks/${blockId}/studio-submissions/${userId}/gallery/${encodeURIComponent(selected)}?requestId=${encodeURIComponent(snapshot.requestId)}${previous ? '&version=previous' : ''}`
  const current = loaded?.key === ticketPath ? loaded : null
  const currentError = error?.key === ticketPath ? error.message : null
  useEffect(() => {
    void attempt
    const controller = new AbortController()
    setLoaded(null)
    setError(null)
    void (async () => {
      try {
        const ticket = await apiGet<GallerySnapshotTicket>(ticketPath, {
          signal: controller.signal,
        })
        if (controller.signal.aborted) return
        const raw = await readGallerySnapshot(ticket, controller.signal)
        if (snapshot.tool === 'pinta') {
          const value = assetFromJson(JSON.stringify(raw)).asset
          if (!value) throw new Error('Este desenho não pôde ser aberto.')
          if (!controller.signal.aborted) setLoaded({ key: ticketPath, tool: 'pinta', value })
        } else {
          const value = await prepareEditableStudioProject(raw)
          if (!value) throw new Error('Este projeto não pôde ser aberto.')
          if (!controller.signal.aborted) setLoaded({ key: ticketPath, tool: 'studio', value })
        }
      } catch (cause) {
        if (!controller.signal.aborted)
          setError({
            key: ticketPath,
            message:
              typeof cause === 'object' &&
              cause !== null &&
              'message' in cause &&
              typeof cause.message === 'string'
                ? cause.message
                : 'Não foi possível abrir esta cópia.',
          })
      }
    })()
    return () => controller.abort()
  }, [ticketPath, snapshot.tool, attempt])
  function download() {
    if (!current) return
    const json =
      current.tool === 'pinta' ? assetToJson(current.value) : JSON.stringify(current.value, null, 2)
    const blob = new Blob([json], { type: 'application/json' }),
      url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${current.value.name.replace(/[^\p{L}\p{N}._-]+/gu, '-').slice(0, 60) || 'trabalho'}.${current.tool === 'pinta' ? 'pinta' : 'szproject'}.json`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }
  return (
    <div className="space-y-3 rounded-xl border p-3">
      <p className="text-sm text-muted-foreground">
        {previous ? 'Versão anterior. ' : ''}Cópias que chegaram neste envio. A galeria pessoal de
        quem enviou continua separada.
      </p>
      <div className="flex flex-wrap gap-2">
        {snapshot.items.map((item) => (
          <Button
            key={item.itemId}
            type="button"
            variant={selected === item.itemId ? 'default' : 'outline'}
            aria-pressed={selected === item.itemId}
            onClick={() => setSelected(item.itemId)}
          >
            {item.name}
          </Button>
        ))}
        <Button type="button" variant="outline" disabled={!current} onClick={download}>
          Baixar trabalho aberto
        </Button>
      </div>
      {currentError ? (
        <div role="alert" className="space-y-2">
          <p>{currentError}</p>
          <Button type="button" onClick={() => setAttempt((value) => value + 1)}>
            Tentar novamente
          </Button>
        </div>
      ) : !current ? (
        <p role="status">Abrindo a cópia recebida…</p>
      ) : current.tool === 'pinta' ? (
        <PintaEmbed
          key={`${selected}:${snapshot.requestId}`}
          initialAsset={current.value}
          handleRef={pinta}
          className="h-[32rem]"
        />
      ) : (
        <>
          <StudioEmbed
            key={`${selected}:${snapshot.requestId}`}
            initialProject={current.value}
            masteryReviewScope={masteryReviewScope}
            handleRef={studio}
            className="h-[32rem]"
            features={{
              terminal: false,
              ai: false,
              professional: false,
              export: false,
              extensions: false,
            }}
          />
          {masteryReviewScope ? <StudioReviewSource project={current.value} /> : null}
        </>
      )}
    </div>
  )
}
