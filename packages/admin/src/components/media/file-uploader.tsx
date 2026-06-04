'use client'

import { Loader2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { type ApiError, apiUpload } from '@/lib/api'

const MAX_FILE_BYTES = 100 * 1024 * 1024

export interface UploadedFile {
  url: string
  fileType: string
  sizeBytes: number
  filename: string
}

/**
 * Uploader de arquivo genérico (anexos de aula / áudio): envia ao R2 e devolve
 * URL + tipo + tamanho via `onUploaded` (o form continua aceitando URL manual).
 */
export function FileUploader({
  onUploaded,
  accept,
  label = 'Clique para enviar um arquivo (até 100 MB)',
}: {
  onUploaded: (file: UploadedFile) => void
  /** accept do input (ex.: 'audio/*'); default = allowlist do servidor. */
  accept?: string
  label?: string
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function upload(file: File) {
    if (file.size > MAX_FILE_BYTES) {
      toast.error('Arquivo excede o limite de 100 MB.')
      return
    }
    setUploading(true)
    try {
      const form = new FormData()
      form.set('file', file)
      const stored = await apiUpload<{ url: string; fileType: string; sizeBytes: number }>(
        '/api/media/files',
        form,
      )
      onUploaded({ ...stored, filename: file.name })
      toast.success('Arquivo enviado.')
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Falha no upload do arquivo.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept={accept}
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
            <Loader2 className="size-4 animate-spin" /> Enviando…
          </>
        ) : (
          <>
            <Upload className="size-4" /> {label}
          </>
        )}
      </button>
    </>
  )
}
