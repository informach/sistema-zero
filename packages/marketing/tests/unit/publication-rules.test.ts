import { describe, expect, it } from 'bun:test'
import {
  canMarkPublished,
  canSchedule,
  FORMAT_NETWORK,
  forcesManualMode,
  isEditable,
  isPendingPublication,
} from '../../src/domain/publication/publication'

describe('publication rules', () => {
  it('todo formato tem rede dona', () => {
    expect(FORMAT_NETWORK.ig_reels).toBe('instagram')
    expect(FORMAT_NETWORK.fb_post).toBe('facebook')
    expect(FORMAT_NETWORK.yt_short).toBe('youtube')
    expect(FORMAT_NETWORK.tt_video).toBe('tiktok')
  })

  it('stories são sempre manuais (sem API de publicação)', () => {
    expect(forcesManualMode('ig_story')).toBe(true)
    expect(forcesManualMode('ig_reels')).toBe(false)
  })

  it('estados editáveis/agendáveis', () => {
    expect(isEditable('draft')).toBe(true)
    expect(isEditable('failed')).toBe(true)
    expect(isEditable('publishing')).toBe(false)
    expect(isEditable('published')).toBe(false)
    expect(canSchedule('scheduled')).toBe(true)
    expect(canSchedule('published')).toBe(false)
  })

  it('mark-published cobre o fluxo do lembrete (inclusive atrasadas/failed)', () => {
    expect(canMarkPublished('awaiting_manual')).toBe(true)
    expect(canMarkPublished('scheduled')).toBe(true)
    expect(canMarkPublished('failed')).toBe(true)
    expect(canMarkPublished('published')).toBe(false)
    expect(canMarkPublished('canceled')).toBe(false)
  })

  it('pendências que seguram a etapa "scheduled" do conteúdo', () => {
    expect(isPendingPublication('scheduled')).toBe(true)
    expect(isPendingPublication('awaiting_manual')).toBe(true)
    expect(isPendingPublication('publishing')).toBe(true)
    expect(isPendingPublication('failed')).toBe(true)
    expect(isPendingPublication('published')).toBe(false)
    expect(isPendingPublication('draft')).toBe(false)
  })
})
