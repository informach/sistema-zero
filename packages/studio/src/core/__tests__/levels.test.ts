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

  it('allowBlocks (lista da aula) RESTRINGE: só os listados, ignorando o nível', () => {
    const p: LearningProfile = { level: 'iniciante', allowBlocks: ['sz_js_class'] }
    // O listado aparece MESMO sendo avançado (a lista ignora o nível)...
    expect(isBlockTypeAllowed('sz_js_class', 'avancado', p)).toBe(true)
    // ...e qualquer NÃO-listado some, mesmo cabendo no nível (≠ do antigo aditivo).
    expect(isBlockTypeAllowed('sz_val_number', 'iniciante', p)).toBe(false)
  })

  it('com lista da aula, toda categoria é permitida (o descarte de vazia decide)', () => {
    const p: LearningProfile = { level: 'iniciante', allowBlocks: ['sz_js_class'] }
    expect(isCategoryAllowed('Classes', 'avancado', p)).toBe(true)
    expect(isCategoryAllowed('HTML', 'iniciante', p)).toBe(true)
  })

  it('allowCategories força uma categoria acima do nível (sem lista de blocos)', () => {
    const p: LearningProfile = { level: 'iniciante', allowCategories: ['Classes'] }
    expect(isCategoryAllowed('Classes', 'avancado', p)).toBe(true)
    expect(isCategoryAllowed('Objetos', 'intermediario', p)).toBe(false)
  })
})
