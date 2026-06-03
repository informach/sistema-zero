import type { RenderableTemplate } from '../services/render-template'
import { AggregateRoot } from '../shared/aggregate-root'
import type { Channel } from '../shared/channel'
import { ValidationError } from '../shared/errors'

export interface TemplateProps {
  key: string
  channel: Channel
  name: string
  subject: string | null
  body: string
  variables: string[]
  active: boolean
  version: number
  createdAt: Date
  updatedAt: Date
}

export interface CreateTemplateInput {
  id: string
  key: string
  channel: Channel
  name: string
  subject?: string | null
  body: string
  variables?: string[]
  active?: boolean
  now: Date
}

export interface UpdateTemplateInput {
  name?: string
  subject?: string | null
  body?: string
  variables?: string[]
  active?: boolean
}

/** Template de mensagem (e-mail ou WhatsApp), com variáveis `{{...}}`. */
export class Template extends AggregateRoot<string> {
  private constructor(
    id: string,
    private props: TemplateProps,
  ) {
    super(id)
  }

  static create(input: CreateTemplateInput): Template {
    const key = input.key?.trim()
    if (!key) throw new ValidationError('key do template é obrigatória')
    if (!input.name?.trim()) throw new ValidationError('Nome do template é obrigatório')
    if (!input.body?.trim()) throw new ValidationError('Corpo do template é obrigatório')

    const subject = normalizeSubject(input.channel, input.subject ?? null)
    return new Template(input.id, {
      key,
      channel: input.channel,
      name: input.name.trim(),
      subject,
      body: input.body,
      variables: normalizeVariables(input.variables),
      active: input.active ?? true,
      version: 0,
      createdAt: input.now,
      updatedAt: input.now,
    })
  }

  static fromState(id: string, props: TemplateProps): Template {
    return new Template(id, props)
  }

  update(patch: UpdateTemplateInput, now: Date): void {
    if (patch.name !== undefined) {
      if (!patch.name.trim()) throw new ValidationError('Nome do template é obrigatório')
      this.props.name = patch.name.trim()
    }
    if (patch.body !== undefined) {
      if (!patch.body.trim()) throw new ValidationError('Corpo do template é obrigatório')
      this.props.body = patch.body
    }
    if (patch.subject !== undefined) {
      this.props.subject = normalizeSubject(this.props.channel, patch.subject)
    }
    if (patch.variables !== undefined) this.props.variables = normalizeVariables(patch.variables)
    if (patch.active !== undefined) this.props.active = patch.active
    this.props.updatedAt = now
  }

  toRenderable(): RenderableTemplate {
    return {
      channel: this.props.channel,
      subject: this.props.subject,
      body: this.props.body,
      variables: this.props.variables,
    }
  }

  get key(): string {
    return this.props.key
  }
  get channel(): Channel {
    return this.props.channel
  }
  get active(): boolean {
    return this.props.active
  }
  get version(): number {
    return this.props.version
  }
  get state(): Readonly<TemplateProps> {
    return this.props
  }
}

function normalizeSubject(channel: Channel, subject: string | null): string | null {
  if (channel !== 'email') return null // WhatsApp não tem assunto
  const trimmed = subject?.trim()
  if (!trimmed) throw new ValidationError('Assunto é obrigatório para template de e-mail')
  return trimmed
}

function normalizeVariables(variables: string[] | undefined): string[] {
  if (!variables) return []
  return [...new Set(variables.map((v) => v.trim()).filter(Boolean))]
}
