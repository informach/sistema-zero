import { describe, expect, test } from 'bun:test'
import {
  applyPensaCommand,
  createPensaJourney,
  nextPensaMission,
  type PensaProposal,
  pensaZeroStage,
} from '../src/pensa'

const now = '2026-10-14T12:00:00.000Z'
const initial = () => createPensaJourney('project', 'cycle', now)

describe('Pensa: autoria, evidência e retomada', () => {
  test('adaptar o caminho preserva o histórico mas exige observar o novo resultado', () => {
    const state = {
      ...initial(),
      stage: 'observing' as const,
      missionIds: ['move'],
      tests: [
        {
          id: 't',
          result: 'met' as const,
          source: 'child' as const,
          note: '',
          creationId: 'game',
          saveRevision: '1',
          at: now,
        },
      ],
      checkpoint: {
        id: 'cp',
        cycleId: 'cycle',
        creationId: 'game',
        saveRevision: '1',
        planRevision: 0,
        createdAt: now,
      },
    }
    const revised = applyPensaCommand(state, 0, { type: 'revise' }, now)
    const built = { ...revised, stage: 'building' as const, revising: false }
    const observed = applyPensaCommand(built, built.revision, { type: 'observe' }, now)
    expect(observed.tests).toEqual(state.tests)
    expect(() =>
      applyPensaCommand(observed, observed.revision, { type: 'close', reason: 'met' }, now),
    ).toThrow()
  })
  test('pausar e retomar mantém ideia, ciclo e ZERO sem criar versão', () => {
    const paused = applyPensaCommand(initial(), 0, { type: 'pause' }, now)
    const resumed = applyPensaCommand(paused, 1, { type: 'resume' }, now)
    expect(resumed.cycleId).toBe('cycle')
    expect(resumed.stage).toBe('idea')
    expect(resumed.paused).toBe(false)
    expect(pensaZeroStage(resumed)).toBe('z')
  })

  test('encerrar uma ideia incompleta não anuncia jogo pronto e pode retomar', () => {
    const closed = applyPensaCommand(initial(), 0, { type: 'close', reason: 'incomplete' }, now)
    expect(pensaZeroStage(closed)).toBe('z')
    const resumed = applyPensaCommand(closed, 1, { type: 'resume' }, now)
    expect(resumed.stage).toBe('idea')
    expect(resumed.closedReason).toBeNull()
  })

  test('aceitação antiga e escrita concorrente são recusadas', () => {
    const state = {
      ...initial(),
      stage: 'proposal' as const,
      proposal: { id: 'new' } as PensaProposal,
    }
    expect(() => applyPensaCommand(state, 0, { type: 'accept', proposalId: 'old' }, now)).toThrow(
      'proposta mudou',
    )
    expect(() => applyPensaCommand(state, 1, { type: 'pause' }, now)).toThrow('outra tela')
    const accepted = applyPensaCommand(state, 0, { type: 'accept', proposalId: 'new' }, now)
    expect(accepted.stage).toBe('preparing')
    expect(pensaZeroStage(accepted)).toBe('e')
  })

  test('teste negativo permanece no histórico quando a criança escolhe corrigir', () => {
    const state = { ...initial(), stage: 'observing' as const, missionIds: ['move'] }
    const observed = applyPensaCommand(
      state,
      0,
      {
        type: 'record_test',
        test: {
          id: 'test',
          result: 'needs_adjustment',
          source: 'child',
          note: 'O ovo não apareceu',
          creationId: 'game',
          saveRevision: 'saved-1',
          at: now,
        },
      },
      now,
    )
    expect(() => applyPensaCommand(observed, 1, { type: 'close', reason: 'met' }, now)).toThrow()
    const repair = applyPensaCommand(observed, 1, { type: 'repair' }, now)
    expect(repair.stage).toBe('building')
    expect(repair.tests).toEqual(observed.tests)
  })

  test('sucesso de uma revisão não conclui a versão protegida de outra', () => {
    const state = {
      ...initial(),
      stage: 'observing' as const,
      tests: [
        {
          id: 't',
          result: 'met' as const,
          source: 'child' as const,
          note: '',
          creationId: 'game',
          saveRevision: 'new',
          at: now,
        },
      ],
      checkpoint: {
        id: 'cp',
        cycleId: 'cycle',
        creationId: 'game',
        saveRevision: 'old',
        planRevision: 0,
        createdAt: now,
      },
    }
    expect(() => applyPensaCommand(state, 0, { type: 'close', reason: 'met' }, now)).toThrow()
    expect(
      applyPensaCommand(
        { ...state, checkpoint: { ...state.checkpoint, saveRevision: 'new' } },
        0,
        { type: 'close', reason: 'met' },
        now,
      ).closedReason,
    ).toBe('met')
  })

  test('uma conclusão histórica não libera dependências após restauração', () => {
    const missions = [
      { id: 'move', dependencies: [], status: 'completed' as const, evidenceCurrent: false },
      { id: 'rescue', dependencies: ['move'], status: 'planned' as const, evidenceCurrent: true },
      { id: 'paint', dependencies: [], status: 'planned' as const, evidenceCurrent: true },
    ]
    expect(nextPensaMission(missions)).toBe('paint')
    expect(
      nextPensaMission([{ ...missions[0]!, evidenceCurrent: true }, ...missions.slice(1)]),
    ).toBe('rescue')
  })
})
