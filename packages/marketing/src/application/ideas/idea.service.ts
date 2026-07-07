import type { Idea, IdeaStatus } from '../../domain/idea/idea'
import { IdeaNotFoundError, InvalidIdeaStatusChangeError } from '../../domain/marketing-errors'
import type { IdeaRepository } from '../../domain/ports/idea-repository.port'
import type { Actor } from '../actor'
import { type IdeaView, toIdeaView } from '../mappers/views'

export interface CreateIdeaInput {
  title: string
  notes?: string | null
  source?: string | null
  potential?: number | null
  complexity?: string | null
}

export interface UpdateIdeaInput {
  title?: string
  notes?: string | null
  source?: string | null
  status?: IdeaStatus
  potential?: number | null
  complexity?: string | null
}

export class IdeaService {
  constructor(
    private readonly ideas: IdeaRepository,
    private readonly now: () => Date,
    private readonly idGen: () => string,
  ) {}

  async create(actor: Actor, input: CreateIdeaInput): Promise<IdeaView> {
    const at = this.now()
    const idea: Idea = {
      id: this.idGen(),
      title: input.title.trim(),
      notes: input.notes ?? null,
      source: input.source ?? null,
      status: 'inbox',
      potential: input.potential ?? null,
      complexity: input.complexity ?? null,
      createdBy: actor.userId,
      createdByName: actor.displayName,
      promotedContentId: null,
      createdAt: at,
      updatedAt: at,
    }
    await this.ideas.create(idea)
    return toIdeaView(idea)
  }

  async list(filter: {
    status?: IdeaStatus
    limit: number
    offset: number
  }): Promise<{ items: IdeaView[]; total: number }> {
    const { items, total } = await this.ideas.list(filter)
    return { items: items.map(toIdeaView), total }
  }

  async update(id: string, input: UpdateIdeaInput): Promise<IdeaView> {
    const idea = await this.ideas.byId(id)
    if (!idea) throw new IdeaNotFoundError()
    // Pelo PATCH só se anda entre `inbox` ↔ `discarded`. `accepted` é EXCLUSIVO
    // da promoção (garante o par status+promotedContentId coerente) — e uma
    // ideia promovida é arquivo: não volta ao inbox nem vira descartada.
    if (input.status !== undefined && input.status !== idea.status) {
      if (input.status === 'accepted') throw new InvalidIdeaStatusChangeError()
      if (idea.status === 'accepted') {
        throw new InvalidIdeaStatusChangeError(
          'Ideia promovida é arquivo — o conteúdo criado a partir dela é que segue o fluxo',
        )
      }
      idea.status = input.status
    }
    if (input.title !== undefined) idea.title = input.title.trim()
    if (input.notes !== undefined) idea.notes = input.notes
    if (input.source !== undefined) idea.source = input.source
    if (input.potential !== undefined) idea.potential = input.potential
    if (input.complexity !== undefined) idea.complexity = input.complexity
    idea.updatedAt = this.now()
    await this.ideas.update(idea)
    return toIdeaView(idea)
  }

  /**
   * Claim da promoção (condicional ao status `inbox`): aceita a ideia e aponta
   * para o conteúdo criado. `false` = outra promoção venceu a corrida.
   */
  async markPromoted(id: string, contentId: string): Promise<boolean> {
    return this.ideas.markPromoted(id, contentId, this.now())
  }

  async byId(id: string): Promise<Idea> {
    const idea = await this.ideas.byId(id)
    if (!idea) throw new IdeaNotFoundError()
    return idea
  }
}
