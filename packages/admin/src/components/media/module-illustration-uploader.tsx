'use client'

import {
  MODULE_ILLUSTRATIONS,
  moduleIllustration,
  moduleIllustrationSrc,
} from '@sistemazero/core/course/module-illustrations'
import { Button } from '@sistemazero/ui/button'
import { Select } from '@sistemazero/ui/select'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { type ApiError, apiUpload } from '@/lib/api'

const MAX_SVG_BYTES = 2 * 1024 * 1024

export function ModuleIllustrationUploader({
  value,
  onChange,
  onUploadingChange,
}: {
  value: string
  onChange: (value: string) => void
  onUploadingChange: (uploading: boolean) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const preset = moduleIllustration(value)
  // As artes de exemplo são servidas só pelo app Kids, em outro domínio.
  const preview = preset ? null : moduleIllustrationSrc(value)

  async function upload(file: File) {
    if ((file.type && file.type !== 'image/svg+xml') || !file.name.toLowerCase().endsWith('.svg')) {
      toast.error('Escolha um arquivo SVG.')
      return
    }
    if (file.size === 0 || file.size > MAX_SVG_BYTES) {
      toast.error('O SVG deve ter até 2 MB.')
      return
    }
    setUploading(true)
    onUploadingChange(true)
    try {
      const form = new FormData()
      form.set('file', file)
      const { url } = await apiUpload<{ url: string }>('/api/media/module-illustrations', form)
      onChange(url)
      toast.success('Ilustração enviada. Salve o módulo para usá-la na trilha.')
    } catch (error) {
      toast.error((error as ApiError).message ?? 'Falha ao enviar a ilustração.')
    } finally {
      setUploading(false)
      onUploadingChange(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        id="millustration-file"
        type="file"
        accept=".svg,image/svg+xml"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void upload(file)
        }}
      />
      {preview ? (
        <div className="relative flex min-h-36 items-center justify-center rounded-lg border border-border bg-muted/30 p-4">
          {/* biome-ignore lint/performance/noImgElement: SVG animado do R2 ou arte local de teste */}
          <img src={preview} alt="Prévia da ilustração" className="max-h-40 max-w-full" />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute right-2 top-2 size-7 bg-background/80"
            title="Remover ilustração"
            disabled={uploading}
            onClick={() => onChange('')}
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : null}
      <Button
        type="button"
        variant="outline"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
        {uploading ? 'Enviando SVG…' : preview ? 'Trocar SVG' : 'Enviar SVG animado'}
      </Button>
      <p className="text-xs text-muted-foreground">
        SVG de até 2 MB. A animação aparece na trilha.
      </p>
      <Select
        aria-label="Artes de exemplo"
        value={preset?.key ?? ''}
        disabled={uploading}
        onChange={(event) => {
          if (event.target.value) onChange(event.target.value)
        }}
      >
        <option value="">Ou escolha uma arte de exemplo</option>
        {MODULE_ILLUSTRATIONS.map((illustration) => (
          <option key={illustration.key} value={illustration.key}>
            {illustration.label}
          </option>
        ))}
      </Select>
    </div>
  )
}
