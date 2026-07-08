import type { HelpdeskSettings } from '../settings/settings'

export interface SettingsRepository {
  /** Lê a linha única (cria com defaults se não existir — get-or-create). */
  get(): Promise<HelpdeskSettings>
  update(settings: HelpdeskSettings): Promise<void>
}
