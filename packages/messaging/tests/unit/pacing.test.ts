import { describe, expect, it } from 'bun:test'
import type { Rng } from '../../src/domain/ports/rng.port'
import {
  computeNextLaneState,
  computeRetryAt,
  effectiveDailyCap,
  isLaneAvailable,
  type LaneState,
  type PacingConfig,
} from '../../src/domain/services/pacing'

const config: PacingConfig = {
  minDelayMs: 15_000,
  maxDelayMs: 45_000,
  restAfterN: 3,
  restDurationMs: 600_000,
  warmupDays: 10,
  warmupStartCap: 20,
}

/** RNG determinístico: sempre devolve `value` em intBetween. */
function fakeRng(value: number): Rng {
  return { float: () => 0, intBetween: () => value }
}

function baseLane(over: Partial<LaneState> = {}): LaneState {
  return {
    enabled: true,
    status: 'CONNECTED',
    dailyCap: 200,
    sentToday: 0,
    dayCursor: null,
    messagesSinceRest: 0,
    nextAvailableAt: new Date('2026-06-03T10:00:00Z'),
    warmupStartedAt: null,
    ...over,
  }
}

describe('pacing — effectiveDailyCap (aquecimento)', () => {
  const now = new Date('2026-06-03T12:00:00Z')

  it('sem aquecimento usa o teto cheio', () => {
    expect(effectiveDailyCap(baseLane(), config, now)).toBe(200)
  })

  it('no 1º dia de aquecimento usa o teto inicial baixo', () => {
    const lane = baseLane({ warmupStartedAt: now })
    expect(effectiveDailyCap(lane, config, now)).toBe(20)
  })

  it('sobe gradualmente durante o aquecimento', () => {
    const lane = baseLane({ warmupStartedAt: new Date('2026-05-29T12:00:00Z') }) // 5 dias atrás
    const cap = effectiveDailyCap(lane, config, now)
    expect(cap).toBeGreaterThan(20)
    expect(cap).toBeLessThan(200)
  })

  it('após o período de aquecimento usa o teto cheio', () => {
    const lane = baseLane({ warmupStartedAt: new Date('2026-05-10T12:00:00Z') }) // >10 dias
    expect(effectiveDailyCap(lane, config, now)).toBe(200)
  })
})

describe('pacing — isLaneAvailable', () => {
  const now = new Date('2026-06-03T12:00:00Z')

  it('disponível quando habilitada, conectada, livre e com cota', () => {
    expect(isLaneAvailable(baseLane(), config, now)).toBe(true)
  })

  it('indisponível se desabilitada ou desconectada', () => {
    expect(isLaneAvailable(baseLane({ enabled: false }), config, now)).toBe(false)
    expect(isLaneAvailable(baseLane({ status: 'DISCONNECTED' }), config, now)).toBe(false)
  })

  it('indisponível enquanto nextAvailableAt está no futuro (delay/descanso)', () => {
    const lane = baseLane({ nextAvailableAt: new Date('2026-06-03T12:00:30Z') })
    expect(isLaneAvailable(lane, config, now)).toBe(false)
  })

  it('indisponível ao atingir o teto diário', () => {
    const lane = baseLane({ dailyCap: 5, sentToday: 5, dayCursor: '2026-06-03' })
    expect(isLaneAvailable(lane, config, now)).toBe(false)
  })

  it('o contador diário reseta ao virar o dia', () => {
    const lane = baseLane({ dailyCap: 5, sentToday: 5, dayCursor: '2026-06-02' })
    expect(isLaneAvailable(lane, config, now)).toBe(true)
  })
})

describe('pacing — computeNextLaneState', () => {
  const now = new Date('2026-06-03T12:00:00Z')

  it('incrementa contadores e agenda o próximo envio com o delay (jitter)', () => {
    const lane = baseLane({ sentToday: 1, messagesSinceRest: 1, dayCursor: '2026-06-03' })
    const next = computeNextLaneState(lane, config, now, fakeRng(20_000))
    expect(next.sentToday).toBe(2)
    expect(next.messagesSinceRest).toBe(2)
    expect(next.dayCursor).toBe('2026-06-03')
    expect(next.nextAvailableAt.getTime()).toBe(now.getTime() + 20_000)
  })

  it('injeta o descanso e zera o contador ao atingir restAfterN', () => {
    const lane = baseLane({ sentToday: 2, messagesSinceRest: 2, dayCursor: '2026-06-03' })
    const next = computeNextLaneState(lane, config, now, fakeRng(20_000))
    expect(next.messagesSinceRest).toBe(0) // resetou após o descanso
    expect(next.nextAvailableAt.getTime()).toBe(now.getTime() + 20_000 + config.restDurationMs)
  })

  it('reseta os contadores quando o dia virou', () => {
    const lane = baseLane({ sentToday: 100, messagesSinceRest: 2, dayCursor: '2026-06-02' })
    const next = computeNextLaneState(lane, config, now, fakeRng(20_000))
    expect(next.sentToday).toBe(1)
    expect(next.messagesSinceRest).toBe(1)
    expect(next.dayCursor).toBe('2026-06-03')
  })
})

describe('pacing — computeRetryAt', () => {
  const now = new Date('2026-06-03T12:00:00Z')

  it('agenda dentro do cap do backoff exponencial', () => {
    const at = computeRetryAt(0, { baseMs: 1000, maxMs: 60_000 }, now, fakeRng(500))
    expect(at.getTime()).toBe(now.getTime() + 500)
  })
})
