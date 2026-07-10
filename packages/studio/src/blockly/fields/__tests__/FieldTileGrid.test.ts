import { describe, expect, it } from 'bun:test'
import { normalizeRect, parseGridText, resizeGrid, serializeGrid } from '../FieldTileGrid'

/**
 * Helpers PUROS do editor visual de grade ("Criar mapa de tiles"). A tokenização
 * espelha o `parseGrid` do runtime byte a byte — o que o editor lê/grava é o que
 * o jogo lê. (A UI do DropDownDiv é QA de browser; happy-dom não desenha canvas.)
 */

describe('parseGridText (mesmas regras do runtime)', () => {
  it('espaço/vírgula separam colunas; ";" e quebras separam linhas; "."/"-" = -1', () => {
    expect(parseGridText('0 1 1 .;. . 2 .')).toEqual([
      [0, 1, 1, -1],
      [-1, -1, 2, -1],
    ])
    expect(parseGridText('0,1\n2 -')).toEqual([
      [0, 1],
      [2, -1],
    ])
  })

  it('token inválido vira -1; linhas vazias somem; texto vazio = []', () => {
    expect(parseGridText('x 3')).toEqual([[-1, 3]])
    expect(parseGridText(';;')).toEqual([])
    expect(parseGridText('')).toEqual([])
  })
})

describe('normalizeRect + serializeGrid (round-trip canônico)', () => {
  it('preenche linhas irregulares com -1 e serializa de volta com "."', () => {
    const { cells, cols, rows } = normalizeRect(parseGridText('0 1 2;3'))
    expect(cols).toBe(3)
    expect(rows).toBe(2)
    expect(cells).toEqual([
      [0, 1, 2],
      [3, -1, -1],
    ])
    expect(serializeGrid(cells)).toBe('0 1 2;3 . .')
  })

  it('a grade do exemplo do manifest sobrevive parse → serialize sem mudança', () => {
    const original = '0 0 0 0;0 0 0 0;1 1 1 1'
    const { cells } = normalizeRect(parseGridText(original))
    expect(serializeGrid(cells)).toBe(original)
  })
})

describe('resizeGrid', () => {
  it('cresce com células vazias e recorta preservando o canto superior esquerdo', () => {
    const base = [
      [0, 1],
      [2, 3],
    ]
    expect(resizeGrid(base, 3, 3)).toEqual([
      [0, 1, -1],
      [2, 3, -1],
      [-1, -1, -1],
    ])
    expect(resizeGrid(base, 1, 1)).toEqual([[0]])
  })
})
