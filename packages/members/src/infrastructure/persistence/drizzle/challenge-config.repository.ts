import { asc, eq, inArray } from 'drizzle-orm'
import type {
  ChallengeConfigRepository,
  ChallengeCustomThemeRecord,
  ChallengeOverrideWithTheme,
  ChallengeThemePatch,
  CreateChallengeThemeInput,
  UpsertChallengeOverrideInput,
} from '../../../domain/ports/challenge-config-repository.port'
import type { Database } from './db'
import { challengeCustomThemes, challengeMonthOverrides } from './schema'

type ThemeRow = typeof challengeCustomThemes.$inferSelect
type OverrideRow = typeof challengeMonthOverrides.$inferSelect

function toThemeRecord(row: ThemeRow): ChallengeCustomThemeRecord {
  return {
    id: row.id,
    emoji: row.emoji,
    title: row.title,
    description: row.description,
    suggestedKit: row.suggestedKit,
    archived: row.archived,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toOverride(row: OverrideRow, theme: ThemeRow | null): ChallengeOverrideWithTheme {
  return {
    monthKey: row.monthKey,
    builtinSlug: row.builtinSlug,
    customTheme: theme ? toThemeRecord(theme) : null,
    updatedAt: row.updatedAt,
    updatedByUserId: row.updatedByUserId,
  }
}

export class DrizzleChallengeConfigRepository implements ChallengeConfigRepository {
  constructor(private readonly db: Database) {}

  async findOverrideWithTheme(monthKey: string): Promise<ChallengeOverrideWithTheme | null> {
    const rows = await this.db
      .select()
      .from(challengeMonthOverrides)
      .leftJoin(
        challengeCustomThemes,
        eq(challengeMonthOverrides.customThemeId, challengeCustomThemes.id),
      )
      .where(eq(challengeMonthOverrides.monthKey, monthKey))
      .limit(1)
    const row = rows[0]
    if (!row) return null
    return toOverride(row.challenge_month_overrides, row.challenge_custom_themes)
  }

  async listOverridesWithThemes(monthKeys: string[]): Promise<ChallengeOverrideWithTheme[]> {
    if (monthKeys.length === 0) return []
    const rows = await this.db
      .select()
      .from(challengeMonthOverrides)
      .leftJoin(
        challengeCustomThemes,
        eq(challengeMonthOverrides.customThemeId, challengeCustomThemes.id),
      )
      .where(inArray(challengeMonthOverrides.monthKey, monthKeys))
    return rows.map((row) => toOverride(row.challenge_month_overrides, row.challenge_custom_themes))
  }

  async upsertOverride(input: UpsertChallengeOverrideInput): Promise<void> {
    await this.db
      .insert(challengeMonthOverrides)
      .values({
        monthKey: input.monthKey,
        builtinSlug: input.builtinSlug,
        customThemeId: input.customThemeId,
        updatedAt: input.now,
        updatedByUserId: input.updatedByUserId,
      })
      .onConflictDoUpdate({
        target: challengeMonthOverrides.monthKey,
        set: {
          builtinSlug: input.builtinSlug,
          customThemeId: input.customThemeId,
          updatedAt: input.now,
          updatedByUserId: input.updatedByUserId,
        },
      })
  }

  async deleteOverride(monthKey: string): Promise<void> {
    await this.db
      .delete(challengeMonthOverrides)
      .where(eq(challengeMonthOverrides.monthKey, monthKey))
  }

  async listCustomThemes(): Promise<ChallengeCustomThemeRecord[]> {
    const rows = await this.db
      .select()
      .from(challengeCustomThemes)
      .orderBy(asc(challengeCustomThemes.title))
    return rows.map(toThemeRecord)
  }

  async findCustomTheme(id: string): Promise<ChallengeCustomThemeRecord | null> {
    const rows = await this.db
      .select()
      .from(challengeCustomThemes)
      .where(eq(challengeCustomThemes.id, id))
      .limit(1)
    return rows[0] ? toThemeRecord(rows[0]) : null
  }

  async createCustomTheme(input: CreateChallengeThemeInput): Promise<ChallengeCustomThemeRecord> {
    const rows = await this.db
      .insert(challengeCustomThemes)
      .values({
        id: input.id,
        emoji: input.emoji,
        title: input.title,
        description: input.description,
        suggestedKit: input.suggestedKit,
        archived: false,
        createdAt: input.now,
        updatedAt: input.now,
      })
      .returning()
    return toThemeRecord(rows[0] as ThemeRow)
  }

  async updateCustomTheme(
    id: string,
    patch: ChallengeThemePatch,
    now: Date,
  ): Promise<ChallengeCustomThemeRecord | null> {
    const rows = await this.db
      .update(challengeCustomThemes)
      .set({ ...patch, updatedAt: now })
      .where(eq(challengeCustomThemes.id, id))
      .returning()
    return rows[0] ? toThemeRecord(rows[0]) : null
  }
}
