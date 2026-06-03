import type { Channel } from '../../domain/shared/channel'
import type { Template } from '../../domain/template/template.aggregate'

export interface TemplateView {
  id: string
  key: string
  channel: Channel
  name: string
  subject: string | null
  body: string
  variables: string[]
  active: boolean
  createdAt: string
  updatedAt: string
}

export function toTemplateView(template: Template): TemplateView {
  const s = template.state
  return {
    id: template.id,
    key: s.key,
    channel: s.channel,
    name: s.name,
    subject: s.subject,
    body: s.body,
    variables: s.variables,
    active: s.active,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }
}
