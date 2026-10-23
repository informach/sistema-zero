'use client'
import { uploadViewSchema } from '@sistemazero/marketing-contracts'
import { Button } from '@sistemazero/ui/button'
import { useEffect, useState } from 'react'
import { errorMessage, type WorkbenchPort } from './port'
export function AssetPreview({
  port,
  projectId,
  assetId,
  alt,
  mediaType = 'image',
  captionsVtt,
}: {
  port: WorkbenchPort
  projectId: string
  assetId: string
  alt: string
  mediaType?: 'image' | 'video' | 'audio' | 'auto'
  captionsVtt?: string
}) {
  const [result, setResult] = useState<{
      id: string
      projectId: string
      identity: string
      attempt: number
      url: string
      type: 'image' | 'video' | 'audio'
    } | null>(null),
    [error, setError] = useState('')
  const [track, setTrack] = useState<string>()
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (mediaType === 'image' || !captionsVtt?.includes(' --> ')) {
      setTrack(undefined)
      return
    }
    const url = URL.createObjectURL(new Blob([captionsVtt], { type: 'text/vtt' }))
    setTrack(url)
    return () => URL.revokeObjectURL(url)
  }, [captionsVtt, mediaType])
  useEffect(() => {
    let active = true
    setError('')
    setResult(null)
    void (async () => {
      let type = mediaType
      if (type === 'auto') {
        const file = uploadViewSchema.parse(
          await port.request(`/projects/${projectId}/assets/${assetId}`),
        )
        if (
          file.manifest.id !== assetId ||
          file.manifest.projectId !== projectId ||
          file.state !== 'confirmed'
        )
          throw new Error('Mídia ainda não confirmada neste projeto')
        const mime = file.manifest.mime
        if (mime.startsWith('image/')) type = 'image'
        else if (mime.startsWith('video/')) type = 'video'
        else if (mime.startsWith('audio/')) type = 'audio'
        else
          throw new Error(
            'Este arquivo não tem prévia de mídia. Consulte-o na biblioteca de arquivos.',
          )
      }
      const url = await port.assetUrl(projectId, assetId)
      if (active) setResult({ id: assetId, projectId, identity: port.identity, url, type, attempt })
    })().catch((error) => {
      if (active) setError(errorMessage(error))
    })
    return () => {
      active = false
    }
  }, [port, projectId, assetId, mediaType, attempt])
  if (error)
    return (
      <div className="space-y-2">
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
        <Button size="sm" variant="outline" onClick={() => setAttempt((value) => value + 1)}>
          Tentar carregar a mídia novamente
        </Button>
      </div>
    )
  return result?.id === assetId &&
    result.attempt === attempt &&
    result.projectId === projectId &&
    result.identity === port.identity ? (
    result.type === 'video' ? (
      // biome-ignore lint/a11y/useMediaCaption: The actual captions track is conditional; uploaded originals may not have a transcript yet. An empty track would falsely claim captions exist.
      <video
        src={result.url}
        onError={() =>
          setError('Não foi possível carregar o vídeo. Confira a conexão e tente novamente.')
        }
        controls
        preload="metadata"
        aria-label={alt}
        className="mx-auto max-h-[600px] max-w-full rounded"
      >
        {track ? <track kind="captions" src={track} srcLang="pt-BR" label="Português" /> : null}
      </video>
    ) : result.type === 'audio' ? (
      // biome-ignore lint/a11y/useMediaCaption: The actual captions track is conditional; originals can be transcribed through the video request flow.
      <audio
        src={result.url}
        controls
        preload="metadata"
        aria-label={alt}
        onError={() =>
          setError('Não foi possível carregar o áudio. Confira a conexão e tente novamente.')
        }
      >
        {track ? <track kind="captions" src={track} srcLang="pt-BR" label="Português" /> : null}
      </audio>
    ) : (
      <img
        src={result.url}
        onError={() =>
          setError('Não foi possível carregar a imagem. Confira a conexão e tente novamente.')
        }
        alt={alt}
        className="mx-auto max-h-[600px] max-w-full rounded object-contain"
      />
    )
  ) : (
    <p role="status">Carregando mídia…</p>
  )
}
