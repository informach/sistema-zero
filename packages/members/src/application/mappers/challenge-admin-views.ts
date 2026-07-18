import type { ChallengeTheme, ChallengeThemeSource } from '../../domain/gamification/challenges'
import { customChallengeSlug } from '../../domain/gamification/challenges'
import type { ChallengeCustomThemeRecord } from '../../domain/ports/challenge-config-repository.port'

/** Um mês da janela do painel, com o tema RESOLVIDO (definido ou sorteado). */
export interface ChallengeMonthAdminView {
  /** `m:YYYY-MM` (régua do ledger/hub). */
  monthKey: string
  /** `YYYY-MM` — vai nas URLs do admin (sem `:`). */
  month: string
  /** Mês no ar agora. */
  current: boolean
  source: ChallengeThemeSource
  theme: ChallengeTheme
  /** Preenchido quando o override aponta um tema da biblioteca. */
  customThemeId: string | null
  updatedAt: string | null
}

export interface ChallengeThemeAdminView {
  id: string
  slug: string
  emoji: string
  title: string
  description: string
  archived: boolean
  createdAt: string
  updatedAt: string
}

export interface ChallengeThemesAdminView {
  /** Catálogo fixo em código (read-only; é o pool do sorteio). */
  builtin: ChallengeTheme[]
  custom: ChallengeThemeAdminView[]
}

export function toChallengeThemeAdminView(
  record: ChallengeCustomThemeRecord,
): ChallengeThemeAdminView {
  return {
    id: record.id,
    slug: customChallengeSlug(record.id),
    emoji: record.emoji,
    title: record.title,
    description: record.description,
    archived: record.archived,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}
