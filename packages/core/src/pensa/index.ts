/** Contracts shared by the planner, host and persistence. No browser or model dependencies. */
export type PensaZeroStage = 'z' | 'e' | 'r' | 'o'
export type PensaJourneyStage =
  | 'idea'
  | 'proposal'
  | 'preparing'
  | 'building'
  | 'observing'
  | 'closed'
export type PensaDestination = 'studio' | 'pinta' | 'molda'
export interface PensaJourneyActor {
  profileId: string
  accountId: string
  privileged: boolean
}

export interface PensaCapabilitySnapshot {
  profileId: string
  rank: string
  studio: boolean
  pinta: boolean
  molda: boolean
  dimensions: Array<'2d' | '3d'>
  blockIds: string[]
  extensionIds: string[]
  moldaTools: string[]
  tutor: boolean
  fingerprint: string
}

export interface PensaKnowledgeReference {
  kind: 'lesson' | 'help' | 'manual'
  id: string
  title: string
  href: string | null
}

export interface PensaIdea {
  id: string
  text: string
  origin: 'child' | 'zappy'
}

export interface PensaAssetNeed {
  id: string
  kind: 'sprite' | 'background' | 'tileset' | 'tilemap' | 'model' | 'texture' | 'sky'
  source: 'new' | 'existing' | 'editor'
  /** Existing creations are authorized by the host, never resolved from a model-supplied URL. */
  creationId: string | null
  description: string
}

export interface PensaBlueprintMission {
  key: string
  destination: PensaDestination
  title: string
  result: string
  dependencies: string[]
  blockIds: string[]
  extensionIds: string[]
  mechanicIds: string[]
  toolIds: string[]
  asset: PensaAssetNeed | null
}

export interface PensaProposal {
  id: string
  title: string
  summary: string
  firstResult: string
  essentials: string[]
  suggestions: string[]
  later: PensaIdea[]
  dimension: '2d' | '3d'
  missions: PensaBlueprintMission[]
  test: { action: string; expected: string }
  references: PensaKnowledgeReference[]
  capabilities: PensaCapabilitySnapshot
}

export interface PensaJourneyMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  at: string
  revision: number
  final: boolean
}

export interface PensaObservedTest {
  id: string
  result: 'met' | 'needs_adjustment' | 'inconclusive'
  source: 'child' | 'runtime'
  note: string
  creationId: string
  saveRevision: string
  at: string
}

export interface PensaCheckpointRef {
  id: string
  creationId: string
  saveRevision: string
  planRevision: number
  cycleId: string
  createdAt: string
}

export interface PensaJourney {
  contractVersion: 2
  projectId: string
  cycleId: string
  revision: number
  stage: PensaJourneyStage
  paused: boolean
  /** The original narrative is distinct from model suggestions and editable proposals. */
  intent: string
  builtResults?: string[]
  revising?: boolean
  messages: PensaJourneyMessage[]
  proposal: PensaProposal | null
  acceptedProposalId: string | null
  backlog: PensaIdea[]
  missionIds: string[]
  tests: PensaObservedTest[]
  testSessionStart?: number
  checkpoint: PensaCheckpointRef | null
  operationId: string | null
  closedReason: 'met' | 'incomplete' | null
  closedFrom: Exclude<PensaJourneyStage, 'closed'> | null
  lastInteractionAt: string
}

export type PensaNarratableRef =
  | {
      origin: 'pensa_message'
      projectId: string
      cycleId: string
      messageId: string
      revision: number
    }
  | { origin: 'pensa_proposal'; projectId: string; cycleId: string; proposalId: string }
  | { origin: 'pensa_guide'; taskId: string; revision: number; stepId: string }
  | { origin: 'studio_message'; projectId: string; messageId: string }

export type PensaOperationKind = 'planning' | 'help' | 'repair' | 'checkpoint' | 'restore'
export type PensaOperationStep =
  | 'propose'
  | 'review'
  | 'choice'
  | 'guides'
  | 'answer'
  | 'copy'
  | 'publish'
