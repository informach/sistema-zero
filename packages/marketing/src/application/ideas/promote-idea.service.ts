import { IdeaNotPromotableError } from '../../domain/marketing-errors'
import type { ContentType } from '../../domain/publication/publication'
import type { Actor } from '../actor'
import type { ContentService } from '../contents/content.service'
import type { ContentDetailView } from '../mappers/views'
import type { IdeaService } from './idea.service'

export interface PromoteIdeaInput {
  contentType: ContentType
  title?: string | null
  ownerUserId?: string | null
  ownerName?: string | null
}

/** Converte uma ideia do inbox em conteúdo do pipeline (e arquiva a ideia). */
export class PromoteIdeaService {
  constructor(
    private readonly ideas: IdeaService,
    private readonly contents: ContentService,
  ) {}

  async promote(actor: Actor, ideaId: string, input: PromoteIdeaInput): Promise<ContentDetailView> {
    const idea = await this.ideas.byId(ideaId)
    if (idea.status !== 'inbox') throw new IdeaNotPromotableError()
    const content = await this.contents.create(actor, {
      title: input.title?.trim() || idea.title,
      contentType: input.contentType,
      brief: idea.notes,
      ownerUserId: input.ownerUserId ?? null,
      ownerName: input.ownerName ?? null,
      ideaId: idea.id,
    })
    // Claim condicional (status ainda `inbox`): perdeu a corrida → 409. O
    // conteúdo já criado fica na etapa `idea` sem ponteiro — visível no kanban
    // e cancelável na mão (preferível a "perder" uma ideia aceita sem conteúdo).
    const claimed = await this.ideas.markPromoted(idea.id, content.id)
    if (!claimed) {
      throw new IdeaNotPromotableError('Esta ideia acabou de ser promovida por outra pessoa')
    }
    return content
  }
}
