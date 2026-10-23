import type * as P from '@sistemazero/core/pensa'
import type {
  PensaMissionCommand,
  PensaMissionInput,
  PensaProjectRepository,
} from '../../domain/ports/pensa-project-repository.port'

/** Application boundary; aggregate persistence remains atomic behind its port. */
export class PensaProjectService {
  constructor(private readonly repository: PensaProjectRepository) {}
  readBase(actor: P.PensaActor, id: string) {
    return this.repository.readBase(actor, id)
  }
  get(actor: P.PensaActor, id: string, capabilities: P.PensaCapabilities) {
    return this.repository.get(actor, id, capabilities)
  }
  list(actor: P.PensaActor, status: 'active' | 'archived') {
    return this.repository.list(actor, status)
  }
  create(actor: P.PensaActor, input: P.PensaCreateProjectRequest) {
    return this.repository.create(actor, input)
  }
  metadata(actor: P.PensaActor, id: string, input: P.PensaMetadataRequest) {
    return this.repository.metadata(actor, id, input)
  }
  message(actor: P.PensaActor, id: string, input: P.PensaMessageRequest) {
    return this.repository.message(actor, id, input)
  }
  editDraft(
    actor: P.PensaActor,
    id: string,
    input: P.PensaDraftEditRequest,
    capabilities: P.PensaCapabilities,
  ) {
    return this.repository.editDraft(actor, id, input, capabilities)
  }
  acceptDraft(
    actor: P.PensaActor,
    id: string,
    input: P.PensaDraftAcceptRequest,
    capabilities: P.PensaCapabilities,
  ) {
    return this.repository.acceptDraft(actor, id, input, capabilities)
  }
  discardDraft(actor: P.PensaActor, id: string, requestId: string) {
    return this.repository.discardDraft(actor, id, requestId)
  }
  handoff(actor: P.PensaActor, id: string, capabilities: P.PensaCapabilities) {
    return this.repository.handoff(actor, id, capabilities)
  }
  mission(
    actor: P.PensaActor,
    id: string,
    command: PensaMissionCommand,
    input: PensaMissionInput,
    capabilities: P.PensaCapabilities,
    configurationVerified = false,
  ) {
    return this.repository.mission(actor, id, command, input, capabilities, configurationVerified)
  }
}
