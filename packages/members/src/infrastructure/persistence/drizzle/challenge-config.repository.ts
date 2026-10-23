import { asc, eq, inArray } from 'drizzle-orm'
import type { CourseAudience } from '../../../domain/course/course'
import type {
  ChallengeConfigRepository,
  ChallengeCustomThemeRecord,
  ChallengeOverrideWithTheme,
  ChallengeThemePatch,
  CreateChallengeThemeInput,
  UpsertChallengeOverrideInput,
} from '../../../domain/ports/challenge-config-repository.port'
import type { Database } from './db'
import {
  adultChallengeCustomThemes,
  adultChallengeMonthOverrides,
  challengeCustomThemes,
  challengeMonthOverrides,
} from './schema'

type ThemeRow = typeof challengeCustomThemes.$inferSelect
type OverrideRow = typeof challengeMonthOverrides.$inferSelect
function toThemeRecord(row: ThemeRow, audience: CourseAudience): ChallengeCustomThemeRecord {
  return { ...row, audience }
}
function toOverride(
  row: OverrideRow,
  theme: ThemeRow | null,
  audience: CourseAudience,
): ChallengeOverrideWithTheme {
  return {
    monthKey: row.monthKey,
    builtinSlug: row.builtinSlug,
    customTheme: theme ? toThemeRecord(theme, audience) : null,
    updatedAt: row.updatedAt,
    updatedByUserId: row.updatedByUserId,
  }
}

export class DrizzleChallengeConfigRepository implements ChallengeConfigRepository {
  constructor(private readonly db: Database) {}
  private tables(audience: CourseAudience) {
    return audience === 'adult'
      ? { themes: adultChallengeCustomThemes, overrides: adultChallengeMonthOverrides }
      : { themes: challengeCustomThemes, overrides: challengeMonthOverrides }
  }
  async findOverrideWithTheme(monthKey: string, audience: CourseAudience = 'kids') {
    const { themes, overrides } = this.tables(audience)
    const [row] = await this.db
      .select({ override: overrides, theme: themes })
      .from(overrides)
      .leftJoin(themes, eq(overrides.customThemeId, themes.id))
      .where(eq(overrides.monthKey, monthKey))
      .limit(1)
    return row ? toOverride(row.override, row.theme, audience) : null
  }
  async listOverridesWithThemes(monthKeys: string[], audience: CourseAudience = 'kids') {
    if (!monthKeys.length) return []
    const { themes, overrides } = this.tables(audience)
    const rows = await this.db
      .select({ override: overrides, theme: themes })
      .from(overrides)
      .leftJoin(themes, eq(overrides.customThemeId, themes.id))
      .where(inArray(overrides.monthKey, monthKeys))
    return rows.map((row) => toOverride(row.override, row.theme, audience))
  }
  async upsertOverride(input: UpsertChallengeOverrideInput) {
    const { overrides } = this.tables(input.audience ?? 'kids')
    const values = {
      monthKey: input.monthKey,
      builtinSlug: input.builtinSlug,
      customThemeId: input.customThemeId,
      updatedAt: input.now,
      updatedByUserId: input.updatedByUserId,
    }
    await this.db.insert(overrides).values(values).onConflictDoUpdate({
      target: overrides.monthKey,
      set: values,
    })
  }
  async deleteOverride(monthKey: string, audience: CourseAudience = 'kids') {
    const { overrides } = this.tables(audience)
    await this.db.delete(overrides).where(eq(overrides.monthKey, monthKey))
  }
  async listCustomThemes(audience: CourseAudience = 'kids') {
    const { themes } = this.tables(audience)
    return (await this.db.select().from(themes).orderBy(asc(themes.title))).map((row) =>
      toThemeRecord(row, audience),
    )
  }
  async findCustomTheme(id: string, audience: CourseAudience = 'kids') {
    const { themes } = this.tables(audience)
    const [row] = await this.db.select().from(themes).where(eq(themes.id, id)).limit(1)
    return row ? toThemeRecord(row, audience) : null
  }
  async createCustomTheme(input: CreateChallengeThemeInput) {
    const audience = input.audience ?? 'kids'
    const { themes } = this.tables(audience)
    const [row] = await this.db
      .insert(themes)
      .values({
        id: input.id,
        emoji: input.emoji,
        title: input.title,
        description: input.description,
        archived: false,
        createdAt: input.now,
        updatedAt: input.now,
      })
      .returning()
    if (!row) throw new Error('Tema não foi persistido')
    return toThemeRecord(row, audience)
  }
  async updateCustomTheme(
    id: string,
    patch: ChallengeThemePatch,
    now: Date,
    audience: CourseAudience = 'kids',
  ) {
    const { themes } = this.tables(audience)
    const [row] = await this.db
      .update(themes)
      .set({ ...patch, updatedAt: now })
      .where(eq(themes.id, id))
      .returning()
    return row ? toThemeRecord(row, audience) : null
  }
}
