'use client'

import { Button } from '@sistemazero/ui/button'
import { Progress } from '@sistemazero/ui/progress'
import { CheckCircle2, Clapperboard, Loader2, RefreshCw } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useLessonVideoController, type VideoUploadController } from './lesson-video-uploads'
import { type ReadyVideo, useVideoUpload } from './use-video-upload'
import { VimeoPreview } from './vimeo-preview'

const ACCEPTED = 'video/mp4,video/quicktime,video/webm'

/**
 * Uploader de vídeo (Vimeo/TUS) p/ o bloco de vídeo: ticket → upload resumável
 * direto do browser → transcode (polling) → `onReady` preenche src/duração/
 * legendas no form. `currentSrc` permite re-checar um vídeo já salvo.
 */
interface VideoUploaderProps {
  onReady: (video: ReadyVideo) => void
  currentSrc?: string
  autoCheckStatus?: boolean
  blockId?: string
}

export function VideoUploader(props: VideoUploaderProps) {
  const shared = useLessonVideoController(props.blockId ?? '')
  return shared && props.blockId ? (
    <VideoUploadView {...props} controller={shared} />
  ) : (
    <OwnedVideoUploader {...props} />
  )
}

function OwnedVideoUploader(props: VideoUploaderProps) {
  const controller = useVideoUpload(props.onReady)
  return <VideoUploadView {...props} controller={controller} />
}

function VideoUploadView({
  currentSrc,
  autoCheckStatus = false,
  controller,
}: VideoUploaderProps & { controller: VideoUploadController }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const { phase, progress, error, embedUrl, upload, checkStatus } = controller

  const currentVideoId = currentSrc?.match(/vimeo\.com\/(?:video\/)?(\d{6,12})/)?.[1] ?? null
  const checkedVideoId = useRef<string | null>(null)
  useEffect(() => {
    if (!currentVideoId) {
      checkedVideoId.current = null
      return
    }
    if (!autoCheckStatus || checkedVideoId.current === currentVideoId || phase !== 'idle') return
    checkedVideoId.current = currentVideoId
    checkStatus(currentVideoId)
  }, [autoCheckStatus, currentVideoId, checkStatus, phase])
  const transferring = phase === 'requesting-ticket' || phase === 'uploading'

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

      {phase === 'idle' || phase === 'error' || phase === 'ready' ? (
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
          <Loader2 className="size-4 animate-spin" /> Vimeo processando o vídeo… O rascunho mantém o
          vídeo; a publicação aguarda o processamento.
        </p>
      ) : null}

      {phase === 'ready' ? (
        <p className="flex items-center gap-2 text-sm text-success-foreground">
          <CheckCircle2 className="size-4" /> Vídeo pronto — campos preenchidos (com transcrição, se
          disponível).
        </p>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {currentVideoId && !transferring ? (
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
