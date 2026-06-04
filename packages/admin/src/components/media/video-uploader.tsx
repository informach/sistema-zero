'use client'

import { CheckCircle2, Clapperboard, Loader2, RefreshCw } from 'lucide-react'
import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { type ReadyVideo, useVideoUpload } from './use-video-upload'
import { VimeoPreview } from './vimeo-preview'

const ACCEPTED = 'video/mp4,video/quicktime,video/webm'

/**
 * Uploader de vídeo (Vimeo/TUS) p/ o bloco de vídeo: ticket → upload resumável
 * direto do browser → transcode (polling) → `onReady` preenche src/duração/
 * legendas no form. `currentSrc` permite re-checar um vídeo já salvo.
 */
export function VideoUploader({
  onReady,
  currentSrc,
}: {
  onReady: (video: ReadyVideo) => void
  /** `src` atual do bloco (embed URL) — habilita "verificar status/transcrição". */
  currentSrc?: string
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const { phase, progress, error, embedUrl, upload, checkStatus } = useVideoUpload(onReady)

  const currentVideoId = currentSrc?.match(/vimeo\.com\/(?:video\/)?(\d{6,12})/)?.[1] ?? null
  const busy = phase === 'requesting-ticket' || phase === 'uploading' || phase === 'processing'

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

      {phase === 'idle' || phase === 'error' ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex min-h-24 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-5 text-sm text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
        >
          <Clapperboard className="size-5" />
          {currentVideoId
            ? 'Substituir o vídeo (MP4/MOV/WebM, até 5 GB)'
            : 'Clique para enviar o vídeo da aula (MP4/MOV/WebM, até 5 GB)'}
        </button>
      ) : null}

      {phase === 'requesting-ticket' ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Preparando o upload no Vimeo…
        </p>
      ) : null}

      {phase === 'uploading' ? (
        <div className="flex flex-col gap-1.5">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Enviando vídeo… {Math.round(progress * 100)}
            %
          </p>
          <Progress value={progress} />
        </div>
      ) : null}

      {phase === 'processing' ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Vimeo processando o vídeo… (pode salvar o
          bloco; a transcrição entra quando terminar)
        </p>
      ) : null}

      {phase === 'ready' ? (
        <p className="flex items-center gap-2 text-sm text-success-foreground">
          <CheckCircle2 className="size-4" /> Vídeo pronto — campos preenchidos (com transcrição, se
          disponível).
        </p>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {currentVideoId && !busy ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => checkStatus(currentVideoId)}
        >
          <RefreshCw className="size-4" /> Verificar status/transcrição
        </Button>
      ) : null}

      {(embedUrl ?? currentSrc) && (phase === 'ready' || phase === 'idle') ? (
        <VimeoPreview embedUrl={(embedUrl ?? currentSrc) as string} />
      ) : null}
    </div>
  )
}
