import 'server-only'
import type {
  PensaFileTicket,
  PensaJourneyActor,
  PensaJourneyCommand,
  PensaJourneyListItem,
  PensaJourneyTeamView,
  PensaJourneyView,
  PensaOperation,
  PensaOperationStep,
  PensaProtectionAction,
  PensaTeamRoles,
  PensaVoiceRequest,
  PensaVoiceResult,
} from '@sistemazero/core/pensa'
import type {
  CreationDownloadTicketView,
  PensaTeamArtListView,
  PensaTeamCapabilitiesView,
} from '../lib/types'
import type { GatewayModule } from './gateway'

export interface PensaWork extends PensaOperation {
  input: Record<string, unknown>
  output: Record<string, unknown>
  leaseId: string
}

export function createPensaJourneyClient(gw: GatewayModule) {
  const project = (id: string) => `/members/pensa/v2/projects/${encodeURIComponent(id)}`
  const internal = (projectId: string) =>
    `/members/internal/pensa/v2/projects/${encodeURIComponent(projectId)}`
  const operation = (projectId: string, operationId: string) =>
    `${internal(projectId)}/operations/${encodeURIComponent(operationId)}`
  return {
    privateNarration(actor: PensaJourneyActor, input: PensaVoiceRequest) {
      return gw.gatewayFetchHmac<PensaVoiceResult>('/members/internal/pensa/v2/narrations', {
        method: 'POST',
        body: { actor, input },
      })
    },
    pensaJourneyProtect(
      actor: PensaJourneyActor,
      projectId: string,
      action: PensaProtectionAction,
    ) {
      return gw.gatewayFetchHmac<PensaJourneyView | PensaFileTicket>(
        `${internal(projectId)}/protect`,
        { method: 'POST', body: { actor, action } },
      )
    },
    pensaJourneyList(status: 'active' | 'archived' = 'active') {
      return gw.gatewayFetch<PensaJourneyListItem[]>('/members/pensa/v2/projects', {
        query: { status },
      })
    },
    pensaJourneyCreate(id: string) {
      return gw.gatewayFetch<PensaJourneyView>('/members/pensa/v2/projects', {
        method: 'POST',
        body: { id },
      })
    },
    pensaJourneyGet(id: string) {
      return gw.gatewayFetch<PensaJourneyView>(project(id))
    },
    pensaJourneyDelete(id: string) {
      return gw.gatewayFetch<{ deleted: boolean }>(project(id), { method: 'DELETE' })
    },
    pensaJourneyCommand(id: string, expectedRevision: number, command: PensaJourneyCommand) {
      return gw.gatewayFetch<PensaJourneyView>(`${project(id)}/command`, {
        method: 'POST',
        body: { expectedRevision, command },
      })
    },
    pensaJourneyArchive(id: string, status: 'active' | 'archived') {
      return gw.gatewayFetch<PensaJourneyView>(project(id), { method: 'PATCH', body: { status } })
    },
    pensaJourneyStart(
      actor: PensaJourneyActor,
      projectId: string,
      input: {
        id: string
        expectedRevision: number
        message: string
        kind: 'planning' | 'help' | 'repair'
        context: Record<string, unknown>
      },
    ) {
      return gw.gatewayFetchHmac<PensaJourneyView>(`${internal(projectId)}/start`, {
        method: 'POST',
        body: { actor, input },
      })
    },
    pensaJourneyCancel(id: string) {
      return gw.gatewayFetch<PensaJourneyView>(`${project(id)}/cancel`, { method: 'POST' })
    },
    // ── Equipe do v2 (14/10/2026). Código, entrada, saída e tirar alguém seguem nas rotas
    // CLÁSSICAS (`pensaShareProject`, `pensaJoinProject`, `pensaRemoveProjectMember`…). ──
    /** Pessoas, papéis efetivos, `codeLocked` e o código cru (só para a dona). */
    pensaJourneyTeam(id: string) {
      return gw.gatewayFetch<PensaJourneyTeamView>(`${project(id)}/team`)
    },
    /** A dona define quem programa e quem faz as artes; devolve a view atualizada. */
    pensaJourneyRoles(id: string, roles: PensaTeamRoles) {
      return gw.gatewayFetch<PensaJourneyView>(`${project(id)}/roles`, {
        method: 'PUT',
        body: roles,
      })
    },
    /** Os recursos de cada pessoa da equipe: SÓ o BFF lê (o snapshot do plano em equipe). */
    pensaJourneyTeamCapabilities(id: string) {
      return gw.gatewayFetch<PensaTeamCapabilitiesView>(`${project(id)}/team-capabilities`)
    },
    /** As artes que outra pessoa entregou nas missões do plano ("Trazer da equipe"). */
    pensaJourneyTeamArt(id: string) {
      return gw.gatewayFetch<PensaTeamArtListView>(`${project(id)}/team-art`)
    },
    /** O bilhete da criação de quem concluiu a missão de arte (o BFF assina o GET no R2). */
    pensaJourneyTeamArtDownload(id: string, taskId: string) {
      return gw.gatewayFetch<CreationDownloadTicketView>(
        `${project(id)}/team-art/${encodeURIComponent(taskId)}/download`,
      )
    },
    pensaJourneyClaim(
      actor: PensaJourneyActor,
      projectId: string,
      operationId: string,
      leaseId: string,
    ) {
      return gw.gatewayFetchHmac<{ work: PensaWork | null }>(
        `${operation(projectId, operationId)}/claim`,
        { method: 'POST', body: { actor, leaseId } },
      )
    },
    pensaJourneyPublish(
      actor: PensaJourneyActor,
      projectId: string,
      operationId: string,
      leaseId: string,
      result: { type: string; step?: PensaOperationStep; [key: string]: unknown },
    ) {
      return gw.gatewayFetchHmac<{ ok: true }>(`${operation(projectId, operationId)}/publish`, {
        method: 'POST',
        body: { actor, leaseId, result },
      })
    },
    pensaJourneyFail(
      actor: PensaJourneyActor,
      projectId: string,
      operationId: string,
      leaseId: string,
      message: string,
    ) {
      return gw.gatewayFetchHmac<{ ok: true }>(`${operation(projectId, operationId)}/fail`, {
        method: 'POST',
        body: { actor, leaseId, message },
      })
    },
  }
}
