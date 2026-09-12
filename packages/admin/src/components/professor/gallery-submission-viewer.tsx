'use client'

import type { GallerySubmission } from '@sistemazero/core/learning'
import {
  type GallerySnapshotTicket,
  readGallerySnapshot,
} from '@sistemazero/member-shell/lib/gallery-snapshot'
import { assetFromJson, assetToJson, type PintaAsset } from '@sistemazero/pinta/assets'
import type { PintaHandle } from '@sistemazero/pinta/lesson'
import type { Project, StudioHandle } from '@sistemazero/studio'
import { Button } from '@sistemazero/ui/button'
import { useEffect, useRef, useState } from 'react'
import { PintaEmbed } from '@/components/pinta/pinta-embed'
import { StudioEmbed } from '@/components/studio/studio-embed'
import { apiGet } from '@/lib/api'

type Loaded = { tool: 'pinta'; value: PintaAsset } | { tool: 'studio'; value: Project }
export function GallerySubmissionViewer({
  snapshot,
  blockId,
  userId,
  previous = false,
}: {
  snapshot: GallerySubmission
  blockId: string
  userId: string
  previous?: boolean
}) {
  const [selected, setSelected] = useState(snapshot.items[0]?.itemId ?? '')
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const studio = useRef<StudioHandle | null>(null),
    pinta = useRef<PintaHandle | null>(null)
  useEffect(() => {
    void attempt
    const controller = new AbortController()
    setLoaded(null)
    setError('')
    void (async () => {
      try {
        const ticket = await apiGet<GallerySnapshotTicket>(
          `/api/members/blocks/${blockId}/studio-submissions/${userId}/gallery/${encodeURIComponent(selected)}?requestId=${snapshot.requestId}${previous ? '&version=previous' : ''}`,
        )
        if (controller.signal.aborted) return
        const raw = await readGallerySnapshot(ticket, controller.signal)
        if (snapshot.tool === 'pinta') {
          const value = assetFromJson(JSON.stringify(raw)).asset
          if (!value) throw new Error('Este desenho não pôde ser aberto.')
          if (!controller.signal.aborted) setLoaded({ tool: 'pinta', value })
        } else {
          const { sanitizeProjectForHost } = await import('@sistemazero/studio')
          const value = sanitizeProjectForHost(raw)
          if (!value) throw new Error('Este projeto não pôde ser aberto.')
          if (!controller.signal.aborted) setLoaded({ tool: 'studio', value })
        }
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(
            typeof cause === 'object' &&
              cause !== null &&
              'message' in cause &&
              typeof cause.message === 'string'
              ? cause.message
              : 'Não foi possível abrir esta cópia.',
          )
      }
    })()
    return () => controller.abort()
  }, [selected, snapshot.requestId, snapshot.tool, blockId, userId, previous, attempt])
  function download() {
    if (!loaded) return
    const json =
      loaded.tool === 'pinta' ? assetToJson(loaded.value) : JSON.stringify(loaded.value, null, 2)
    const blob = new Blob([json], { type: 'application/json' }),
      url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${loaded.value.name.replace(/[^\p{L}\p{N}._-]+/gu, '-').slice(0, 60) || 'trabalho'}.${loaded.tool === 'pinta' ? 'pinta' : 'szproject'}.json`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }
  return (
    <div className="space-y-3 rounded-xl border p-3">
      <p className="text-sm text-muted-foreground">
        {previous ? 'Versão anterior. ' : ''}Cópias recebidas na entrega. A galeria pessoal do aluno
        permanece independente.
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
        <Button type="button" variant="outline" disabled={!loaded} onClick={download}>
          Baixar trabalho aberto
        </Button>
      </div>
      {error ? (
        <div role="alert" className="space-y-2">
          <p>{error}</p>
          <Button type="button" onClick={() => setAttempt((value) => value + 1)}>
            Tentar novamente
          </Button>
        </div>
      ) : !loaded ? (
        <p role="status">Abrindo a cópia recebida…</p>
      ) : loaded.tool === 'pinta' ? (
        <PintaEmbed
          key={`${selected}:${snapshot.requestId}`}
          initialAsset={loaded.value}
          handleRef={pinta}
          className="h-[32rem]"
        />
      ) : (
        <StudioEmbed
          key={`${selected}:${snapshot.requestId}`}
          initialProject={loaded.value}
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
      )}
    </div>
  )
}
