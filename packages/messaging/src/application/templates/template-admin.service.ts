import type { Clock } from '../../domain/ports/clock.port'
import type {
  ListTemplatesQuery,
  TemplateRepository,
} from '../../domain/ports/template-repository.port'
import type { Channel } from '../../domain/shared/channel'
import { Template, type UpdateTemplateInput } from '../../domain/template/template.aggregate'
import {
  TemplateAlreadyExistsError,
  TemplateNotFoundError,
} from '../../domain/template/template.errors'
import { type TemplateView, toTemplateView } from '../mappers/template-view'

export interface CreateTemplateInput {
  key: string
  channel: Channel
  name: string
  subject?: string | null
  body: string
  variables?: string[]
  active?: boolean
}

export class CreateTemplateService {
  constructor(
    private readonly templates: TemplateRepository,
    private readonly clock: Clock,
    private readonly idGen: () => string,
  ) {}

  async execute(input: CreateTemplateInput): Promise<TemplateView> {
    const existing = await this.templates.findByChannelAndKey(input.channel, input.key)
    if (existing) {
      throw new TemplateAlreadyExistsError(`Já existe template ${input.channel}/${input.key}`)
    }
    const template = Template.create({ id: this.idGen(), ...input, now: this.clock.now() })
    await this.templates.create(template)
    return toTemplateView(template)
  }
}

export class UpdateTemplateService {
  constructor(
    private readonly templates: TemplateRepository,
    private readonly clock: Clock,
  ) {}

  async execute(id: string, patch: UpdateTemplateInput): Promise<TemplateView> {
    const template = await this.templates.findById(id)
    if (!template) throw new TemplateNotFoundError(`Template ${id} não encontrado`)
    template.update(patch, this.clock.now())
    await this.templates.update(template)
    return toTemplateView(template)
  }
}

export class GetTemplateService {
  constructor(private readonly templates: TemplateRepository) {}

  async execute(id: string): Promise<TemplateView> {
    const template = await this.templates.findById(id)
    if (!template) throw new TemplateNotFoundError(`Template ${id} não encontrado`)
    return toTemplateView(template)
  }
}

export class ListTemplatesService {
  constructor(private readonly templates: TemplateRepository) {}

  async execute(query: ListTemplatesQuery): Promise<{ items: TemplateView[]; total: number }> {
    const { items, total } = await this.templates.list(query)
    return { items: items.map(toTemplateView), total }
  }
}
