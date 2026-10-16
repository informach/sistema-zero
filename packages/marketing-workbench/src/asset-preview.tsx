'use client'
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
  mediaType?: 'image' | 'video' | 'audio'
  captionsVtt?: string
}) {
  const [result, setResult] = useState<{ id: string; url: string } | null>(null),
    [error, setError] = useState('')
  const [track, setTrack] = useState<string>()
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
    void port
      .assetUrl(projectId, assetId)
      .then((url) => {
        if (active) setResult({ id: assetId, url })
      })
      .catch((error) => {
        if (active) setError(errorMessage(error))
      })
    return () => {
      active = false
    }
  }, [port, projectId, assetId])
  if (error)
    return (
      <p role="alert" className="text-sm text-destructive">
        {error}
      </p>
    )
  return result?.id === assetId ? (
    mediaType === 'video' ? (
      // biome-ignore lint/a11y/useMediaCaption: The actual captions track is conditional; uploaded originals may not have a transcript yet. An empty track would falsely claim captions exist.
      <video
        src={result.url}
        controls
        preload="metadata"
        aria-label={alt}
        className="mx-auto max-h-[600px] max-w-full rounded"
      >
        {track ? <track kind="captions" src={track} srcLang="pt-BR" label="Português" /> : null}
      </video>
    ) : mediaType === 'audio' ? (
      // biome-ignore lint/a11y/useMediaCaption: The actual captions track is conditional; originals can be transcribed through the video request flow.
      <audio src={result.url} controls preload="metadata" aria-label={alt}>
        {track ? <track kind="captions" src={track} srcLang="pt-BR" label="Português" /> : null}
      </audio>
    ) : (
      <img
        src={result.url}
        alt={alt}
        className="mx-auto max-h-[600px] max-w-full rounded object-contain"
      />
    )
  ) : (
    <p role="status">Carregando mídia…</p>
  )
}
