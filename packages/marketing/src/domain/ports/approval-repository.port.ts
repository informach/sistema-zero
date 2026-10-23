import type {
  ApprovedEdition,
  ApproveEdition,
  approvalPreviewSchema,
  editionPageSchema,
} from '@sistemazero/marketing-contracts'
import type { z } from 'zod'
export interface ApprovalRepository {
  get(actorId: string, projectId: string, editionId: string): Promise<ApprovedEdition>
  preview(
    actorId: string,
    projectId: string,
    representationId: string,
  ): Promise<z.infer<typeof approvalPreviewSchema>>
  approve(
    actorId: string,
    projectId: string,
    input: ApproveEdition,
    requestHash: string,
  ): Promise<ApprovedEdition>
  list(
    actorId: string,
    projectId: string,
    representationId: string,
    before?: string,
  ): Promise<z.infer<typeof editionPageSchema>>
}
