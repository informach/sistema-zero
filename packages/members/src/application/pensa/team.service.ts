import type * as P from '@sistemazero/core/pensa'
import type {
  PensaTeamContextSession,
  PensaTeamRepository,
} from '../../domain/ports/pensa-team-repository.port'

export class PensaTeamService {
  constructor(private readonly repository: PensaTeamRepository) {}
  team(actor: P.PensaActor, id: string) {
    return this.repository.team(actor, id)
  }
  context(actor: P.PensaActor, id: string, session?: PensaTeamContextSession) {
    return this.repository.context(actor, id, session)
  }
  share(actor: P.PensaActor, id: string, requestId: string, enabled: boolean) {
    return this.repository.share(actor, id, requestId, enabled)
  }
  join(actor: P.PensaActor, requestId: string, code: string) {
    return this.repository.join(actor, requestId, code)
  }
  setRoles(actor: P.PensaActor, id: string, input: P.PensaRolesRequest) {
    return this.repository.setRoles(actor, id, input)
  }
  remove(actor: P.PensaActor, id: string, profileId: string, requestId: string) {
    return this.repository.remove(actor, id, profileId, requestId)
  }
  art(actor: P.PensaActor, id: string) {
    return this.repository.art(actor, id)
  }
  artDownload(actor: P.PensaActor, id: string, missionId: string, slotId: string) {
    return this.repository.artDownload(actor, id, missionId, slotId)
  }
}
