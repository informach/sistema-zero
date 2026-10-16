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

export interface PensaMissionTarget {
  taskId: string
  destination: PensaDestination
  /** Present only when the server reports a committed Pro game for this plan. */
  studioProjectId?: string
}

export function pensaMissionTarget(
  task: { id: string; destination: PensaDestination },
  view: Pick<PensaJourneyView, 'project' | 'studioAuthoring'>,
): PensaMissionTarget {
  return {
    taskId: task.id,
    destination: task.destination,
    ...(task.destination === 'studio' && view.studioAuthoring === 'code'
      ? { studioProjectId: `pensa-${view.project.id.replaceAll('-', '')}` }
      : {}),
  }
}

/** Display-only instructions after conversion. They never replace persisted progress IDs. */
export function pensaCodeTransitionInstructions() {
  return [
    {
      id: 'code-open',
      text: 'Abra a lista de arquivos e localize o script do jogo.',
      hint: 'Veja em index.html quais scripts o jogo usa. Na conversão, scripts globais ficam em public/ e módulos em src/converted/.',
      required: false,
    },
    {
      id: 'code-edit',
      text: 'Localize no código a parte ligada ao objetivo desta missão.',
      hint: 'Altere uma parte de cada vez. Se precisar, selecione o trecho e use Explicar seleção com Zappy Pro, ou peça ajuda no Pensa.',
      required: false,
    },
    {
      id: 'code-test',
      text: 'Execute o jogo na pré-visualização e faça o teste desta missão.',
      hint: 'Compare o resultado com o critério abaixo. Corrija o código e teste de novo antes de concluir.',
      required: false,
    },
  ]
}
export interface PensaJourneyActor {
  profileId: string
  accountId: string
  privileged: boolean
}

export interface PensaCapabilitySnapshot {
  profileId: string
  rank: string
  studio: boolean
  /** Existing snapshots without this field were planned for blocks. */
  studioAuthoring?: 'blocks' | 'code'
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

/**
 * Do que trata a pergunta do Zappy (o selo em cima dela). Só o que muda a primeira missão vira
 * pergunta: cor, som, cenário e nomes o Zappy decide e mostra como sugestão dele.
 */
export const PENSA_QUESTION_TOPICS = [
  'action',
  'goal',
  'challenge',
  'controls',
  'world',
  'dimension',
] as const
export type PensaQuestionTopic = (typeof PENSA_QUESTION_TOPICS)[number]
/** Uma resposta pronta: o rótulo vai para o campo; a descrição diz o que muda no jogo. */
export interface PensaQuestionOption {
  label: string
  description: string
}
export interface PensaQuestionChoices {
  about: PensaQuestionTopic
  options: PensaQuestionOption[]
}

export interface PensaJourneyMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  at: string
  revision: number
  final: boolean
  /** Só nas perguntas do Zappy (15/10/2026): as respostas para tocar. Mensagens antigas não têm. */
  choices?: PensaQuestionChoices
}

/**
 * Quantas perguntas o Zappy ainda pode fazer antes de propor. Na primeira versão são duas; com o
 * jogo já construído (uma versão guardada ou resultados prontos) o jogo responde quase tudo e
 * sobra uma. Passado o teto, o planejador é obrigado a propor e completar o resto como sugestão.
 */
