import { randomUUID } from 'node:crypto'
import {
  builtinThemeBySlug,
  CHALLENGE_THEMES,
  isPastMonthKey,
  monthKeyFromMonth,
  monthKeysFrom,
  resolveChallengeTheme,
} from '../../domain/gamification/challenges'
import {
  ChallengeMonthInvalidError,
  ChallengeMonthPastError,
  ChallengeThemeArchivedError,
  ChallengeThemeNotFoundError,
} from '../../domain/gamification/gamification.errors'
import type {
  ChallengeConfigRepository,
  ChallengeOverrideWithTheme,
} from '../../domain/ports/challenge-config-repository.port'
import { ValidationError } from '../../domain/shared/errors'
import type {
  ChallengeMonthAdminView,
  ChallengeThemeAdminView,
  ChallengeThemesAdminView,
} from '../mappers/challenge-admin-views'
import { toChallengeThemeAdminView } from '../mappers/challenge-admin-views'

/** Janela do painel e da edição: mês corrente + 11 seguintes. */
const MONTH_WINDOW = 12

export interface SetChallengeMonthCommand {
  builtinSlug?: string
  customThemeId?: string
}

export interface CreateChallengeThemeCommand {
  emoji: string
  title: string
  description: string
}

export type PatchChallengeThemeCommand = Partial<
  CreateChallengeThemeCommand & { archived: boolean }
>

/**
 * Gestão do Desafio do mês pelo painel (Sala do Professor): ver a janela de
 * meses com o tema RESOLVIDO (definido ou sorteado), definir/limpar o tema de
 * um mês e manter a biblioteca de temas custom. O sorteio em código segue
 * intocado como fallback — todo mês sempre tem tema.
 */
export class ChallengeAdminService {
  constructor(
    private readonly repo: ChallengeConfigRepository,
    private readonly clock: () => Date,
    private readonly newId: () => string = randomUUID,
  ) {}

  private monthView(
    monthKey: string,
    currentKey: string,
    override: ChallengeOverrideWithTheme | null,
  ): ChallengeMonthAdminView {
    const { theme, source } = resolveChallengeTheme(monthKey, override)
    return {
      monthKey,
      month: monthKey.slice(2),
      current: monthKey === currentKey,
      source,
      theme,
      customThemeId: override?.customTheme?.id ?? null,
      updatedAt: override?.updatedAt.toISOString() ?? null,
    }
  }

  /** Chave validada dentro da janela editável (corrente + 11). */
  private assertEditableKey(month: string): { key: string; window: string[] } {
    const key = monthKeyFromMonth(month)
    const now = this.clock()
    if (isPastMonthKey(key, now)) throw new ChallengeMonthPastError()
    const window = monthKeysFrom(now, MONTH_WINDOW)
    if (!window.includes(key)) throw new ChallengeMonthInvalidError()
    return { key, window }
  }

  async listMonths(): Promise<{ months: ChallengeMonthAdminView[] }> {
    const now = this.clock()
    const window = monthKeysFrom(now, MONTH_WINDOW)
    const currentKey = window[0] as string
    const overrides = await this.repo.listOverridesWithThemes(window)
    const byKey = new Map(overrides.map((o) => [o.monthKey, o]))
    return {
      months: window.map((key) => this.monthView(key, currentKey, byKey.get(key) ?? null)),
    }
  }

  async setMonth(
    month: string,
    cmd: SetChallengeMonthCommand,
    actorUserId: string | null,
  ): Promise<ChallengeMonthAdminView> {
    const hasBuiltin = typeof cmd.builtinSlug === 'string'
    const hasCustom = typeof cmd.customThemeId === 'string'
    if (hasBuiltin === hasCustom) {
      throw new ValidationError('Informe exatamente um: builtinSlug ou customThemeId')
    }
    const { key, window } = this.assertEditableKey(month)

    if (hasBuiltin && !builtinThemeBySlug(cmd.builtinSlug as string)) {
      throw new ChallengeThemeNotFoundError()
    }
    if (hasCustom) {
      const theme = await this.repo.findCustomTheme(cmd.customThemeId as string)
      if (!theme) throw new ChallengeThemeNotFoundError()
      if (theme.archived) throw new ChallengeThemeArchivedError()
    }

    await this.repo.upsertOverride({
      monthKey: key,
      builtinSlug: hasBuiltin ? (cmd.builtinSlug as string) : null,
      customThemeId: hasCustom ? (cmd.customThemeId as string) : null,
      updatedByUserId: actorUserId,
      now: this.clock(),
    })
    const override = await this.repo.findOverrideWithTheme(key)
    return this.monthView(key, window[0] as string, override)
  }

  async clearMonth(month: string): Promise<ChallengeMonthAdminView> {
    const { key, window } = this.assertEditableKey(month)
    await this.repo.deleteOverride(key)
    return this.monthView(key, window[0] as string, null)
  }

  async listThemes(): Promise<ChallengeThemesAdminView> {
    const custom = await this.repo.listCustomThemes()
    return {
      builtin: [...CHALLENGE_THEMES],
      custom: custom.map(toChallengeThemeAdminView),
    }
  }

  async createTheme(cmd: CreateChallengeThemeCommand): Promise<ChallengeThemeAdminView> {
    const record = await this.repo.createCustomTheme({
      id: this.newId(),
      emoji: cmd.emoji,
      title: cmd.title,
      description: cmd.description,
      now: this.clock(),
    })
    return toChallengeThemeAdminView(record)
  }

  async updateTheme(
    id: string,
    patch: PatchChallengeThemeCommand,
  ): Promise<ChallengeThemeAdminView> {
    const record = await this.repo.updateCustomTheme(id, patch, this.clock())
    if (!record) throw new ChallengeThemeNotFoundError()
    return toChallengeThemeAdminView(record)
  }
}