export interface PensaOperation {
  id: string
  projectId: string
  cycleId: string
  kind: PensaOperationKind
  step: PensaOperationStep
  status: 'queued' | 'running' | 'waiting' | 'succeeded' | 'failed' | 'cancelled'
  inputRevision: number
  attempts: number
  error: string | null
  createdAt: string
  updatedAt: string
}

export interface PensaJourneyView {
  project: { id: string; name: string; status: 'active' | 'archived' }
  journey: PensaJourney
  operation: PensaOperation | null
  cycles: Array<{ id: string; number: number }>
  checkpoints?: PensaCheckpointRef[]
}

export interface PensaJourneyListItem {
  id: string
  name: string
  status: 'active' | 'archived'
  cycleNumber: number
  stage: PensaZeroStage
  lastInteractionAt: string
  paused: boolean
}

export interface PensaFileTicket {
  id: string
  files: Array<{ source: string; destination: string }>
}
export interface PensaVoiceRequest {
  type: 'claim' | 'commit' | 'fail'
  id: string
  chars: number
  leaseId: string
  projectId?: string
}
export interface PensaVoiceResult {
  status: 'generate' | 'ready' | 'waiting'
  key: string
}
export type PensaProtectionAction =
  | { type: 'prepare'; expectedRevision: number; id: string }
  | { type: 'commit'; id: string }
  | { type: 'restore_prepare'; expectedRevision: number; id: string; checkpointId: string }
  | { type: 'restore_commit'; id: string }
  | { type: 'increment'; expectedRevision: number }

export type PensaJourneyCommand =
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'retry' }
  | { type: 'accept'; proposalId: string }
  | { type: 'observe' }
  | { type: 'record_test'; test: PensaObservedTest }
  | { type: 'repair' }
  | { type: 'revise' }
  | { type: 'close'; reason: 'met' | 'incomplete' }
  | { type: 'keep_idea'; idea: PensaIdea }
  | { type: 'remove_idea'; ideaId: string }

export class PensaJourneyConflict extends Error {
  constructor(message = 'Seu jogo mudou em outra tela. Abra a versão atual para continuar.') {
    super(message)
    this.name = 'PensaJourneyConflict'
  }
}

export function createPensaJourney(projectId: string, cycleId: string, now: string): PensaJourney {
  return {
    contractVersion: 2,
    projectId,
    cycleId,
    revision: 0,
    stage: 'idea',
    paused: false,
    intent: '',
    messages: [],
    proposal: null,
    acceptedProposalId: null,
    backlog: [],
    missionIds: [],
    tests: [],
    checkpoint: null,
    operationId: null,
    closedReason: null,
    closedFrom: null,
    lastInteractionAt: now,
  }
}

/** Pausing and closing never promote an unfinished game to the observation stage. */
export function pensaZeroStage(journey: PensaJourney): PensaZeroStage {
  const stage = journey.stage === 'closed' ? (journey.closedFrom ?? 'idea') : journey.stage
  if (stage === 'idea') return 'z'
  if (stage === 'proposal' || stage === 'preparing') return 'e'
  return stage === 'observing' ? 'o' : 'r'
}