export function pensaQuestionsLeft(journey: PensaJourney): number {
  const limit = journey.checkpoint || journey.builtResults?.length ? 1 : 2
  return Math.max(0, limit - (journey.questionsAsked ?? 0))
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
  /** Perguntas do Zappy desde a última proposta (a régua é `pensaQuestionsLeft`). */
  questionsAsked?: number
  /**
   * O nome que o Zappy deu ao jogo junto com a primeira pergunta, antes da proposta. Enquanto o
   * jogo ainda se chamar assim, o título da proposta pode trocá-lo; renomeado, o nome é da criança.
   */
  workingTitle?: string | null
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

/**
 * EQUIPE no v2 (14/10/2026). Duas funções: `code` (Programação, o Estúdio: UMA pessoa, a dona
 * por padrão; o jogo mora no Estúdio dela) e `art` (Artes, Pinta e Molda: zero ou mais). Sem
 * ninguém nas artes, quem programa também desenha. Os papéis que viajam são sempre os EFETIVOS
 * (`effectivePensaRoles`), nunca as linhas cruas do banco.
 */
export type PensaTeamRole = 'code' | 'art'
export interface PensaTeamRoles {
  code: string
  art: string[]
}
export interface PensaJourneyTeam {
  viewerProfileId: string
  ownerProfileId: string
  /** Quem ENTROU (a dona não conta): 0 = plano só da dona. */
  memberCount: number
  shareEnabled: boolean
  roles: PensaTeamRoles
}
export interface PensaTeamPerson {
  profileId: string
  /** 1º nome best-effort (sem nome = "Colega" na tela). */
  firstName: string | null
  photoUrl: string | null
  owner: boolean
  /** `null` para a dona (ela não "entrou"). */
  joinedAt: string | null
}
export interface PensaJourneyTeamView {
  viewerProfileId: string
  role: 'owner' | 'member'
  /** CRU (`AAAAAB`), só para a dona; `null` para membro ou com o convite desligado. */
  shareCode: string | null
  maxMembers: number
  roles: PensaTeamRoles
  people: PensaTeamPerson[]
  /** O jogo já começou no Estúdio de quem programa: trocar essa função não é mais possível. */
  codeLocked: boolean
}
/** Uma arte ENTREGUE numa missão do plano por outra pessoa da equipe ("Trazer da equipe"). */
export interface PensaTeamArtItem {
  taskId: string
  title: string
  tool: 'pinta' | 'molda'
  assetId: string
  assetName: string | null
  /** O kind GUARDADO na conta (`pixel-sprite`, `model`…), ou `null` se a nuvem não disse. */
  assetKind: string | null
  byProfileId: string
  completedAt: string
  /** Carimbo e revisão da criação na conta da artista: mudou = tem versão nova para trazer. */
  updatedAt: string
  revision: number
}

/** Papéis efetivos: ids fora da equipe caem; sem programação válida, a dona; sem artes, quem programa. */
export function effectivePensaRoles(input: {
  ownerProfileId: string
  memberProfileIds: readonly string[]
  code?: string | null
  art?: readonly string[]
}): PensaTeamRoles {
  const team = new Set([input.ownerProfileId, ...input.memberProfileIds])
  const code = input.code && team.has(input.code) ? input.code : input.ownerProfileId
  const art = [...new Set((input.art ?? []).filter((id) => team.has(id)))]
  return { code, art: art.length ? art : [code] }
}

/** Quem pode trabalhar numa missão: o Estúdio é de quem programa; Pinta e Molda, das artes. */
export function pensaMissionWorkers(
  destination: PensaDestination,
  roles: PensaTeamRoles,
): string[] {
  return destination === 'studio' ? [roles.code] : roles.art
}

export function canWorkOnPensaMission(
  destination: PensaDestination,
  profileId: string,
  roles: PensaTeamRoles,
): boolean {
  return pensaMissionWorkers(destination, roles).includes(profileId)
}

export interface PensaJourneyView {
  /** Mode of the programmer's committed Studio creation, read by the server. */
  studioAuthoring?: 'blocks' | 'code'
  project: { id: string; name: string; status: 'active' | 'archived' }
  journey: PensaJourney
  operation: PensaOperation | null
  cycles: Array<{ id: string; number: number }>
  checkpoints?: PensaCheckpointRef[]
  /** Ausentes = servidor anterior à equipe: plano só da dona, e ela faz tudo. */
  role?: 'owner' | 'member'
  team?: PensaJourneyTeam
}

export interface PensaJourneyListItem {
  id: string
  name: string
  status: 'active' | 'archived'
  cycleNumber: number
  stage: PensaZeroStage
  lastInteractionAt: string
  paused: boolean
  role?: 'owner' | 'member'
  team?: { memberCount: number; ownerFirstName: string | null }
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
      // Pausado e encerrado: retomar só tira a pausa. Sem isto, "Continuar de onde parei" numa
      // versão pronta a levava de volta para a construção e a conclusão se perdia.
      if (current.stage === 'closed' && !current.paused) {
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
      // As perguntas e o nome provisório eram da conversa que acabou: a próxima (um "Adaptar meu
      // caminho") começa com o teto inteiro, mesmo quando a proposta escolhida é a anterior.
      next.questionsAsked = 0
      next.workingTitle = null
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
      next.questionsAsked = 0
      next.workingTitle = null
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

export interface PensaTeamMissionProgress extends PensaMissionProgress {
  destination: PensaDestination
  /** Quem começou a missão (com mais de uma artista, quem começa fica com ela). */
  assigneeProfileId: string | null
}

/**
 * A próxima missão DE UMA PESSOA da equipe. `mine` = a dela (mesma régua do `nextPensaMission`,
 * só entre as que ela pode fazer e que ninguém mais começou). Sem nenhuma, `waitingOn` diz qual
 * missão do caminho está na frente e quem pode fazê-la ("Esperando a arte da Bia").
 */
export function nextPensaMissionFor(
  missions: readonly PensaTeamMissionProgress[],
  profileId: string,
  roles: PensaTeamRoles,
): { mine: string | null; waitingOn: { missionId: string; workers: string[] } | null } {
  const completed = new Set(
    missions.filter((m) => m.status === 'completed' && m.evidenceCurrent).map((m) => m.id),
  )
  const eligible = missions.filter(
    (m) => m.status !== 'completed' && m.dependencies.every((id) => completed.has(id)),
  )
  const mineList = eligible.filter(
    (m) =>
      canWorkOnPensaMission(m.destination, profileId, roles) &&
      (!m.assigneeProfileId || m.assigneeProfileId === profileId || m.status === 'planned'),
  )
  const mine = (mineList.find((m) => m.status === 'in_progress') ?? mineList[0])?.id ?? null
  if (mine) return { mine, waitingOn: null }
  const next = nextPensaMission(missions)
  const blocking = missions.find((m) => m.id === next)
  if (!blocking) return { mine: null, waitingOn: null }
  return {
    mine: null,
    waitingOn: {
      missionId: blocking.id,
      workers:
        blocking.assigneeProfileId && blocking.status !== 'planned'
          ? [blocking.assigneeProfileId]
          : pensaMissionWorkers(blocking.destination, roles),
    },
  }
}

export const PENSA_ZERO_LABELS: Record<PensaZeroStage, { title: string; action: string }> = {
  z: { title: 'Zerar a bagunça', action: 'Conte sua ideia' },
  e: { title: 'Enxergar o jogo', action: 'Veja o começo do jogo' },
  r: { title: 'Realizar por partes', action: 'Vamos construir' },
  o: { title: 'Observar e melhorar', action: 'Vamos experimentar' },
}
