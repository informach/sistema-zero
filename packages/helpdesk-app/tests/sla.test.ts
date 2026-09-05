import { describe, expect, it } from 'bun:test'
import { formatSlaRemaining } from '../src/lib/sla'

const base = {
  state: 'on_track' as const,
  priority: 'normal' as const,
  targetMinutes: 720,
  deadlineAt: '2026-09-01T12:00:00.000Z',
}

describe('formatSlaRemaining', () => {
  it('formats time remaining and elapsed without exposing the internal target', () => {
    expect(formatSlaRemaining({ ...base, remainingMinutes: 125 })).toBe('Vence em 2h 5min')
    expect(formatSlaRemaining({ ...base, state: 'breached', remainingMinutes: -61 })).toBe(
      'Estourado há 1h 1min',
    )
  })

  it('does not show a clock when the ticket is paused', () => {
    expect(formatSlaRemaining(null)).toBeNull()
  })
})
