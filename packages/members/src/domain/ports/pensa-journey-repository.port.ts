import type {
  PensaFileTicket,
  PensaJourneyCommand,
  PensaJourneyListItem,
  PensaJourneyView,
  PensaOperation,
  PensaOperationStep,
  PensaProposal,
  PensaProtectionAction,
  PensaVoiceRequest,
  PensaVoiceResult,
} from '@sistemazero/core/pensa'
import type { NewPensaTask } from './pensa-repository.port'

export interface PensaJourneyActor {
  profileId: string
  accountId: string
  privileged: boolean
}

export interface PensaGenerationStart {
  id: string
  expectedRevision: number
  message: string
  kind: 'planning' | 'help' | 'repair'
  context: Record<string, unknown>
}

export interface PensaOperationWork extends PensaOperation {
  input: Record<string, unknown>
  output: Record<string, unknown>
  leaseId: string
}

export type PensaStepResult =
  | { type: 'step'; step: PensaOperationStep; output: Record<string, unknown> }
  | { type: 'proposal'; proposal: PensaProposal }
  | { type: 'question'; text: string }
  | { type: 'answer'; text: string }
  | { type: 'plan'; tasks: NewPensaTask[] }

export interface PensaJourneyRepository {
  delete(actor: PensaJourneyActor, projectId: string, now: Date): Promise<void>
  voice(actor: PensaJourneyActor, request: PensaVoiceRequest, now: Date): Promise<PensaVoiceResult>
  protect(
    actor: PensaJourneyActor,
    projectId: string,
    action: PensaProtectionAction,
    now: Date,
  ): Promise<PensaJourneyView | PensaFileTicket>
  list(actor: PensaJourneyActor, status: 'active' | 'archived'): Promise<PensaJourneyListItem[]>
  create(actor: PensaJourneyActor, projectId: string, now: Date): Promise<PensaJourneyView>
  get(actor: PensaJourneyActor, projectId: string): Promise<PensaJourneyView>
  command(
    actor: PensaJourneyActor,
    projectId: string,
    expectedRevision: number,
    command: PensaJourneyCommand,
    now: Date,
  ): Promise<PensaJourneyView>
  archive(
    actor: PensaJourneyActor,
    projectId: string,
    status: 'active' | 'archived',
    now: Date,
  ): Promise<PensaJourneyView>
  start(
    actor: PensaJourneyActor,
    projectId: string,
    input: PensaGenerationStart,
    now: Date,
  ): Promise<PensaJourneyView>
  claim(
    actor: PensaJourneyActor,
    projectId: string,
    operationId: string,
    leaseId: string,
    now: Date,
  ): Promise<PensaOperationWork | null>
  publish(
    actor: PensaJourneyActor,
    projectId: string,
    operationId: string,
    leaseId: string,
    result: PensaStepResult,
    now: Date,
  ): Promise<void>
  fail(
    actor: PensaJourneyActor,
    projectId: string,
    operationId: string,
    leaseId: string,
    message: string,
    now: Date,
  ): Promise<void>
  cancel(actor: PensaJourneyActor, projectId: string, now: Date): Promise<PensaJourneyView>
}
