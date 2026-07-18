import type {
  ChallengeConfigRepository,
  ChallengeCustomThemeRecord,
  ChallengeOverrideWithTheme,
  ChallengeThemePatch,
  CreateChallengeThemeInput,
  UpsertChallengeOverrideInput,
} from '../../src/domain/ports/challenge-config-repository.port'

interface OverrideRow {
  monthKey: string
  builtinSlug: string | null
  customThemeId: string | null
  updatedAt: Date
  updatedByUserId: string | null
}

/** Fake in-memory da configuração do Desafio do mês (overrides + biblioteca). */
export class InMemoryChallengeConfigRepository implements ChallengeConfigRepository {
  readonly overrides = new Map<string, OverrideRow>()
  readonly themes = new Map<string, ChallengeCustomThemeRecord>()

  private joined(row: OverrideRow): ChallengeOverrideWithTheme {
    return {
      monthKey: row.monthKey,
      builtinSlug: row.builtinSlug,
      customTheme: row.customThemeId ? (this.themes.get(row.customThemeId) ?? null) : null,
      updatedAt: row.updatedAt,
      updatedByUserId: row.updatedByUserId,
    }
  }

  async findOverrideWithTheme(monthKey: string): Promise<ChallengeOverrideWithTheme | null> {
    const row = this.overrides.get(monthKey)
    return row ? this.joined(row) : null
  }

  async listOverridesWithThemes(monthKeys: string[]): Promise<ChallengeOverrideWithTheme[]> {
    return monthKeys
      .map((key) => this.overrides.get(key))
      .filter((row): row is OverrideRow => Boolean(row))
      .map((row) => this.joined(row))
  }

  async upsertOverride(input: UpsertChallengeOverrideInput): Promise<void> {
    this.overrides.set(input.monthKey, {
      monthKey: input.monthKey,
      builtinSlug: input.builtinSlug,
      customThemeId: input.customThemeId,
      updatedAt: input.now,
      updatedByUserId: input.updatedByUserId,
    })
  }

  async deleteOverride(monthKey: string): Promise<void> {
    this.overrides.delete(monthKey)
  }

  async listCustomThemes(): Promise<ChallengeCustomThemeRecord[]> {
    return [...this.themes.values()].sort((a, b) => a.title.localeCompare(b.title))
  }

  async findCustomTheme(id: string): Promise<ChallengeCustomThemeRecord | null> {
    return this.themes.get(id) ?? null
  }

  async createCustomTheme(input: CreateChallengeThemeInput): Promise<ChallengeCustomThemeRecord> {
    const record: ChallengeCustomThemeRecord = {
      id: input.id,
      emoji: input.emoji,
      title: input.title,
      description: input.description,
      archived: false,
      createdAt: input.now,
      updatedAt: input.now,
    }
    this.themes.set(record.id, record)
    return record
  }

  async updateCustomTheme(
    id: string,
    patch: ChallengeThemePatch,
    now: Date,
  ): Promise<ChallengeCustomThemeRecord | null> {
    const current = this.themes.get(id)
    if (!current) return null
    const next = { ...current, ...patch, updatedAt: now }
    this.themes.set(id, next)
    return next
  }
}
