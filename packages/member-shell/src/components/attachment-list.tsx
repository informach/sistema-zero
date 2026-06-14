'use client'

import { Download, FileText } from 'lucide-react'
import { formatBytes } from '../lib/hub-attachments'
import type { HubAttachmentView } from '../lib/types'

/** URL da rota de serve do BFF (302 → URL pré-assinada do R2). */
function attachmentUrl(id: string): string {
  return `/api/hub/attachments/${id}`
}

/**
 * Renderiza os anexos de um tópico/comentário (community + community-kids). Mídia
 * (imagem/áudio/vídeo) toca inline; PDF/documento viram um chip de download. O
 * arquivo NUNCA vem do storage direto — sempre por `/api/hub/attachments/:id`
 * (autorizado pelo hub, 302 pré-assinado de TTL curto). Sem dependência de tema.
 */
export function AttachmentList({ attachments }: { attachments: HubAttachmentView[] }) {
  if (attachments.length === 0) return null
  return (
    <div className="mt-3 space-y-2">
      {attachments.map((a) => (
        <AttachmentItem key={a.id} attachment={a} />
      ))}
    </div>
  )
}

function AttachmentItem({ attachment: a }: { attachment: HubAttachmentView }) {
  const url = attachmentUrl(a.id)

  if (a.kind === 'image') {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        {/* Anexo dinâmico via rota BFF (302 pré-assinado) — next/image não cabe aqui. */}
        <img
          src={url}
          alt={a.originalName}
          loading="lazy"
          className="max-h-96 w-auto max-w-full rounded-xl border border-border object-contain"
        />
      </a>
    )
  }

  if (a.kind === 'video') {
    return (
      <video
        controls
        preload="metadata"
        className="max-h-96 w-full max-w-2xl rounded-xl border border-border bg-black"
      >
        <source src={url} type={a.mime} />
        <track kind="captions" />
      </video>
    )
  }

  if (a.kind === 'audio') {
    return (
      // biome-ignore lint/a11y/useMediaCaption: áudio enviado pelo usuário não tem legenda
      <audio controls preload="metadata" className="w-full max-w-md">
        <source src={url} type={a.mime} />
      </audio>
    )
  }

  // PDF e documento → chip de download (documento vai como attachment no serve).
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm transition-colors hover:bg-muted"
    >
      <FileText className="size-5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate font-medium">{a.originalName}</span>
      <span className="shrink-0 text-muted-foreground text-xs">{formatBytes(a.sizeBytes)}</span>
      <Download className="size-4 shrink-0 text-muted-foreground" />
    </a>
  )
}