export function applyPensaCommand(
  current: PensaJourney,
  expectedRevision: number,
  command: PensaJourneyCommand,
  now: string,
): PensaJourney {
  if (current.revision !== expectedRevision) throw new PensaJourneyConflict()
  const next: PensaJourney = { ...current, revision: current.revision + 1, lastInteractionAt: now }
  switch (command.type) {
    case 'pause':
      next.paused = true
      break
    case 'resume':
      next.paused = false
      if (current.stage === 'closed') {
        next.stage = current.closedReason === 'met' ? 'building' : (current.closedFrom ?? 'idea')
        next.closedReason = null
        next.closedFrom = null
        if (current.closedReason === 'met') next.testSessionStart = current.tests.length
      }
      break
    case 'retry':
      if (!current.operationId) throw new PensaJourneyConflict('Não há preparação para retomar.')
      next.paused = false
      break
    case 'accept':
      if (current.stage !== 'proposal' || current.proposal?.id !== command.proposalId)
        throw new PensaJourneyConflict('A proposta mudou. Veja a versão atual antes de escolher.')
      next.acceptedProposalId = command.proposalId
      next.stage = 'preparing'
      next.paused = false
      break
    case 'observe':
      if (!['building', 'observing'].includes(current.stage) || !current.missionIds.length)
        throw new PensaJourneyConflict('Seu caminho ainda não está pronto para este teste.')
      next.stage = 'observing'
      break
    case 'record_test':
      if (current.stage !== 'observing' || !command.test.saveRevision || !command.test.creationId)
        throw new PensaJourneyConflict('Salve seu jogo antes de registrar o teste desta versão.')
      if (current.tests.some((test) => test.id === command.test.id)) return current
      next.tests = [...current.tests, command.test]
      break
    case 'repair':
      if (current.stage !== 'observing') throw new PensaJourneyConflict()
      next.stage = 'building'
      break
    case 'revise':
      if (!['building', 'observing', 'closed'].includes(current.stage) || current.operationId)
        throw new PensaJourneyConflict(
          'Termine ou cancele a preparação antes de adaptar o caminho.',
        )
      next.stage = 'idea'
      next.revising = true
      next.testSessionStart = current.tests.length
      next.paused = false
      next.closedFrom = null
      next.closedReason = null
      next.acceptedProposalId = null
      break
    case 'close':
      if (current.operationId || current.stage === 'preparing' || current.stage === 'closed')
        throw new PensaJourneyConflict('A preparação ainda está em andamento. Você pode pausar.')
      if (
        command.reason === 'met' &&
        (current.stage !== 'observing' ||
          current.tests.length <= (current.testSessionStart ?? 0) ||
          current.tests.at(-1)?.result !== 'met' ||
          !current.checkpoint ||
          current.checkpoint.saveRevision !== current.tests.at(-1)?.saveRevision ||
          current.checkpoint.creationId !== current.tests.at(-1)?.creationId ||
          current.checkpoint.cycleId !== current.cycleId)
      )
        throw new PensaJourneyConflict('Experimente e guarde esta versão antes de concluir.')
      next.closedFrom = current.stage
      next.stage = 'closed'
      next.closedReason = command.reason
      break
    case 'keep_idea':
      if (
        !command.idea.text.trim() ||
        command.idea.text.length > 2000 ||
        current.backlog.length >= 80
      )
        throw new PensaJourneyConflict('Guarde uma ideia curta de cada vez.')
      next.backlog = [
        ...current.backlog.filter((idea) => idea.id !== command.idea.id),
        command.idea,
      ]
      break
    case 'remove_idea':
      next.backlog = current.backlog.filter((idea) => idea.id !== command.ideaId)
      break
  }
  return next
}

export interface PensaMissionProgress {
  id: string
  dependencies: string[]
  status: 'planned' | 'in_progress' | 'completed'
  /** Historical completion is not sufficient after a restore or incompatible edit. */
  evidenceCurrent: boolean
}

export function nextPensaMission(missions: readonly PensaMissionProgress[]): string | null {
  const completed = new Set(
    missions.filter((m) => m.status === 'completed' && m.evidenceCurrent).map((m) => m.id),
  )
  const eligible = missions.filter(
    (m) => m.status !== 'completed' && m.dependencies.every((id) => completed.has(id)),
  )
  return (eligible.find((m) => m.status === 'in_progress') ?? eligible[0])?.id ?? null
}

export const PENSA_ZERO_LABELS: Record<PensaZeroStage, { title: string; action: string }> = {
  z: { title: 'Zerar a bagunça', action: 'Conte sua ideia' },
  e: { title: 'Enxergar o jogo', action: 'Veja o começo do jogo' },
  r: { title: 'Realizar por partes', action: 'Vamos construir' },
  o: { title: 'Observar e melhorar', action: 'Vamos experimentar' },
}
