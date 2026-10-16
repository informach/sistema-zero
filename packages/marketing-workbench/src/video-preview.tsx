'use client'
import { Player } from '@remotion/player'
import {
  DEMONSTRATION_RECIPES,
  type MediaPreparation,
  type VideoProject,
  videoAssetIds,
} from '@sistemazero/marketing-contracts'
import { TimelineComposition } from '@sistemazero/marketing-production'
import { Button } from '@sistemazero/ui/button'
import { useEffect, useState } from 'react'
import { errorMessage, type WorkbenchPort } from './port'

export default function VideoPreview({
  port,
  projectId,
  timeline,
  preparations = [],
}: {
  port: WorkbenchPort
  projectId: string
  timeline: VideoProject
  preparations?: MediaPreparation[]
}) {
  const ids = videoAssetIds(timeline).sort().join(',')
  const proxies = JSON.stringify(
    Object.fromEntries(
      preparations
        .filter((item) => item.proxyAssetId)
        .map((item) => [item.sourceAssetId, item.proxyAssetId]),
    ),
  )
  const [loaded, setLoaded] = useState<{ scope: string; urls: Record<string, string> } | null>(null)
  const [error, setError] = useState(''),
    [retry, setRetry] = useState(0)
  const scope = `${projectId}:${ids}:${proxies}:${retry}`
  useEffect(() => {
    let live = true
    setError('')
    const proxyById: Record<string, string> = JSON.parse(proxies)
    void Promise.all(
      (ids ? ids.split(',') : []).map(
        async (id) => [id, await port.assetUrl(projectId, proxyById[id] ?? id)] as const,
      ),
    )
      .then((pairs) => {
        if (live) setLoaded({ scope, urls: Object.fromEntries(pairs) })
      })
      .catch((error) => {
        if (live) setError(errorMessage(error))
      })
    return () => {
      live = false
    }
  }, [port, projectId, ids, proxies, scope])
  if (error)
    return (
      <div role="alert" className="rounded-lg border p-4 text-sm">
        <p>{error}</p>
        <Button size="sm" className="mt-3" onClick={() => setRetry((value) => value + 1)}>
          Carregar vídeo novamente
        </Button>
      </div>
    )
  if (loaded?.scope !== scope) return <p role="status">Carregando as mídias da montagem…</p>
  return (
    <figure className="mx-auto max-w-lg">
      <Player
        key={`${scope}:${JSON.stringify(timeline)}`}
        component={TimelineComposition}
        inputProps={{ timeline, assets: loaded.urls }}
        durationInFrames={timeline.durationInFrames}
        fps={timeline.fps.numerator / timeline.fps.denominator}
        compositionWidth={timeline.width}
        compositionHeight={timeline.height}
        controls
        style={{ width: '100%', aspectRatio: `${timeline.width}/${timeline.height}` }}
        errorFallback={({ error }) => (
          <p role="alert" className="p-4 text-sm text-destructive">
            {error.message}
          </p>
        )}
      />
      <figcaption className="mt-2 text-xs text-muted-foreground">
        Prévia da montagem · {timeline.width} × {timeline.height} ·{' '}
        {((timeline.durationInFrames * timeline.fps.denominator) / timeline.fps.numerator).toFixed(
          1,
        )}{' '}
        s. Peça os ajustes à IA abaixo.
      </figcaption>
      {timeline.clips.some((clip) => clip.demonstration) ? (
        <details className="mt-3 rounded-lg border p-3 text-sm">
          <summary className="cursor-pointer font-medium">Conferir demonstrações e fontes</summary>
          <p className="mt-2">
            As cenas comparam imagens estáticas. Confira o foco, a leitura e a correspondência com
            os fatos antes de aprovar o vídeo final.
          </p>
          <ul className="mt-2 space-y-2">
            {timeline.clips.flatMap((clip) =>
              clip.demonstration
                ? [
                    <li key={clip.id}>
                      <strong>{clip.demonstration.headline}</strong> ·{' '}
                      {DEMONSTRATION_RECIPES[clip.demonstration.recipeId].label}
                      <p className="text-xs text-muted-foreground">
                        Fontes:{' '}
                        {clip.demonstration.sources.map((source) => source.label).join(' / ')}.
                        Imagens e revisões de evidência ficam vinculadas a esta montagem.
                      </p>
                    </li>,
                  ]
                : [],
            )}
          </ul>
        </details>
      ) : null}
    </figure>
  )
}
