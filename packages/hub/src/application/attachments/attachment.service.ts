import type {
  Attachment,
  AttachmentKind,
  AttachmentLimits,
} from '../../domain/attachment/attachment'
import { isAttachmentKind } from '../../domain/attachment/attachment'
import {
  AccessDeniedError,
  AttachmentNotFoundError,
  AttachmentTooLargeError,
  AttachmentTypeNotAllowedError,
} from '../../domain/hub-errors'
import type { AttachmentRepository } from '../../domain/ports/attachment-repository.port'
import type { CommunityReadRepository } from '../../domain/ports/community-read-repository.port'
import type { ThreadRepository } from '../../domain/ports/thread-repository.port'
import { ValidationError } from '../../domain/shared/errors'
import type { AccessResolutionService, Actor } from '../access/access-resolution.service'

const MAX_MIME = 255
const MAX_NAME = 300
/** Toda chave de UGC mora no bucket privado, referenciada por `r2ugc:<key>`. */
const STORAGE_REF_PREFIX = 'r2ugc:'

export interface RegisterAttachmentCommand {
  kind: AttachmentKind
  mime: string
  sizeBytes: number
  originalName: string
  /** Chave no R2 (`r2ugc:<key>`), gerada pelo BFF que mintou o presigned PUT. */
  storageRef: string
}

/** Devolvido ao BFF (e SÓ a ele) para mintar o presigned GET. */
export interface ResolvedAttachment {
  id: string
  storageRef: string
  mime: string
  kind: AttachmentKind
  originalName: string
  sizeBytes: number
}

/**
 * Registra metadados de anexo (em `pending_upload`) e resolve o `storageRef` para
 * o BFF servir o arquivo. O R2 vive no member-shell; o hub só guarda o metadado e
 * é a autoridade de acesso. Limites de tipo/tamanho são validados aqui (não se
 * confia no cliente) e ecoados pelo presign do BFF.
 */
export class AttachmentService {
  constructor(
    private readonly attachments: AttachmentRepository,
    private readonly read: CommunityReadRepository,
    private readonly access: AccessResolutionService,
    private readonly threads: ThreadRepository,
    private readonly limits: AttachmentLimits,
    private readonly clock: () => Date,
    private readonly newId: () => string,
  ) {}

  async register(actor: Actor, cmd: RegisterAttachmentCommand): Promise<{ id: string }> {
    if (!isAttachmentKind(cmd.kind)) throw new AttachmentTypeNotAllowedError()
    const max = this.limits.maxBytesByKind[cmd.kind]
    if (!Number.isInteger(cmd.sizeBytes) || cmd.sizeBytes <= 0 || cmd.sizeBytes > max) {
      throw new AttachmentTooLargeError()
    }
    const mime = cmd.mime.trim()
    const originalName = cmd.originalName.trim()
    const storageRef = cmd.storageRef.trim()
    if (!mime || mime.length > MAX_MIME) throw new AttachmentTypeNotAllowedError()
    if (!originalName || originalName.length > MAX_NAME || !storageRef) {
      throw new AttachmentTypeNotAllowedError()
    }
    // O `storageRef` é opaco para o hub, mas tem de apontar para o bucket de UGC —
    // não aceitar referência arbitrária (defesa, mesmo o chamador sendo o BFF).
    if (!storageRef.startsWith(STORAGE_REF_PREFIX)) {
      throw new ValidationError('storageRef inválido (esperado prefixo r2ugc:)')
    }
    const created = await this.attachments.create({
      id: this.newId(),
      ownerId: actor.userId,
      kind: cmd.kind,
      storageRef,
      mime,
      sizeBytes: cmd.sizeBytes,
      originalName,
      now: this.clock(),
    })
    return { id: created.id }
  }

  /**
   * Autoriza e devolve o `storageRef` ao BFF. `pending_upload` só o dono/staff
   * resolve (preview do próprio upload); `ready` exige acesso ao conteúdo-pai
   * (canal + visibilidade do tópico/comentário).
   */
  async resolve(actor: Actor, attachmentId: string): Promise<ResolvedAttachment> {
    const a = await this.attachments.findById(attachmentId)
    if (!a) throw new AttachmentNotFoundError()
    if (a.status === 'pending_upload') {
      if (a.ownerId !== actor.userId && !actor.privileged) throw new AttachmentNotFoundError()
    } else {
      await this.assertCanSeeParent(actor, a)
    }
    return this.toResolved(a)
  }

  /**
   * Leitura privada para investigação da moderação. Não reutiliza a política do
   * aluno: conteúdo oculto/rejeitado precisa continuar inspecionável pela equipe.
   */
  async resolveForModeration(actor: Actor, attachmentId: string): Promise<ResolvedAttachment> {
    if (!actor.privileged) throw new AccessDeniedError('Apenas a equipe pode moderar anexos')
    const attachment = await this.attachments.findById(attachmentId)
    if (!attachment) throw new AttachmentNotFoundError()
    return this.toResolved(attachment)
  }

  private toResolved(a: Attachment): ResolvedAttachment {
    return {
      id: a.id,
      storageRef: a.storageRef,
      mime: a.mime,
      kind: a.kind,
      originalName: a.originalName,
      sizeBytes: a.sizeBytes,
    }
  }

  /** Garante que o ator enxerga o tópico/comentário-pai do anexo `ready`. */
  private async assertCanSeeParent(actor: Actor, a: Attachment): Promise<void> {
    // Resolve o threadId (direto ou via comentário) e a visibilidade do comentário.
    let threadId = a.threadId
    if (!threadId && a.commentId) {
      const comment = await this.threads.findCommentById(a.commentId)
      if (!comment) throw new AttachmentNotFoundError()
      // Mesma régua da leitura de conteúdo: oculto/apagado/recusado some até para
      // o autor (só `pending` o autor/staff ainda enxerga).
      const commentVisible =
        comment.status === 'visible' ||
        (comment.status === 'pending' && (comment.authorId === actor.userId || actor.privileged))
      if (!commentVisible) throw new AttachmentNotFoundError()
      threadId = comment.threadId
    }
    if (!threadId) throw new AttachmentNotFoundError()

    const thread = await this.threads.findThreadById(threadId)
    if (!thread) throw new AttachmentNotFoundError()
    const threadVisible =
      thread.status === 'visible' ||
      (thread.status === 'pending' && (thread.authorId === actor.userId || actor.privileged))
    if (!threadVisible) throw new AttachmentNotFoundError()

    const channel = await this.read.findActiveChannelById(thread.channelId)
    if (!channel) throw new AttachmentNotFoundError()
    const space = await this.read.findActiveSpaceById(channel.spaceId)
    if (!space) throw new AttachmentNotFoundError()
    if (!(await this.access.canAccessChannel(actor, space, channel))) throw new AccessDeniedError()
  }
}
