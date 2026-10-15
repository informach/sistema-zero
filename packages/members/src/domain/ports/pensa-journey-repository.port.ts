import type {
  PensaFileTicket,
  PensaJourneyCommand,
  PensaJourneyListItem,
  PensaJourneyView,
  PensaOperation,
  PensaOperationStep,
  PensaProposal,
  PensaProtectionAction,
  PensaQuestionChoices,
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
  /** A pergunta do Zappy, com as respostas para tocar e o nome provisório do jogo (opcionais). */
  | {
      type: 'question'
      text: string
      choices?: PensaQuestionChoices
      workingTitle?: string | null
    }
  | { type: 'answer'; text: string }
  | { type: 'plan'; tasks: NewPensaTask[] }

/** Um item da lista com a dona (o serviço resolve o 1º nome dela e tira o id da resposta). */
export type PensaJourneyListRow = PensaJourneyListItem & { ownerProfileId: string }

export interface PensaJourneyRepository {
  delete(actor: PensaJourneyActor, projectId: string, now: Date): Promise<void>
  voice(actor: PensaJourneyActor, request: PensaVoiceRequest, now: Date): Promise<PensaVoiceResult>
  protect(
    actor: PensaJourneyActor,
    projectId: string,
    action: PensaProtectionAction,
    now: Date,
  ): Promise<PensaJourneyView | PensaFileTicket>
  list(actor: PensaJourneyActor, status: 'active' | 'archived'): Promise<PensaJourneyListRow[]>
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
  /** O nome que a criança deu ao jogo (só quem criou); daí em diante a IA não o troca mais. */
  rename(
    actor: PensaJourneyActor,
    projectId: string,
    name: string,
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
