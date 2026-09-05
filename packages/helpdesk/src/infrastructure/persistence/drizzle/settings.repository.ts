import { eq } from 'drizzle-orm'
import type { SettingsRepository } from '../../../domain/ports/settings-repository.port'
import { DEFAULT_SETTINGS, type HelpdeskSettings } from '../../../domain/settings/settings'
import type { Database } from './db'
import { settings } from './schema'

const SETTINGS_ID = 'default'

export class DrizzleSettingsRepository implements SettingsRepository {
  constructor(private readonly db: Database) {}

  async get(): Promise<HelpdeskSettings> {
    // Get-or-create: a linha única nasce com os defaults na primeira leitura
    // (ON CONFLICT DO NOTHING tolera corrida entre réplicas).
    const [row] = await this.db.select().from(settings).where(eq(settings.id, SETTINGS_ID)).limit(1)
    if (row) {
      return {
        signature: row.signature,
        updatedBy: row.updatedBy,
        updatedAt: row.updatedAt,
      }
    }
    await this.db
      .insert(settings)
      .values({ id: SETTINGS_ID, ...DEFAULT_SETTINGS })
      .onConflictDoNothing()
    return { ...DEFAULT_SETTINGS }
  }

  async update(value: HelpdeskSettings): Promise<void> {
    await this.db
      .insert(settings)
      .values({ id: SETTINGS_ID, ...value })
      .onConflictDoUpdate({
        target: settings.id,
        set: {
          signature: value.signature,
          updatedBy: value.updatedBy,
          updatedAt: value.updatedAt,
        },
      })
  }
}
