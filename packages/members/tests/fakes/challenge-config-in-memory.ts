import type { CourseAudience } from '../../src/domain/course/course'
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

  async findOverrideWithTheme(
    monthKey: string,
    audience: CourseAudience = 'kids',
  ): Promise<ChallengeOverrideWithTheme | null> {
    const row = this.overrides.get(audience === 'kids' ? monthKey : `adult:${monthKey}`)
    return row ? this.joined(row) : null
  }

  async listOverridesWithThemes(
    monthKeys: string[],
    audience: CourseAudience = 'kids',
  ): Promise<ChallengeOverrideWithTheme[]> {
    return monthKeys
      .map((key) => this.overrides.get(audience === 'kids' ? key : `adult:${key}`))
      .filter((row): row is OverrideRow => Boolean(row))
      .map((row) => this.joined(row))
  }

  async upsertOverride(input: UpsertChallengeOverrideInput): Promise<void> {
    this.overrides.set(input.audience === 'adult' ? `adult:${input.monthKey}` : input.monthKey, {
      monthKey: input.monthKey,
      builtinSlug: input.builtinSlug,
      customThemeId: input.customThemeId,
      updatedAt: input.now,
      updatedByUserId: input.updatedByUserId,
    })
  }

  async deleteOverride(monthKey: string, audience: CourseAudience = 'kids'): Promise<void> {
    this.overrides.delete(audience === 'kids' ? monthKey : `adult:${monthKey}`)
  }

  async listCustomThemes(audience: CourseAudience = 'kids'): Promise<ChallengeCustomThemeRecord[]> {
    return [...this.themes.values()]
      .filter((theme) => (theme.audience ?? 'kids') === audience)
      .sort((a, b) => a.title.localeCompare(b.title))
  }

  async findCustomTheme(
    id: string,
    audience: CourseAudience = 'kids',
  ): Promise<ChallengeCustomThemeRecord | null> {
    const theme = this.themes.get(id)
    return theme && (theme.audience ?? 'kids') === audience ? theme : null
  }

  async createCustomTheme(input: CreateChallengeThemeInput): Promise<ChallengeCustomThemeRecord> {
    const record: ChallengeCustomThemeRecord = {
      id: input.id,
      audience: input.audience ?? 'kids',
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
    audience: CourseAudience = 'kids',
  ): Promise<ChallengeCustomThemeRecord | null> {
    const current = this.themes.get(id)
    if (!current || (current.audience ?? 'kids') !== audience) return null
    const next = { ...current, ...patch, updatedAt: now }
    this.themes.set(id, next)
    return next
  }
}
