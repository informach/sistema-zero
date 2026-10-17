import 'server-only'
import type {
  PensaActor,
  PensaCapabilities,
  PensaCheckpoint,
  PensaCreateProjectRequest,
  PensaDraftAcceptRequest,
  PensaDraftEditRequest,
  PensaJoinRequest,
  PensaMessagePage,
  PensaMessageRequest,
  PensaMetadataRequest,
  PensaMissionCompleteRequest,
  PensaMissionDeliveriesRequest,
  PensaMissionHandoff,
  PensaMissionNoteRequest,
  PensaMissionReopenRequest,
  PensaMissionStartRequest,
  PensaOperationStepResult,
  PensaOperationView,
  PensaOperationWork,
  PensaPlanDraft,
  PensaProjectListItem,
  PensaProjectRevision,
  PensaProjectView,
  PensaRolesRequest,
  PensaTeamArtItem,
  PensaTeamView,
} from '@sistemazero/core/pensa'
import type { CreationDownloadTicketView, PensaTeamCapabilitiesView } from '../lib/types'
import type { CallOpts, GatewayModule } from './gateway'

export type PensaProjectBase = Omit<PensaProjectView, 'availability' | 'nextAction'>
export type PensaContextFacts = PensaTeamCapabilitiesView & {
  gameTicket: CreationDownloadTicketView | null
  base: PensaProjectBase
}
export interface PensaFileTicket {
  id: string
  files: Array<{ source: string; destination: string }>
}
export type PensaProtectionAction =
  | { type: 'prepare'; id: string; baseRevisionId: string; saveRevision: string }
  | { type: 'commit'; id: string }
  | {
      type: 'restore_prepare'
      id: string
      checkpointId: string
      baseRevisionId: string
      saveRevision: string
    }
  | { type: 'restore_commit'; id: string }
  | { type: 'abort'; id: string }

