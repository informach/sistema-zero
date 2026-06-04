'use client'

import { CheckCircle2, ImagePlus, Loader2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { type ApiError, apiUpload } from '@/lib/api'

/**
 * Capa custom do vídeo Vimeo: envia JPG/PNG via BFF (Vimeo pictures) e devolve
 * `posterUrl` estável no R2 p/ o campo poster do bloco.
 */
export function VideoThumbnailUploader({
  videoId,
  onPoster,
}: {
  videoId: string
  onPoster: (posterUrl: string) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)

  async function upload(file: File) {
    setUploading(true)
    try {
      const form = new FormData()
      form.set('file', file)
      const { posterUrl } = await apiUpload<{ posterUrl: string }>(
        `/api/media/videos/${videoId}/thumbnail`,
        form,
      )
      onPoster(posterUrl)
      setDone(true)
      toast.success('Capa enviada — o Vimeo pode levar alguns minutos para aplicá-la.')
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Falha ao enviar a capa.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) void upload(file)
        }}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => fileRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-ring hover:text-foreground disabled:pointer-events-none disabled:opacity-60"
      >
        {uploading ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Enviando capa para o Vimeo…
          </>
        ) : done ? (
          <>
            <CheckCircle2 className="size-4" /> Capa enviada — enviar outra
          </>
        ) : (
          <>
            <ImagePlus className="size-4" /> Enviar capa do vídeo (JPG/PNG, até 5 MB)
          </>
        )}
      </button>
    </>
  )
}
