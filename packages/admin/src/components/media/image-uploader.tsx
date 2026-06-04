'use client'

import { Button } from '@sistemazero/ui/button'
import { Input } from '@sistemazero/ui/input'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { type ApiError, apiUpload } from '@/lib/api'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ACCEPTED = 'image/png,image/jpeg,image/webp'

/**
 * Uploader de imagem (capa de curso / bloco): clique → otimiza (WebP) → R2 →
 * preenche o campo com a URL pública. Mantém o fallback de URL manual (campo
 * continua editável) — colar uma URL externa também funciona.
 */
export function ImageUploader({
  value,
  onChange,
  scope,
  inputId,
}: {
  value: string
  onChange: (url: string) => void
  scope: 'course' | 'block'
  /** id p/ o htmlFor do Field externo (aponta p/ o input de URL manual). */
  inputId?: string
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function upload(file: File) {
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error('Imagem excede o limite de 5 MB.')
      return
    }
    setUploading(true)
    try {
      const form = new FormData()
      form.set('file', file)
      form.set('scope', scope)
      const { url } = await apiUpload<{ url: string }>('/api/media/images', form)
      onChange(url)
      toast.success('Imagem enviada.')
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Falha no upload da imagem.')
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

      {value ? (
        <div className="relative overflow-hidden rounded-lg border border-border">
          {/* biome-ignore lint/performance/noImgElement: preview de URL arbitrária (R2/externa) */}
          <img src={value} alt="Pré-visualização" className="h-40 w-full object-cover" />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute right-2 top-2 size-7 bg-background/80"
            title="Remover imagem"
            onClick={() => onChange('')}
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-ring hover:text-foreground disabled:pointer-events-none disabled:opacity-60"
        >
          {uploading ? (
            <>
              <Loader2 className="size-5 animate-spin" /> Enviando imagem…
            </>
          ) : (
            <>
              <ImagePlus className="size-5" /> Clique para enviar (PNG/JPG/WebP, até 5 MB)
            </>
          )}
        </button>
      )}

      <Input
        id={inputId}
        placeholder="…ou cole uma URL de imagem"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
