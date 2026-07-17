import { describe, expect, it } from 'bun:test'
import {
  BLOCK_LEVELS,
  effectiveLevel,
  isBlockTypeAllowed,
  isCategoryAllowed,
  isLevelWithin,
  type LearningProfile,
  levelRank,
  MAX_BLOCK_LEVEL,
  normalizeBlockLevel,
} from '../levels'

describe('levels (escada de 6 — dificuldade × eixo 2D/3D)', () => {
  it('ordena os degraus na ordem da escada (2D antes do 3D em cada dificuldade)', () => {
    for (let i = 1; i < BLOCK_LEVELS.length; i++) {
      const prev = BLOCK_LEVELS[i - 1]
      const curr = BLOCK_LEVELS[i]
      if (!prev || !curr) throw new Error('escada rasgada')
      expect(levelRank(prev)).toBeLessThan(levelRank(curr))
    }
    expect(levelRank('iniciante-2d')).toBeLessThan(levelRank('iniciante-3d'))
    expect(levelRank('iniciante-3d')).toBeLessThan(levelRank('intermediario-2d'))
    expect(MAX_BLOCK_LEVEL).toBe('avancado-3d')
  })

  it('isLevelWithin respeita o teto do degrau (escada TOTAL: int-2d inclui ini-3d)', () => {
    const p: LearningProfile = { level: 'iniciante-2d' }
    expect(isLevelWithin('iniciante-2d', p)).toBe(true)
    expect(isLevelWithin('iniciante-3d', p)).toBe(false)
    expect(isLevelWithin('avancado-3d', p)).toBe(false)
    // A escada é UMA SÓ: o degrau "2D" intermediário INCLUI o iniciante-3d abaixo.
    const int2d: LearningProfile = { level: 'intermediario-2d' }
    expect(isLevelWithin('iniciante-3d', int2d)).toBe(true)
    expect(isLevelWithin('intermediario-3d', int2d)).toBe(false)
  })

  it('revealed sobe o teto efetivo para o topo (avancado-3d)', () => {
    const p: LearningProfile = { level: 'iniciante-2d', revealed: true }
    expect(effectiveLevel(p)).toBe('avancado-3d')
    expect(isLevelWithin('avancado-3d', p)).toBe(true)
  })

  it('allowBlocks (lista da aula) RESTRINGE: só os listados, ignorando o nível', () => {
    const p: LearningProfile = { level: 'iniciante-2d', allowBlocks: ['sz_js_class'] }
    // O listado aparece MESMO sendo avançado (a lista ignora o nível)...
    expect(isBlockTypeAllowed('sz_js_class', 'avancado-2d', p)).toBe(true)
    // ...e qualquer NÃO-listado some, mesmo cabendo no nível (≠ do antigo aditivo).
    expect(isBlockTypeAllowed('sz_val_number', 'iniciante-2d', p)).toBe(false)
  })

  it('com lista da aula, toda categoria é permitida (o descarte de vazia decide)', () => {
    const p: LearningProfile = { level: 'iniciante-2d', allowBlocks: ['sz_js_class'] }
    expect(isCategoryAllowed('Classes', 'avancado-2d', p)).toBe(true)
    expect(isCategoryAllowed('HTML', 'iniciante-2d', p)).toBe(true)
  })

  it('allowCategories força uma categoria acima do nível (sem lista de blocos)', () => {
    const p: LearningProfile = { level: 'iniciante-2d', allowCategories: ['Classes'] }
    expect(isCategoryAllowed('Classes', 'avancado-2d', p)).toBe(true)
    expect(isCategoryAllowed('Objetos', 'intermediario-2d', p)).toBe(false)
  })
})

describe('normalizeBlockLevel (fronteira do legado)', () => {
  it('mapeia a escala legada preservando os conjuntos visíveis de antes', () => {
    // iniciante antigo não via NADA de 3D → base da escada.
    expect(normalizeBlockLevel('iniciante')).toBe('iniciante-2d')
    // intermediário antigo via gk (int-2d) + g3d (ini-3d) + w3d (int-3d) → rank 3.
    expect(normalizeBlockLevel('intermediario')).toBe('intermediario-3d')
    // avançado antigo via tudo → teto.
    expect(normalizeBlockLevel('avancado')).toBe('avancado-3d')
  })

  it('valores novos passam intactos', () => {
    for (const level of BLOCK_LEVELS) expect(normalizeBlockLevel(level)).toBe(level)
  })

  it('ausente → undefined (o caller aplica o próprio default)', () => {
    expect(normalizeBlockLevel(undefined)).toBeUndefined()
    expect(normalizeBlockLevel(null)).toBeUndefined()
  })

  it('lixo → iniciante-2d (fail-CLOSED: jsonb corrompido restringe, nunca abre tudo)', () => {
    expect(normalizeBlockLevel('banana')).toBe('iniciante-2d')
    expect(normalizeBlockLevel('AVANCADO')).toBe('iniciante-2d')
    expect(normalizeBlockLevel('')).toBe('iniciante-2d')
  })
})
