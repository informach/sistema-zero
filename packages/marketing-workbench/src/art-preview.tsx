'use client'
import { Player } from '@remotion/player'
import { type ArtComposition, artAssetIds } from '@sistemazero/marketing-contracts'
import { ArtCompositionView } from '@sistemazero/marketing-production'
import { Button } from '@sistemazero/ui/button'
import { useEffect, useState } from 'react'
import { errorMessage, type WorkbenchPort } from './port'
export default function ArtPreview({
  port,
  projectId,
  composition,
  body,
  title,
}: {
  port: WorkbenchPort
  projectId: string
  composition: ArtComposition
  body: string
  title: string
}) {
  const key = artAssetIds(composition).sort().join(','),
    [loaded, setLoaded] = useState<{ key: string; urls: Record<string, string> } | null>(null),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0)
  const scope = `${projectId}:${key}:${retry}`
  useEffect(() => {
    let live = true
    setError('')
    const ids = key ? key.split(',') : []
    void Promise.all(ids.map(async (id) => [id, await port.assetUrl(projectId, id)] as const))
      .then((pairs) => {
        if (live) setLoaded({ key: scope, urls: Object.fromEntries(pairs) })
      })
      .catch((error) => {
        if (live) setError(errorMessage(error))
      })
    return () => {
      live = false
    }
  }, [port, projectId, key, scope])
  if (error)
    return (
      <div role="alert" className="rounded-lg border p-4 text-sm">
        <p>{error}</p>
        <Button size="sm" className="mt-3" onClick={() => setRetry((value) => value + 1)}>
          Carregar prévia novamente
        </Button>
      </div>
    )
  if (loaded?.key !== scope)
    return (
      <p role="status" className="text-sm">
        Carregando arquivos da composição…
      </p>
    )
  return (
    <figure className="mx-auto max-w-lg">
      <Player
        key={`${scope}:${JSON.stringify({ composition, body, title })}`}
        component={ArtCompositionView}
        inputProps={{ composition, body, title, assets: loaded.urls }}
        durationInFrames={1}
        fps={30}
        compositionWidth={composition.width}
        compositionHeight={composition.height}
        controls={false}
        style={{ width: '100%', aspectRatio: `${composition.width}/${composition.height}` }}
        errorFallback={({ error }) => (
          <p role="alert" className="p-4 text-sm text-destructive">
            {error.message}
          </p>
        )}
      />
      <figcaption className="mt-2 text-xs text-muted-foreground">
        Prévia da composição atual · {composition.width} × {composition.height}
      </figcaption>
    </figure>
  )
}
