// biome-ignore-all lint/performance/noImgElement: Local blobs and provider thumbnails must bypass image proxy caching.
'use client'

import { Button } from '@sistemazero/ui/button'
import { ImagePlus, Loader2, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { type ApiError, apiGet, apiSend, apiUpload } from '@/lib/api'
import { thumbnailFileError, type VideoThumbnails } from '@/lib/video-thumbnails'

export function VideoThumbnailUploader({ videoId }: { videoId: string }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const request = useRef(0)
  const mounted = useRef(true)
  const [data, setData] = useState<VideoThumbnails | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expectedPicture, setExpectedPicture] = useState<string | null>(null)
  const reload = useCallback(
    async (page = 1) => {
      const version = ++request.current
      setLoading(true)
      setError('')
      try {
        const next = await apiGet<VideoThumbnails>(
          `/api/media/videos/${videoId}/thumbnail?page=${page}`,
        )
        if (version !== request.current || !mounted.current) return
        setData((old) => ({
          ...next,
          pictures:
            page === 1
              ? next.pictures
              : [
                  ...(old?.pictures ?? []),
                  ...next.pictures.filter(
                    (p) => !old?.pictures.some((previous) => previous.id === p.id),
                  ),
                ],
        }))
      } catch (err) {
        if (version === request.current && mounted.current)
          setError((err as ApiError).message ?? 'Não foi possível consultar a capa atual.')
      } finally {
        if (version === request.current && mounted.current) setLoading(false)
      }
    },
    [videoId],
  )
  useEffect(() => {
    mounted.current = true
    void reload()
    return () => {
      mounted.current = false
      request.current++
    }
  }, [reload])
  useEffect(() => {
    if (!file) {
      setPreview('')
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  async function apply(selection?: { pictureId: string } | { automatic: true }) {
    setBusy(true)
    setError('')
    setExpectedPicture(null)
    try {
      let result: { ok: true; pictureId: string }
      if (selection)
        result = await apiSend(`/api/media/videos/${videoId}/thumbnail`, 'PATCH', selection)
      else {
        if (!file) return
        const form = new FormData()
        form.set('file', file)
        result = await apiUpload(`/api/media/videos/${videoId}/thumbnail`, form)
      }
      if (!mounted.current) return
      setExpectedPicture(result.pictureId)
      setFile(null)
      await reload()
    } catch (err) {
      if (mounted.current)
        setError((err as ApiError).message ?? 'Não foi possível aplicar a capa. Tente novamente.')
    } finally {
      if (mounted.current) setBusy(false)
    }
  }
  const applied = expectedPicture && data?.current?.id === expectedPicture
  return (
    <div className="space-y-3">
      <div className={`grid gap-3 ${preview ? 'sm:grid-cols-2' : ''}`}>
        <figure className="space-y-1">
          {data?.current?.url ? (
            <img
              src={data.current.url}
              alt="Capa atual do vídeo no Vimeo"
              className="aspect-video w-full rounded-xl border border-border object-contain bg-muted"
            />
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
              {loading
                ? 'Consultando capa atual…'
                : 'O Vimeo ainda não disponibilizou uma imagem para prévia.'}
            </div>
          )}
          <figcaption className="text-xs text-muted-foreground">Capa atual no Vimeo</figcaption>
        </figure>
        {preview && (
          <figure className="space-y-1">
            <img
              src={preview}
              alt="Prévia da nova capa escolhida"
              className="aspect-video w-full rounded-xl border border-primary/30 object-contain bg-muted"
            />
            <figcaption className="text-xs text-muted-foreground">
              Nova imagem · ainda não aplicada
            </figcaption>
          </figure>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png"
        aria-label="Escolher imagem de capa"
        className="hidden"
        onChange={(e) => {
          const next = e.target.files?.[0]
          e.target.value = ''
          if (!next) return
          const issue = thumbnailFileError(next)
          if (issue) {
            setError(issue)
            return
          }
          setError('')
          setExpectedPicture(null)
          setFile(next)
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>
          <ImagePlus className="size-4" />
          {file ? 'Escolher outra imagem' : 'Escolher capa'}
        </Button>
        {file && (
          <>
            <Button disabled={busy} onClick={() => void apply()}>
              {busy && <Loader2 className="size-4 animate-spin" />}Aplicar capa no Vimeo
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setFile(null)}>
              Descartar escolha
            </Button>
          </>
        )}
        <Button variant="ghost" disabled={busy || loading} onClick={() => void reload()}>
          <RefreshCw className="size-4" />
          Atualizar prévia
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        JPG ou PNG, até 5 MB. Aplicar altera a capa em todas as aulas que usam este mesmo vídeo.
      </p>
      {busy && (
        <p role="status" className="text-sm">
          Aplicando capa no Vimeo…
        </p>
      )}
      {expectedPicture && !busy && (
        <p role="status" className="text-sm">
          {applied
            ? 'Capa aplicada e confirmada pelo Vimeo.'
            : 'Solicitação enviada. Aguarde o processamento e atualize a prévia para conferir a capa aplicada.'}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <details className="rounded-xl border border-border p-3">
        <summary className="cursor-pointer text-sm font-medium">
          Capas disponíveis e capa do próprio vídeo
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {data?.pictures.map((picture, index) => (
            <button
              key={picture.id}
              type="button"
              aria-label={`Usar capa ${index + 1}`}
              aria-pressed={data.current?.id === picture.id}
              disabled={busy || !picture.url}
              onClick={() => void apply({ pictureId: picture.id })}
              className={`rounded-lg border p-1 text-left disabled:opacity-60 ${data.current?.id === picture.id ? 'border-primary' : 'border-border'}`}
            >
              {picture.url && (
                <img
                  src={picture.url}
                  alt={`Capa disponível ${index + 1}`}
                  className="aspect-video w-full rounded object-contain"
                />
              )}
              <span className="block p-1 text-xs">
                {data.current?.id === picture.id
                  ? 'Atual'
                  : picture.type === 'default'
                    ? 'Capa padrão do Vimeo'
                    : `Capa ${index + 1}`}
              </span>
            </button>
          ))}
        </div>
        {data?.hasMore && (
          <Button
            className="mt-3"
            variant="ghost"
            disabled={loading || busy}
            onClick={() => void reload(data.page + 1)}
          >
            Carregar mais capas
          </Button>
        )}
        <Button
          className="mt-3"
          variant="outline"
          disabled={busy}
          onClick={() => void apply({ automatic: true })}
        >
          Usar capa do próprio vídeo
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          Gera uma capa a partir do primeiro quadro, sem apagar as imagens anteriores.
        </p>
      </details>
    </div>
  )
}