export function createPensaClient(gw: Pick<GatewayModule, 'gatewayFetch' | 'gatewayFetchHmac'>) {
  const project = (id: string) => `/members/pensa/projects/${encodeURIComponent(id)}`
  const internal = (id: string) => `/members/internal/pensa/projects/${encodeURIComponent(id)}`
  const privateMission = (id: string) =>
    `/members/internal/pensa/missions/${encodeURIComponent(id)}`
  const publicProject = <T>(id: string, suffix = '', opts: CallOpts = {}) =>
    gw.gatewayFetch<T>(`${project(id)}${suffix}`, opts)
  return {
    pensaListProjects(status: 'active' | 'archived' = 'active') {
      return gw.gatewayFetch<PensaProjectListItem[]>('/members/pensa/projects', {
        query: { status },
      })
    },
    pensaCreateProject(input: PensaCreateProjectRequest) {
      return gw.gatewayFetch<PensaProjectBase>('/members/pensa/projects', {
        method: 'POST',
        body: input,
      })
    },
    pensaProjectView(actor: PensaActor, id: string, capabilities: PensaCapabilities) {
      return gw.gatewayFetchHmac<PensaProjectView>(`${internal(id)}/view`, {
        method: 'POST',
        body: { actor, capabilities },
      })
    },
    pensaUpdateProject(id: string, input: PensaMetadataRequest) {
      return publicProject<PensaProjectBase>(id, '', { method: 'PATCH', body: input })
    },
    pensaDeleteProject(id: string, requestId: string) {
      return publicProject<{ deleted: boolean }>(id, '', { method: 'DELETE', body: { requestId } })
    },
    pensaMessage(id: string, input: PensaMessageRequest) {
      return publicProject<PensaProjectBase>(id, '/messages', { method: 'POST', body: input })
    },
    pensaMessages(id: string, query: { limit?: number; cursor?: string } = {}) {
      return publicProject<PensaMessagePage>(id, '/messages', { query })
    },
    pensaOperation(id: string, operationId: string) {
      return publicProject<PensaOperationView>(id, `/operations/${encodeURIComponent(operationId)}`)
    },
    pensaCancelOperation(id: string, operationId: string, requestId: string) {
      return publicProject<{ cancelled: boolean }>(
        id,
        `/operations/${encodeURIComponent(operationId)}/cancel`,
        { method: 'POST', body: { requestId } },
      )
    },
    pensaRetryOperation(
      actor: PensaActor,
      id: string,
      operationId: string,
      requestId: string,
      capabilities: PensaCapabilities,
    ) {
      return gw.gatewayFetchHmac<{ ok: boolean }>(
        `${internal(id)}/operations/${encodeURIComponent(operationId)}/retry`,
        {
          method: 'POST',
          body: { actor, requestId, capabilities },
        },
      )
    },
    pensaDraft(id: string) {
      return publicProject<PensaPlanDraft | null>(id, '/draft')
    },
    pensaEditDraft(
      actor: PensaActor,
      id: string,
      input: PensaDraftEditRequest,
      capabilities: PensaCapabilities,
    ) {
      return gw.gatewayFetchHmac<PensaProjectBase>(`${internal(id)}/draft/edit`, {
        method: 'POST',
        body: { actor, input, capabilities },
      })
    },
    pensaAcceptDraft(
      actor: PensaActor,
      id: string,
      input: PensaDraftAcceptRequest,
      capabilities: PensaCapabilities,
    ) {
      return gw.gatewayFetchHmac<PensaProjectBase>(`${internal(id)}/draft/accept`, {
        method: 'POST',
        body: { actor, input, capabilities },
      })
    },
    pensaDiscardDraft(id: string, requestId: string) {
      return publicProject<{ discarded: boolean }>(id, '/draft', {
        method: 'DELETE',
        body: { requestId },
      })
    },
    pensaMissionContext(actor: PensaActor, id: string) {
      return gw.gatewayFetchHmac<{ projectId: string }>(`${privateMission(id)}/context`, {
        method: 'POST',
        body: { actor },
      })
    },
    pensaMissionHandoff(actor: PensaActor, id: string, capabilities: PensaCapabilities) {
      return gw.gatewayFetchHmac<PensaMissionHandoff>(`${privateMission(id)}/handoff`, {
        method: 'POST',
        body: { actor, capabilities },
      })
    },
    pensaStartMission(
      actor: PensaActor,
      id: string,
      input: PensaMissionStartRequest,
      capabilities: PensaCapabilities,
    ) {
      return gw.gatewayFetchHmac<PensaMissionHandoff>(`${privateMission(id)}/start`, {
        method: 'POST',
        body: { actor, input, capabilities },
      })
    },
    pensaCompleteMission(
      actor: PensaActor,
      id: string,
      input: PensaMissionCompleteRequest,
      capabilities: PensaCapabilities,
      inspection?: {
        creation: import('@sistemazero/core/pensa').PensaCreationRef
        installedExtensionIds: string[]
      },
    ) {
      return gw.gatewayFetchHmac<PensaMissionHandoff>(`${privateMission(id)}/complete`, {
        method: 'POST',
        body: { actor, input, capabilities, inspection },
      })
    },
    pensaReconfirmMission(
      actor: PensaActor,
      id: string,
      input: PensaMissionCompleteRequest,
      capabilities: PensaCapabilities,
      inspection?: {
        creation: import('@sistemazero/core/pensa').PensaCreationRef
        installedExtensionIds: string[]
      },
    ) {
      return gw.gatewayFetchHmac<PensaMissionHandoff>(`${privateMission(id)}/reconfirm`, {
        method: 'POST',
        body: { actor, input, capabilities, inspection },
      })
    },
    pensaReopenMission(
      actor: PensaActor,
      id: string,
      input: PensaMissionReopenRequest,
      capabilities: PensaCapabilities,
    ) {
      return gw.gatewayFetchHmac<PensaMissionHandoff>(`${privateMission(id)}/reopen`, {
        method: 'POST',
        body: { actor, input, capabilities },
      })
    },
    pensaMissionNote(
      actor: PensaActor,
      id: string,
      input: PensaMissionNoteRequest,
      capabilities: PensaCapabilities,
    ) {
      return gw.gatewayFetchHmac<PensaMissionHandoff>(`${privateMission(id)}/note`, {
        method: 'POST',
        body: { actor, input, capabilities },
      })
    },
    pensaMissionDeliveries(
      actor: PensaActor,
      id: string,
      input: PensaMissionDeliveriesRequest,
      capabilities: PensaCapabilities,
    ) {
      return gw.gatewayFetchHmac<PensaMissionHandoff>(`${privateMission(id)}/deliveries`, {
        method: 'POST',
        body: { actor, input, capabilities },
      })
    },
    pensaTeam(id: string) {
      return publicProject<PensaTeamView>(id, '/members')
    },
    pensaRoles(id: string, input: PensaRolesRequest) {
      return publicProject<PensaTeamView>(id, '/roles', { method: 'PUT', body: input })
    },
    pensaShareProject(id: string, requestId: string) {
      return publicProject<PensaTeamView>(id, '/share', { method: 'POST', body: { requestId } })
    },
    pensaUnshareProject(id: string, requestId: string) {
      return publicProject<PensaTeamView>(id, '/share', { method: 'DELETE', body: { requestId } })
    },
    pensaRemoveProjectMember(id: string, profileId: string, requestId: string) {
      return publicProject<{ removed: boolean }>(id, `/members/${encodeURIComponent(profileId)}`, {
        method: 'DELETE',
        body: { requestId },
      })
    },
    pensaJoinProject(input: PensaJoinRequest) {
      return gw.gatewayFetch<{ projectId: string }>('/members/pensa/projects/join', {
        method: 'POST',
        body: input,
      })
    },
    pensaTeamArt(id: string) {
      return publicProject<{ items: PensaTeamArtItem[] }>(id, '/team-art')
    },
    pensaTeamArtDownload(id: string, missionId: string, slotId: string) {
      return publicProject<CreationDownloadTicketView>(
        id,
        `/team-art/${encodeURIComponent(missionId)}/${encodeURIComponent(slotId)}/download`,
      )
    },
    pensaRevisions(id: string, cursor?: string) {
      return publicProject<{ items: PensaProjectRevision[]; nextCursor: string | null }>(
        id,
        '/revisions',
        { query: { cursor } },
      )
    },
    pensaCheckpoints(id: string) {
      return publicProject<PensaCheckpoint[]>(id, '/checkpoints')
    },
    pensaTeamCapabilities(actor: PensaActor, id: string) {
      return gw.gatewayFetchHmac<PensaContextFacts>(`${internal(id)}/context`, {
        method: 'POST',
        body: { actor },
      })
    },
    pensaProtect(
      actor: PensaActor,
      id: string,
      action: PensaProtectionAction,
      capabilities: PensaCapabilities,
    ) {
      return gw.gatewayFetchHmac<PensaFileTicket | PensaProjectBase>(`${internal(id)}/protect`, {
        method: 'POST',
        body: { actor, action, capabilities },
      })
    },
    privateNarration(
      actor: PensaActor,
      input: {
        type: 'claim' | 'commit' | 'fail'
        id: string
        chars: number
        leaseId: string
        projectId?: string
      },
    ) {
      return gw.gatewayFetchHmac<{ status: 'generate' | 'ready' | 'waiting'; key: string }>(
        '/members/internal/pensa/narrations',
        { method: 'POST', body: { actor, input } },
      )
    },
    pensaClaimOperation(
      actor: PensaActor,
      id: string,
      operationId: string,
      leaseId: string,
      capabilities: PensaCapabilities,
    ) {
      return gw.gatewayFetchHmac<{ work: PensaOperationWork | null }>(
        `${internal(id)}/operations/${encodeURIComponent(operationId)}/claim`,
        { method: 'POST', body: { actor, leaseId, capabilities } },
      )
    },
    pensaPublishOperation(
      actor: PensaActor,
      id: string,
      operationId: string,
      leaseId: string,
      result: PensaOperationStepResult,
      capabilities: PensaCapabilities,
    ) {
      return gw.gatewayFetchHmac<{ ok: true }>(
        `${internal(id)}/operations/${encodeURIComponent(operationId)}/publish`,
        { method: 'POST', body: { actor, leaseId, result, capabilities } },
      )
    },
    pensaFailOperation(
      actor: PensaActor,
      id: string,
      operationId: string,
      leaseId: string,
      message: string,
    ) {
      return gw.gatewayFetchHmac<{ ok: true }>(
        `${internal(id)}/operations/${encodeURIComponent(operationId)}/fail`,
        { method: 'POST', body: { actor, leaseId, message } },
      )
    },
    pensaRewardsWork() {
      return gw.gatewayFetchHmac<{ ok: true }>('/members/internal/pensa/rewards/work', {
        method: 'POST',
        body: {},
      })
    },
  }
}
export type PensaClient = ReturnType<typeof createPensaClient>
