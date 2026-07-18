/**
 * Configuração do Desafio do mês gerenciada pelo admin: biblioteca de temas
 * CUSTOM + override do tema por mês. Sem override, o tema do mês vem do
 * sorteio determinístico em código (domain/gamification/challenges.ts).
 */

export interface ChallengeCustomThemeRecord {
  id: string
  emoji: string
  title: string
  description: string
  archived: boolean
  createdAt: Date
  updatedAt: Date
}

/** Override de um mês com o tema custom já joinado (vem MESMO arquivado — a
 * resolução do mês não pode quebrar porque a biblioteca escondeu o tema). */
export interface ChallengeOverrideWithTheme {
  monthKey: string
  builtinSlug: string | null
  customTheme: ChallengeCustomThemeRecord | null
  updatedAt: Date
  updatedByUserId: string | null
}

export interface UpsertChallengeOverrideInput {
  monthKey: string
  builtinSlug: string | null
  customThemeId: string | null
  updatedByUserId: string | null
  now: Date
}

export interface CreateChallengeThemeInput {
  id: string
  emoji: string
  title: string
  description: string
  now: Date
}

export type ChallengeThemePatch = Partial<{
  emoji: string
  title: string
  description: string
  archived: boolean
}>

export interface ChallengeConfigRepository {
  findOverrideWithTheme(monthKey: string): Promise<ChallengeOverrideWithTheme | null>
  /** Uma query (LEFT JOIN) para a janela do painel. */
  listOverridesWithThemes(monthKeys: string[]): Promise<ChallengeOverrideWithTheme[]>
  upsertOverride(input: UpsertChallengeOverrideInput): Promise<void>
  /** Idempotente: mês sem override é no-op. */
  deleteOverride(monthKey: string): Promise<void>
  /** TODOS os temas custom (com arquivados; a UI decide o que esconder). */
  listCustomThemes(): Promise<ChallengeCustomThemeRecord[]>
  findCustomTheme(id: string): Promise<ChallengeCustomThemeRecord | null>
  createCustomTheme(input: CreateChallengeThemeInput): Promise<ChallengeCustomThemeRecord>
  updateCustomTheme(
    id: string,
    patch: ChallengeThemePatch,
    now: Date,
  ): Promise<ChallengeCustomThemeRecord | null>
}
