import type {
  PensaJourneyCommand,
  PensaProposal,
  PensaProtectionAction,
  PensaVoiceRequest,
} from '@sistemazero/core/pensa'
import { validateTaskPlan } from '../../domain/pensa/task-plan'
import type {
  PensaGenerationStart,
  PensaJourneyActor,
  PensaJourneyRepository,
  PensaStepResult,
} from '../../domain/ports/pensa-journey-repository.port'
import { ValidationError } from '../../domain/shared/errors'

function checkProposal(proposal: PensaProposal, actor: PensaJourneyActor): void {
  const caps = proposal.capabilities
  if (caps.profileId !== actor.profileId || !caps.dimensions.includes(proposal.dimension))
    throw new ValidationError('A proposta não corresponde aos recursos deste perfil.')
  const previous = new Set<string>()
  for (const mission of proposal.missions) {
    if (previous.has(mission.key) || mission.dependencies.some((key) => !previous.has(key)))
      throw new ValidationError('As missões precisam de uma ordem possível.')
    if (
      !caps[mission.destination] ||
      mission.blockIds.some((block) => !caps.blockIds.includes(block)) ||
      mission.extensionIds.some((extension) => !caps.extensionIds.includes(extension)) ||
      mission.toolIds.some((tool) => !caps.moldaTools.includes(tool))
    )
      throw new ValidationError('Uma missão usa um recurso que não está disponível.')
    if (mission.destination !== 'studio' && !mission.asset)
      throw new ValidationError('A criação precisa indicar o resultado esperado.')
    if (mission.asset?.source === 'existing' && !mission.asset.creationId)
      throw new ValidationError('A criação reutilizada precisa existir.')
    previous.add(mission.key)
  }
}

export class PensaJourneyService {
  constructor(
    private readonly repo: PensaJourneyRepository,
    private readonly clock: () => Date,
  ) {}
  list(actor: PensaJourneyActor, status: 'active' | 'archived') {
    return this.repo.list(actor, status)
  }
  delete(actor: PensaJourneyActor, projectId: string) {
    return this.repo.delete(actor, projectId, this.clock())
  }
  protect(actor: PensaJourneyActor, projectId: string, action: PensaProtectionAction) {
    return this.repo.protect(actor, projectId, action, this.clock())
  }
  voice(actor: PensaJourneyActor, request: PensaVoiceRequest) {
    return this.repo.voice(actor, request, this.clock())
  }
  create(actor: PensaJourneyActor, projectId: string) {
    return this.repo.create(actor, projectId, this.clock())
  }
  get(actor: PensaJourneyActor, projectId: string) {
    return this.repo.get(actor, projectId)
  }
  command(
    actor: PensaJourneyActor,
    projectId: string,
    revision: number,
    command: PensaJourneyCommand,
  ) {
    return this.repo.command(actor, projectId, revision, command, this.clock())
  }
  archive(actor: PensaJourneyActor, projectId: string, status: 'active' | 'archived') {
    return this.repo.archive(actor, projectId, status, this.clock())
  }
  start(actor: PensaJourneyActor, projectId: string, input: PensaGenerationStart) {
    return this.repo.start(actor, projectId, input, this.clock())
  }
  claim(actor: PensaJourneyActor, projectId: string, operationId: string, leaseId: string) {
    return this.repo.claim(actor, projectId, operationId, leaseId, this.clock())
  }
  async publish(
    actor: PensaJourneyActor,
    projectId: string,
    operationId: string,
    leaseId: string,
    result: PensaStepResult,
  ) {
    if (result.type === 'proposal') checkProposal(result.proposal, actor)
    if (result.type === 'plan') {
      const now = this.clock()
      const validation = validateTaskPlan(
        result.tasks.map((task) => ({
          ...task,
          cycleId: '',
          revision: 1,
          supersedesTaskId: null,
          archivedAt: null,
          createdAt: now,
          updatedAt: now,
          progress: {
            status: 'planned',
            completedStepIds: [],
            completedCriteriaIds: [],
            outputRef: null,
            startedAt: null,
            completedAt: null,
            updatedAt: null,
          },
        })),
      )
      if (!validation.ok)
        throw new ValidationError(validation.issues[0]?.message ?? 'Plano inválido')
      if (
        result.tasks.some(
          (task) =>
            task.guide.steps.some((step) => step.required) ||
            task.destination !== task.context.kind,
        )
      )
        throw new ValidationError('O guia deve orientar sem exigir marcar cada passo.')
    }
    return this.repo.publish(actor, projectId, operationId, leaseId, result, this.clock())
  }
  fail(
    actor: PensaJourneyActor,
    projectId: string,
    operationId: string,
    leaseId: string,
    message: string,
  ) {
    return this.repo.fail(actor, projectId, operationId, leaseId, message, this.clock())
  }
  cancel(actor: PensaJourneyActor, projectId: string) {
    return this.repo.cancel(actor, projectId, this.clock())
  }
}
