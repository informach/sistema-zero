import type * as P from '@sistemazero/core/pensa'
import type { CreationSummary } from '../creations/creation'
import type { PensaProjectBase } from './pensa-project-repository.port'

export interface PensaCreationDownloadTicket {
  storageKey: string
  revision: number
  bytes: number
  summary: CreationSummary
  parts: Array<{ hash: string; bytes: number; storageKey: string }>
}

export interface PensaTeamFacts {
  base: PensaProjectBase
  code: {
    profileId: string
    level: string
    blocks: string[]
    access: { studio: boolean; pinta: boolean; molda: boolean }
    creations: { pinta: CreationSummary[]; molda: CreationSummary[] }
  }
  art: Array<{
    profileId: string
    level: string
    access: { studio: boolean; pinta: boolean; molda: boolean }
  }>
  gameTicket: PensaCreationDownloadTicket | null
}

export interface PensaTeamRepository {
  team(actor: P.PensaActor, projectId: string): Promise<P.PensaTeamView>
  context(actor: P.PensaActor, projectId: string): Promise<PensaTeamFacts>
  share(
    actor: P.PensaActor,
    projectId: string,
    requestId: string,
    enabled: boolean,
  ): Promise<P.PensaTeamView>
  join(actor: P.PensaActor, requestId: string, code: string): Promise<{ projectId: string }>
  setRoles(
    actor: P.PensaActor,
    projectId: string,
    input: P.PensaRolesRequest,
  ): Promise<P.PensaTeamView>
  remove(
    actor: P.PensaActor,
    projectId: string,
    profileId: string,
    requestId: string,
  ): Promise<void>
  art(actor: P.PensaActor, projectId: string): Promise<{ items: P.PensaTeamArtItem[] }>
  artDownload(
    actor: P.PensaActor,
    projectId: string,
    missionId: string,
    slotId: string,
  ): Promise<PensaCreationDownloadTicket>
}
