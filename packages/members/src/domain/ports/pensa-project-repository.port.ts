import type * as P from '@sistemazero/core/pensa'

export type PensaProjectBase = Omit<P.PensaProjectView, 'availability' | 'nextAction'>
export type PensaMissionCommand =
  | 'start'
  | 'note'
  | 'deliveries'
  | 'complete'
  | 'reopen'
  | 'reconfirm'
export type PensaMissionInput =
  | P.PensaMissionStartRequest
  | P.PensaMissionNoteRequest
  | P.PensaMissionCompleteRequest
  | P.PensaMissionDeliveriesRequest

/** Atomic aggregate commands. Infrastructure owns locks, fences and ledger writes. */
export interface PensaProjectRepository {
  readBase(actor: P.PensaActor, projectId: string): Promise<PensaProjectBase>
  get(
    actor: P.PensaActor,
    projectId: string,
    capabilities: P.PensaCapabilities,
  ): Promise<P.PensaProjectView>
  list(actor: P.PensaActor, status: 'active' | 'archived'): Promise<P.PensaProjectListItem[]>
  create(actor: P.PensaActor, input: P.PensaCreateProjectRequest): Promise<PensaProjectBase>
  metadata(
    actor: P.PensaActor,
    projectId: string,
    input: P.PensaMetadataRequest,
  ): Promise<PensaProjectBase>
  message(
    actor: P.PensaActor,
    projectId: string,
    input: P.PensaMessageRequest,
  ): Promise<PensaProjectBase>
  editDraft(
    actor: P.PensaActor,
    projectId: string,
    input: P.PensaDraftEditRequest,
    capabilities: P.PensaCapabilities,
  ): Promise<P.PensaProjectView>
  acceptDraft(
    actor: P.PensaActor,
    projectId: string,
    input: P.PensaDraftAcceptRequest,
    capabilities: P.PensaCapabilities,
  ): Promise<P.PensaProjectView>
  discardDraft(actor: P.PensaActor, projectId: string, requestId: string): Promise<void>
  handoff(
    actor: P.PensaActor,
    missionId: string,
    capabilities: P.PensaCapabilities,
  ): Promise<P.PensaMissionHandoff>
  mission(
    actor: P.PensaActor,
    missionId: string,
    command: PensaMissionCommand,
    input: PensaMissionInput,
    capabilities: P.PensaCapabilities,
    configurationVerified?: boolean,
  ): Promise<P.PensaMissionHandoff>
}
