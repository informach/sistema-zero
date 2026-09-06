import { TriageRulesInvalidError } from '../../domain/helpdesk-errors'
import { normalizeTriageRules, type TriageRules } from '../../domain/mail/triage'
import type { SettingsRepository } from '../../domain/ports/settings-repository.port'
import type { Actor } from '../actor'
import { type SettingsView, toSettingsView } from '../views'

export interface PatchSettingsInput {
  signature?: string
  /** Regras editáveis da triagem; normalizadas e validadas antes de gravar. */
  triageRules?: TriageRules
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
    if (input.signature !== undefined) current.signature = input.signature
    if (input.triageRules !== undefined) {
      const { rules, problems } = normalizeTriageRules(input.triageRules)
      if (problems.length > 0) {
        const first = problems[0]
        throw new TriageRulesInvalidError(
          `Regras de triagem inválidas: ${first?.reason}${first?.value ? ` (${first.value})` : ''}`,
        )
      }
      current.triageRules = rules
    }
    current.updatedBy = actor.userId
    current.updatedAt = this.now()
    await this.settings.update(current)
    return toSettingsView(current)
  }
}
