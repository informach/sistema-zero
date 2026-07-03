import { describe, expect, test } from 'bun:test'
import { evaluateAdvanceGate, PENSA_NEXT_STAGE } from '../../src/domain/pensa/advance'
import { trimConversation } from '../../src/domain/pensa/conversation'
import { pensaStageSourceId } from '../../src/domain/pensa/gamification'
import type { PensaChatMessage } from '../../src/domain/pensa/pensa'

const msg = (content: string, i = 0): PensaChatMessage => ({
  role: i % 2 === 0 ? 'user' : 'assistant',
  content,
  at: '2026-07-01T12:00:00.000Z',
})

describe('evaluateAdvanceGate — gates do contrato', () => {
  test('z→e exige latest idea VALIDATED', () => {
    expect(evaluateAdvanceGate('z', { latestArtifacts: [], taskCount: 0, checklist: [] })).toEqual({
      ok: false,
      missing: ['idea'],
    })
    expect(
      evaluateAdvanceGate('z', {
        latestArtifacts: [{ type: 'idea', status: 'draft' }],
        taskCount: 0,
        checklist: [],
      }),
    ).toEqual({ ok: false, missing: ['idea'] })
    expect(
      evaluateAdvanceGate('z', {
        latestArtifacts: [{ type: 'idea', status: 'validated' }],
        taskCount: 0,
        checklist: [],
      }),
    ).toEqual({ ok: true, missing: [] })
  })

  test('e→r exige friendly_spec E identity validated (missing lista o que falta)', () => {
    expect(
      evaluateAdvanceGate('e', { latestArtifacts: [], taskCount: 0, checklist: [] }).missing,
    ).toEqual(['friendly_spec', 'identity'])
    expect(
      evaluateAdvanceGate('e', {
        latestArtifacts: [
          { type: 'friendly_spec', status: 'validated' },
          { type: 'identity', status: 'draft' },
        ],
        taskCount: 0,
        checklist: [],
      }).missing,
    ).toEqual(['identity'])
    expect(
      evaluateAdvanceGate('e', {
        latestArtifacts: [
          { type: 'friendly_spec', status: 'validated' },
          { type: 'identity', status: 'validated' },
        ],
        taskCount: 0,
        checklist: [],
      }).ok,
    ).toBe(true)
  })

  test('r→o exige ≥1 task', () => {
    expect(evaluateAdvanceGate('r', { latestArtifacts: [], taskCount: 0, checklist: [] })).toEqual({
      ok: false,
      missing: ['tasks'],
    })
    expect(evaluateAdvanceGate('r', { latestArtifacts: [], taskCount: 3, checklist: [] }).ok).toBe(
      true,
    )
  })

  test('o→done exige todo item REQUIRED done; opcional pendente não trava', () => {
    expect(
      evaluateAdvanceGate('o', {
        latestArtifacts: [],
        taskCount: 0,
        checklist: [
          { required: true, done: true },
          { required: true, done: false },
        ],
      }),
    ).toEqual({ ok: false, missing: ['checklist'] })
    expect(
      evaluateAdvanceGate('o', {
        latestArtifacts: [],
        taskCount: 0,
        checklist: [
          { required: true, done: true },
          { required: false, done: false }, // opcional (Toque de Brilho) não trava
        ],
      }).ok,
    ).toBe(true)
    // Checklist VAZIO não trava (nenhum required pendente).
    expect(evaluateAdvanceGate('o', { latestArtifacts: [], taskCount: 0, checklist: [] }).ok).toBe(
      true,
    )
  })

  test('máquina linear z→e→r→o→done', () => {
    expect(PENSA_NEXT_STAGE).toEqual({ z: 'e', e: 'r', r: 'o', o: 'done' })
  })
})

describe('trimConversation — cap de mensagens + chars', () => {
  const opts = { maxMessages: 80, maxChars: 262_144 }

  test('abaixo dos tetos → intacta e na mesma ordem', () => {
    const messages = [msg('a', 0), msg('b', 1), msg('c', 2)]
    expect(trimConversation(messages, opts)).toEqual(messages)
  })

  test('mantém as ÚLTIMAS maxMessages', () => {
    const messages = Array.from({ length: 100 }, (_, i) => msg(`m${i}`, i))
    const trimmed = trimConversation(messages, opts)
    expect(trimmed).toHaveLength(80)
    expect(trimmed[0]?.content).toBe('m20') // as 20 mais antigas caíram
    expect(trimmed[79]?.content).toBe('m99')
  })

  test('teto de chars corta do INÍCIO', () => {
    const messages = [msg('x'.repeat(6), 0), msg('y'.repeat(6), 1), msg('z'.repeat(6), 2)]
    const trimmed = trimConversation(messages, { maxMessages: 80, maxChars: 12 })
    expect(trimmed.map((m) => m.content[0])).toEqual(['y', 'z'])
  })

  test('mensagem mais recente SEMPRE fica, mesmo sozinha acima do teto', () => {
    const messages = [msg('velha', 0), msg('n'.repeat(50), 1)]
    const trimmed = trimConversation(messages, { maxMessages: 80, maxChars: 10 })
    expect(trimmed).toHaveLength(1)
    expect(trimmed[0]?.content).toBe('n'.repeat(50))
  })

  test('vazia → vazia', () => {
    expect(trimConversation([], opts)).toEqual([])
  })
})

describe('pensaStageSourceId — uuid determinístico da etapa (idempotência do award)', () => {
  const CYCLE_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  const CYCLE_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  // uuid v5-like: version 5 + variant RFC 4122 ([89ab]) — exigência do source_id uuid.
  const UUID_V5_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

  test('formato uuid válido (version 5, variant RFC 4122)', () => {
    for (const stage of ['z', 'e', 'r'] as const) {
      expect(pensaStageSourceId(CYCLE_A, stage)).toMatch(UUID_V5_RE)
    }
  })

  test('determinístico: mesma (cycleId, stage) → mesmo uuid', () => {
    expect(pensaStageSourceId(CYCLE_A, 'z')).toBe(pensaStageSourceId(CYCLE_A, 'z'))
  })

  test('distinto por etapa e por ciclo (z/e/r não colidem entre si nem entre ciclos)', () => {
    const ids = [
      pensaStageSourceId(CYCLE_A, 'z'),
      pensaStageSourceId(CYCLE_A, 'e'),
      pensaStageSourceId(CYCLE_A, 'r'),
      pensaStageSourceId(CYCLE_B, 'z'),
      pensaStageSourceId(CYCLE_B, 'e'),
      pensaStageSourceId(CYCLE_B, 'r'),
    ]
    expect(new Set(ids).size).toBe(6)
  })

  test('estável entre versões (snapshot — mudar o namespace/derivação quebraria a idempotência)', () => {
    // Valor CONGELADO: se este teste quebrar, o ledger passaria a ver as etapas
    // antigas como "novas" (XP em dobro). Nunca mude namespace/derivação.
    expect(pensaStageSourceId(CYCLE_A, 'z')).toBe('602a2a9a-fb4d-5bdb-ae91-cdc53a2e10d3')
  })
})
