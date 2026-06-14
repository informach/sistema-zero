import { describe, expect, it } from 'bun:test'
import {
  effectiveLevel,
  isBlockTypeAllowed,
  isCategoryAllowed,
  isLevelWithin,
  type LearningProfile,
  levelRank,
} from '../levels'

describe('levels', () => {
  it('ordena os níveis', () => {
    expect(levelRank('iniciante')).toBeLessThan(levelRank('intermediario'))
    expect(levelRank('intermediario')).toBeLessThan(levelRank('avancado'))
  })

  it('isLevelWithin respeita o teto do nível', () => {
    const p: LearningProfile = { level: 'iniciante' }
    expect(isLevelWithin('iniciante', p)).toBe(true)
    expect(isLevelWithin('intermediario', p)).toBe(false)
    expect(isLevelWithin('avancado', p)).toBe(false)
  })

  it('revealed sobe o teto efetivo para avancado', () => {
    const p: LearningProfile = { level: 'iniciante', revealed: true }
    expect(effectiveLevel(p)).toBe('avancado')
    expect(isLevelWithin('avancado', p)).toBe(true)
  })

  it('allowBlocks força um bloco acima do nível', () => {
    const p: LearningProfile = { level: 'iniciante', allowBlocks: ['sz_js_class'] }
    expect(isBlockTypeAllowed('sz_js_class', 'avancado', p)).toBe(true)
    expect(isBlockTypeAllowed('sz_outro', 'avancado', p)).toBe(false)
  })

  it('allowCategories força uma categoria acima do nível', () => {
    const p: LearningProfile = { level: 'iniciante', allowCategories: ['Classes'] }
    expect(isCategoryAllowed('Classes', 'avancado', p)).toBe(true)
    expect(isCategoryAllowed('Objetos', 'intermediario', p)).toBe(false)
  })
})
