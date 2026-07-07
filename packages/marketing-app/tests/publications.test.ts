import { describe, expect, it } from 'bun:test'
import {
  canCreatePublications,
  canMarkPublished,
  canSchedule,
  forcesManualMode,
  isActivePublication,
  isEditable,
  PUBLICATION_STATUSES,
  STATUS_COLORS,
  STATUS_LABELS,
  validateScheduleWindow,
} from '../src/lib/publications'

describe('publications (espelho do domínio)', () => {
  it('labels e cores cobrem TODOS os status (exaustividade)', () => {
    for (const status of PUBLICATION_STATUSES) {
      expect(STATUS_LABELS[status]).toBeTruthy()
      expect(STATUS_COLORS[status]).toBeTruthy()
    }
  })

  it('espelha a tabela de estados do backend', () => {
    // Fixture EXPLÍCITA — mudou o domínio no backend, este teste avisa.
    const table = {
      draft: { edit: true, schedule: true, mark: true },
      ready: { edit: true, schedule: true, mark: true },
      scheduled: { edit: true, schedule: true, mark: true },
      publishing: { edit: false, schedule: false, mark: false },
      awaiting_manual: { edit: true, schedule: true, mark: true },
      published: { edit: false, schedule: false, mark: false },
      failed: { edit: true, schedule: true, mark: true },
      canceled: { edit: false, schedule: false, mark: false },
    } as const
    for (const status of PUBLICATION_STATUSES) {
      expect(isEditable(status)).toBe(table[status].edit)
      expect(canSchedule(status)).toBe(table[status].schedule)
      expect(canMarkPublished(status)).toBe(table[status].mark)
    }
  })

  it('canceled não é publicação ativa', () => {
    expect(isActivePublication('canceled')).toBe(false)
    expect(isActivePublication('failed')).toBe(true)
  })

  it('ig_story sempre força modo lembrete', () => {
    expect(forcesManualMode('ig_story')).toBe(true)
    expect(forcesManualMode('ig_reels')).toBe(false)
    expect(forcesManualMode('yt_video')).toBe(false)
  })

  it('publicações só nascem de approved/scheduled/published', () => {
    expect(canCreatePublications('approved')).toBe(true)
    expect(canCreatePublications('scheduled')).toBe(true)
    expect(canCreatePublications('published')).toBe(true)
    expect(canCreatePublications('review')).toBe(false)
    expect(canCreatePublications('canceled')).toBe(false)
  })

  describe('validateScheduleWindow (espelho de −5min/+2anos)', () => {
    const now = new Date('2026-07-07T12:00:00Z')
    it('−6min inválido, −4min válido (folga de clock skew)', () => {
      expect(validateScheduleWindow(new Date(now.getTime() - 6 * 60_000), now)).toBeTruthy()
      expect(validateScheduleWindow(new Date(now.getTime() - 4 * 60_000), now)).toBeNull()
    })
    it('teto de 2 anos', () => {
      const twoYears = 2 * 365 * 86_400_000
      expect(validateScheduleWindow(new Date(now.getTime() + twoYears - 1000), now)).toBeNull()
      expect(
        validateScheduleWindow(new Date(now.getTime() + twoYears + 86_400_000), now),
      ).toBeTruthy()
    })
    it('data inválida vira mensagem', () => {
      expect(validateScheduleWindow(new Date('lixo'), now)).toBeTruthy()
    })
  })
})
