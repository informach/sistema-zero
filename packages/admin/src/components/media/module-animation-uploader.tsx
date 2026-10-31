'use client'

import type { ModuleAnimation } from '@sistemazero/core/course/module-animation'
import { EdiAnimation } from '@sistemazero/edisvg/react'
import { Button } from '@sistemazero/ui/button'
import { Loader2, Sparkles, TriangleAlert, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { apiUpload } from '@/lib/api'

/** One exported file supplies artwork, controls and the matching static fallback. */
export function ModuleAnimationUploader({
  value,
  inputId,
  onChange,
  onUploadingChange,
}: {
  value: ModuleAnimation | null
  inputId?: string
  onChange: (value: ModuleAnimation | null) => void
  onUploadingChange: (uploading: boolean) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const live = useRef(true)
  const uploadTask = useRef<AbortController | null>(null)
  const [uploading, setUploading] = useState(false)
  useEffect(() => {
    live.current = true
    return () => {
      live.current = false
      uploadTask.current?.abort()
    }
  }, [])

  async function upload(file: File) {
    if (uploading) return
    if (!file.name.toLowerCase().endsWith('.edi-animation.json')) {
      toast.error('Escolha Animação para web ao exportar no ediSVG.')
      return
    }
    if (!file.size || file.size > 10_000_000) {
      toast.error('A animação deve ter até 10 MB.')
      return
    }
    setUploading(true)
    onUploadingChange(true)
    const controller = new AbortController()
    uploadTask.current = controller
    try {
      const form = new FormData()
      form.set('file', file)
      const stored = await apiUpload<ModuleAnimation>('/api/media/module-animation', form, {
        signal: controller.signal,
      })
      if (live.current) onChange(stored)
    } catch {
      if (live.current)
        toast.error('Não foi possível enviar a animação. Confira o arquivo e tente novamente.')
    } finally {
      if (uploadTask.current === controller) uploadTask.current = null
      if (live.current) {
        setUploading(false)
        onUploadingChange(false)
      }
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={input}
        id={inputId}
        className="hidden"
        type="file"
        accept=".edi-animation.json,application/json"
        aria-label="Arquivo de animação ediSVG"
        disabled={uploading}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0]
          event.currentTarget.value = ''
          if (file) void upload(file)
        }}
      />
      {value && <AnimationPreview key={value.url} value={value} />}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => input.current?.click()}
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {uploading ? 'Enviando animação' : value ? 'Trocar animação' : 'Enviar animação'}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={uploading}
            onClick={() => onChange(null)}
          >
            <X className="size-4" /> Remover
          </Button>
        )}
      </div>
      <p className="text-muted-foreground text-xs">
        No ediSVG, exporte em Animação para web. A imagem de reserva vem no mesmo arquivo.
      </p>
    </div>
  )
}

function AnimationPreview({ value }: { value: ModuleAnimation }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex min-h-36 items-center justify-center">
        <EdiAnimation
          src={`/api/media/module-animation/preview?src=${encodeURIComponent(value.url)}`}
          poster={value.poster.url}
          width={value.poster.width}
          height={value.poster.height}
          title={value.title}
          className="size-36"
          onError={() => setFailed(true)}
        />
      </div>
      {failed && (
        <p role="status" className="flex items-center gap-2 text-destructive text-xs">
          <TriangleAlert className="size-4 shrink-0" /> Não foi possível animar a prévia. A imagem
          de reserva está visível.
        </p>
      )}
    </div>
  )
}
