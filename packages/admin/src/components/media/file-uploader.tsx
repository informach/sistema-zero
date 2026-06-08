'use client'

import { Loader2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { type ApiError, apiSend } from '@/lib/api'

const MAX_FILE_BYTES = 200 * 1024 * 1024

export interface UploadedFile {
  url: string
  fileType: string
  sizeBytes: number
  filename: string
}

interface PresignTarget {
  uploadUrl: string
  url: string
  contentType: string
}

/**
 * PUT direto no R2 com progresso real. Usa `XMLHttpRequest` (e não `fetch`) só
 * porque o browser só expõe progresso de UPLOAD pelo `xhr.upload.onprogress` —
 * essencial p/ um PDF de 200MB (sem isso o usuário vê só um spinner "infinito").
 * NÃO manda cookies (cross-origin pro R2; a autorização é a assinatura da URL).
 */
function putToR2(
  url: string,
  file: File,
  contentType: string,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    // Tem que casar EXATAMENTE com o content-type assinado, senão o R2 recusa.
    xhr.setRequestHeader('content-type', contentType)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`Falha ao enviar para o armazenamento (HTTP ${xhr.status}).`))
    }
    xhr.onerror = () => reject(new Error('Falha de rede ao enviar o arquivo.'))
    xhr.onabort = () => reject(new Error('Envio cancelado.'))
    xhr.send(file)
  })
}

/**
 * Uploader de arquivo genérico (anexos de aula / e-book PDF, até 200MB): pede uma
 * URL PUT pré-assinada ao BFF e sobe o arquivo DIRETO no bucket R2 privado, sem
 * passar pelo admin nem pela borda do Cloudflare (teto de 100MB no Free). Devolve
 * `r2priv:<key>` + tipo + tamanho via `onUploaded`.
 */
export function FileUploader({
  onUploaded,
  accept,
  label = 'Clique para enviar um arquivo (até 200 MB)',
}: {
  onUploaded: (file: UploadedFile) => void
  /** accept do input (ex.: 'application/pdf,.pdf'); default = allowlist do servidor. */
  accept?: string
  label?: string
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)

  async function upload(file: File) {
    if (file.size > MAX_FILE_BYTES) {
      toast.error('Arquivo excede o limite de 200 MB.')
      return
    }
    setUploading(true)
    setProgress(0)
    try {
      const target = await apiSend<PresignTarget>('/api/media/files/presign', 'POST', {
        filename: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      })
      await putToR2(target.uploadUrl, file, target.contentType, setProgress)
      onUploaded({
        url: target.url,
        fileType: target.contentType,
        sizeBytes: file.size,
        filename: file.name,
      })
      toast.success('Arquivo enviado.')
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Falha no upload do arquivo.')
    } finally {
      setUploading(false)
      setProgress(null)
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
            <Loader2 className="size-4 animate-spin" />{' '}
            {progress !== null ? `Enviando… ${progress}%` : 'Enviando…'}
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
