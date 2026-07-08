import type { SettingsRepository } from '../../domain/ports/settings-repository.port'
import type { TicketCategory } from '../../domain/ticket/ticket'
import type { Actor } from '../actor'
import { type SettingsView, toSettingsView } from '../views'

export interface PatchSettingsInput {
  autoReplyEnabled?: boolean
  autoReplyCategories?: TicketCategory[]
  autoReplyConfidenceMin?: number
  signature?: string
}

export class SettingsService {
  constructor(
    private readonly settings: SettingsRepository,
    private readonly now: () => Date,
  ) {}

  async get(): Promise<SettingsView> {
    return toSettingsView(await this.settings.get())
  }

  async patch(actor: Actor, input: PatchSettingsInput): Promise<SettingsView> {
    const current = await this.settings.get()
    if (input.autoReplyEnabled !== undefined) current.autoReplyEnabled = input.autoReplyEnabled
    if (input.autoReplyCategories !== undefined) {
      // Dedupe preservando a ordem (o DTO já validou os valores do enum).
      current.autoReplyCategories = [...new Set(input.autoReplyCategories)]
    }
    if (input.autoReplyConfidenceMin !== undefined) {
      current.autoReplyConfidenceMin = input.autoReplyConfidenceMin
    }
    if (input.signature !== undefined) current.signature = input.signature
    current.updatedBy = actor.userId
    current.updatedAt = this.now()
    await this.settings.update(current)
    return toSettingsView(current)
  }
}
