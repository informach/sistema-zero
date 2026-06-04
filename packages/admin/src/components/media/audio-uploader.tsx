'use client'

import { Loader2, Music } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { type ApiError, apiUpload } from '@/lib/api'

const MAX_AUDIO_BYTES = 50 * 1024 * 1024
const ACCEPTED = 'audio/mpeg,audio/mp4,audio/x-m4a,audio/ogg,audio/wav,.mp3,.m4a,.ogg,.wav'

export interface UploadedAudio {
  url: string
  /** Detectada do próprio arquivo (loadedmetadata) — `null` se o browser não souber. */
  durationSeconds: number | null
}

/**
 * Lê a duração do arquivo localmente (sem upload): object URL + `loadedmetadata`.
 * Alguns containers raros reportam `Infinity`/NaN → devolve `null` (campo fica vazio).
 */
function readAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file)
    const audio = new Audio()
    audio.preload = 'metadata'
    const done = (value: number | null) => {
      URL.revokeObjectURL(objectUrl)
      resolve(value)
    }
    audio.onloadedmetadata = () =>
      done(Number.isFinite(audio.duration) ? Math.round(audio.duration) : null)
    audio.onerror = () => done(null)
    audio.src = objectUrl
  })
}

/**
 * Uploader de áudio do bloco de aula: envia ao bucket R2 PÚBLICO (o aluno toca a
 * URL direto) e detecta a duração AUTOMATICAMENTE do arquivo — sem URL nem
 * duração digitadas à mão (decisão da autoria v3).
 */
export function AudioUploader({
  value,
  onUploaded,
}: {
  /** URL atual do bloco (mostra o player de pré-escuta quando presente). */
  value?: string
  onUploaded: (audio: UploadedAudio) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function upload(file: File) {
    if (file.size > MAX_AUDIO_BYTES) {
      toast.error('Áudio excede o limite de 50 MB.')
      return
    }
    setUploading(true)
    try {
      // Duração em paralelo ao upload (ambas leem o mesmo File local).
      const form = new FormData()
      form.set('file', file)
      const [stored, durationSeconds] = await Promise.all([
        apiUpload<{ url: string }>('/api/media/audio', form),
        readAudioDuration(file),
      ])
      onUploaded({ url: stored.url, durationSeconds })
      toast.success('Áudio enviado.')
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Falha no upload do áudio.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED}
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
            <Loader2 className="size-4 animate-spin" /> Enviando áudio…
          </>
        ) : (
          <>
            <Music className="size-4" />
            {value
              ? 'Substituir o áudio (MP3/M4A/OGG/WAV, até 50 MB)'
              : 'Clique para enviar o áudio (MP3/M4A/OGG/WAV, até 50 MB)'}
          </>
        )}
      </button>
      {value ? (
        // biome-ignore lint/a11y/useMediaCaption: pré-escuta do áudio da aula no editor
        <audio controls preload="metadata" src={value} className="w-full" />
      ) : null}
    </div>
  )
}
