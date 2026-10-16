import {
  approveEditionSchema,
  canonicalJson,
  editionDownloadSchema,
  idSchema,
} from '@sistemazero/marketing-contracts'
import type { ApprovalRepository } from '../../domain/ports/approval-repository.port'
import { WorkspaceError } from '../../domain/workspace/workspace-error'
import type { Actor } from '../actor'
import { parseWorkspace, payloadHash, workspaceActor } from './workspace.service'
import type { WorkspaceAssetsService } from './workspace-assets.service'
export class ApprovalService {
  constructor(
    private readonly repo: ApprovalRepository,
    private readonly assets?: Pick<WorkspaceAssetsService, 'download'>,
  ) {}
  async download(actor: Actor, projectId: string, editionId: string, componentId: string) {
    const edition = await this.get(actor, projectId, editionId)
    const index = edition.snapshot.orderedAssets.findIndex(
      (file) => file.componentId === parseWorkspace(idSchema, componentId),
    )
    const file = edition.snapshot.orderedAssets[index]
    if (!file)
      throw new WorkspaceError('OBJECT_INACCESSIBLE', 'O arquivo não pertence à edição aprovada')
    if (!this.assets)
      throw new WorkspaceError('MEDIA_NOT_CONFIGURED', 'O armazenamento não está configurado')
    const extension = new Map([
      ['image/png', 'png'],
      ['image/jpeg', 'jpg'],
      ['image/webp', 'webp'],
      ['video/mp4', 'mp4'],
    ]).get(file.asset.mime)
    if (!extension)
      throw new WorkspaceError('INVALID_RESULT', 'Formato final não suportado para exportação')
    const filename = `${String(index + 1).padStart(3, '0')}-${edition.id}.${extension}`
    const result = await this.assets.download(actor, projectId, file.asset.id, filename)
    if (canonicalJson(result.manifest) !== canonicalJson(file.asset))
      throw new WorkspaceError('INVALID_RESULT', 'O arquivo diverge da edição aprovada')
    return editionDownloadSchema.parse({
      componentId: file.componentId,
      ...result,
      filename,
      editionId: edition.id,
      editionHash: edition.hash,
    })
  }
  get(actor: Actor, projectId: string, editionId: string) {
    return this.repo.get(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      parseWorkspace(idSchema, editionId),
    )
  }
  preview(actor: Actor, projectId: string, representationId: string) {
    return this.repo.preview(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      parseWorkspace(idSchema, representationId),
    )
  }
  approve(actor: Actor, projectId: string, raw: unknown) {
    const input = parseWorkspace(approveEditionSchema, raw)
    return this.repo.approve(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      input,
      payloadHash({ action: 'approve-edition', input }),
    )
  }
  list(actor: Actor, projectId: string, representationId: string, before?: string) {
    return this.repo.list(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      parseWorkspace(idSchema, representationId),
      before ? parseWorkspace(idSchema, before) : undefined,
    )
  }
}
