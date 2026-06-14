import type { Attachment, AttachmentKind } from '../attachment/attachment'

export interface CreateAttachmentInput {
  id: string
  ownerId: string
  kind: AttachmentKind
  storageRef: string
  mime: string
  sizeBytes: number
  originalName: string
  now: Date
}

export interface AttachmentRepository {
  /** Cria o metadado em `pending_upload` (o BFF já mintou o presigned PUT). */
  create(input: CreateAttachmentInput): Promise<Attachment>
  findById(id: string): Promise<Attachment | null>
  /** Anexos `pending_upload` do dono entre os ids dados (validação do vínculo). */
  findOwnedPending(ownerId: string, ids: string[]): Promise<Attachment[]>
  /** Anexos `ready` por tópico (para montar a view). */
  listByThreadIds(threadIds: string[]): Promise<Map<string, Attachment[]>>
  /** Anexos `ready` por comentário (para montar a view). */
  listByCommentIds(commentIds: string[]): Promise<Map<string, Attachment[]>>
}
