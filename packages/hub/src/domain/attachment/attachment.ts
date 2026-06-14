export type AttachmentKind = 'image' | 'pdf' | 'document' | 'audio' | 'video'
export type AttachmentStatus = 'pending_upload' | 'ready'

/**
 * Anexo de UGC (imagem/PDF/documento/áudio/vídeo). O arquivo vive no R2 (bucket
 * privado, gerido pelo BFF); aqui guardamos só o metadado + `storageRef`
 * (`r2ugc:<key>`, NUNCA exposto ao browser). `pending_upload` → `ready` quando o
 * conteúdo (tópico/comentário) é submetido e o anexo é vinculado.
 */
export interface Attachment {
  id: string
  ownerId: string
  threadId: string | null
  commentId: string | null
  kind: AttachmentKind
  storageRef: string
  mime: string
  sizeBytes: number
  width: number | null
  height: number | null
  durationSeconds: number | null
  originalName: string
  status: AttachmentStatus
  createdAt: Date
}

export interface AttachmentLimits {
  maxBytesByKind: Record<AttachmentKind, number>
  maxPerPost: number
}

export const ATTACHMENT_KINDS: readonly AttachmentKind[] = [
  'image',
  'pdf',
  'document',
  'audio',
  'video',
]

export function isAttachmentKind(v: unknown): v is AttachmentKind {
  return typeof v === 'string' && (ATTACHMENT_KINDS as readonly string[]).includes(v)
}
