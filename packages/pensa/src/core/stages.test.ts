import { describe, expect, it } from 'bun:test'
import { makeCycle } from '../testing/fakeTransport'
import { isStageDone, nextStage, STAGE_ORDER, stageIndex, stageLabel } from './stages'

describe('stages (máquina pura)', () => {
  it('mantém a ordem canônica z → e → r → o', () => {
    expect([...STAGE_ORDER]).toEqual(['z', 'e', 'r', 'o'])
  })

  it('nextStage avança z→e→r→o→done', () => {
    expect(nextStage('z')).toBe('e')
    expect(nextStage('e')).toBe('r')
    expect(nextStage('r')).toBe('o')
    expect(nextStage('o')).toBe('done')
  })

  it('stageIndex posiciona cada etapa (done = fim da trilha)', () => {
    expect(stageIndex('z')).toBe(0)
    expect(stageIndex('e')).toBe(1)
    expect(stageIndex('r')).toBe(2)
    expect(stageIndex('o')).toBe(3)
    expect(stageIndex('done')).toBe(4)
  })

  it('isStageDone lê o carimbo *CompletedAt do ciclo', () => {
    const cycle = makeCycle({
      stage: 'e',
      zCompletedAt: '2026-06-30T12:00:00.000Z',
    })
    expect(isStageDone(cycle, 'z')).toBe(true)
    expect(isStageDone(cycle, 'e')).toBe(false)
    expect(isStageDone(cycle, 'r')).toBe(false)
    expect(isStageDone(cycle, 'o')).toBe(false)
  })

  it('stageLabel devolve os nomes por mode', () => {
    expect(stageLabel('kids', 'z')).toBe('Zerar a Bagunça')
    expect(stageLabel('kids', 'e')).toBe('Enxergar o Jogo')
    expect(stageLabel('kids', 'r')).toBe('Rodar as Missões')
    expect(stageLabel('kids', 'o')).toBe('O Grande Lançamento')
    expect(stageLabel('adult', 'z')).toBe('Zerar a Confusão')
    expect(stageLabel('adult', 'e')).toBe('Esboçar o Sistema')
    expect(stageLabel('adult', 'r')).toBe('Rodar por Partes')
    expect(stageLabel('adult', 'o')).toBe('Operar de Verdade')
  })
})
