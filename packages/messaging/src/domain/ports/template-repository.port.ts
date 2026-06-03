import type { Channel } from '../shared/channel'
import type { Template } from '../template/template.aggregate'

export interface ListTemplatesQuery {
  channel?: Channel
  q?: string
  limit: number
  offset: number
}

export interface TemplateRepository {
  create(template: Template): Promise<void>
  /** Atualização com concorrência otimista (`version`). */
  update(template: Template): Promise<void>
  findById(id: string): Promise<Template | null>
  findByChannelAndKey(channel: Channel, key: string): Promise<Template | null>
  list(query: ListTemplatesQuery): Promise<{ items: Template[]; total: number }>
}
