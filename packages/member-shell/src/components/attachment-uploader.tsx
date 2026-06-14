'use client'

import { Button } from '@sistemazero/ui/button'
import { Spinner } from '@sistemazero/ui/spinner'
import { FileText, Film, ImageIcon, Music, Paperclip, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { cn } from '../lib/cn'
import {
  classifyMime,
  formatBytes,
  HUB_ATTACHMENT_LIMITS,
  HUB_UPLOAD_ACCEPT,
} from '../lib/hub-attachments'
import type { HubAttachmentKind } from '../lib/types'

export interface UploadedAttachment {
  id: string
  kind: HubAttachmentKind
  mime: string
  originalName: string
  sizeBytes: number
}

interface FailedItem {
  localId: string
  name: string
  error: string
}

const KIND_ICON: Record<HubAttachmentKind, typeof FileText> = {
  image: ImageIcon,
  pdf: FileText,
  document: FileText,
  audio: Music,
  video: Film,
}

async function readError(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
  return body?.error?.message ?? 'Falha no envio do anexo.'
}

/**
 * Uploader de anexos COMPARTILHADO (community + community-kids). Imagens vão por
 * `/api/hub/uploads/image` (re-encode WebP no BFF); os demais por presign +
 * **PUT DIRETO no R2** (`/api/hub/uploads/presign`) — arquivo grande não toca o
 * servidor. Cada upload registra o metadado `pending_upload` no hub; o compositor
 * envia os `id`s no create do tópico/comentário (lá viram `ready`). Envios são
 * SEQUENCIAIS (evita corrida no array controlado). Sem dependência de tema.
 */
export function AttachmentUploader({
  value,
  onChange,
  disabled = false,
  max = HUB_ATTACHMENT_LIMITS.maxPerPost,
}: {
  value: UploadedAttachment[]
  onChange: (next: UploadedAttachment[]) => void
  disabled?: boolean
  max?: number
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState<FailedItem[]>([])

  async function uploadOne(file: File): Promise<UploadedAttachment> {
    const kind = classifyMime(file.type)
    if (!kind) throw new Error('Tipo de arquivo não suportado.')
    if (file.size > HUB_ATTACHMENT_LIMITS.maxBytesByKind[kind]) {
      throw new Error(
        `Acima do limite (${formatBytes(HUB_ATTACHMENT_LIMITS.maxBytesByKind[kind])}).`,
      )
    }

    // Imagem: re-encode no BFF (strip EXIF + anti bomba) — vai por multipart.
    if (kind === 'image') {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/hub/uploads/image', { method: 'POST', body: fd })
      if (!res.ok) throw new Error(await readError(res))
      const b = (await res.json()) as UploadedAttachment
      return b
    }

    // Demais: presign + PUT direto no R2 (Content-Type/Length assinados).
    const presignRes = await fetch('/api/hub/uploads/presign', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        kind,
        mime: file.type,
        sizeBytes: file.size,
        originalName: file.name,
      }),
    })
    if (!presignRes.ok) throw new Error(await readError(presignRes))
    const presign = (await presignRes.json()) as { id: string; uploadUrl: string }
    const put = await fetch(presign.uploadUrl, {
      method: 'PUT',
      headers: { 'content-type': file.type },
      body: file,
    })
    if (!put.ok) throw new Error('Falha ao enviar o arquivo para o armazenamento.')
    return {
      id: presign.id,
      kind,
      mime: file.type,
      originalName: file.name,
      sizeBytes: file.size,
    }
  }

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setFailed([])
    setBusy(true)
    // `current` evita corrida do `value` capturado no closure entre uploads.
    let current = value
    const room = Math.max(0, max - current.length)
    const batch = Array.from(files).slice(0, room)
    const errors: FailedItem[] = []
    for (const file of batch) {
      try {
        const uploaded = await uploadOne(file)
        current = [...current, uploaded]
        onChange(current)
      } catch (error) {
        errors.push({
          localId: `${file.name}-${file.size}`,
          name: file.name,
          error: error instanceof Error ? error.message : 'Falha no envio.',
        })
      }
    }
    if (files.length > room) {
      errors.push({ localId: 'limit', name: '', error: `Máximo de ${max} anexos por publicação.` })
    }
    setFailed(errors)
    setBusy(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  function remove(id: string) {
    onChange(value.filter((a) => a.id !== id))
  }

  const atLimit = value.length >= max

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={HUB_UPLOAD_ACCEPT}
        className="hidden"
        onChange={(e) => void onFiles(e.target.files)}
        disabled={disabled || busy}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || busy || atLimit}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? <Spinner className="size-4" /> : <Paperclip className="size-4" />}
        {busy ? 'Enviando…' : 'Anexar arquivo'}
      </Button>

      {value.length > 0 && (
        <ul className="space-y-1">
          {value.map((a) => {
            const Icon = KIND_ICON[a.kind]
            return (
              <li
                key={a.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-2 py-1 text-sm"
              >
                <Icon className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{a.originalName}</span>
                <span className="shrink-0 text-muted-foreground text-xs">
                  {formatBytes(a.sizeBytes)}
                </span>
                <button
                  type="button"
                  aria-label={`Remover ${a.originalName}`}
                  className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
                  onClick={() => remove(a.id)}
                  disabled={disabled || busy}
                >
                  <X className="size-4" />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {failed.length > 0 && (
        <ul className={cn('space-y-0.5 text-destructive text-xs')}>
          {failed.map((f) => (
            <li key={f.localId}>{f.name ? `${f.name}: ${f.error}` : f.error}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
