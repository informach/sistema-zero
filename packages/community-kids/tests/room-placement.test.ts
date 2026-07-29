import { describe, expect, test } from 'bun:test'
import { freeFloorSpot, freeWallSpot, isFreeAt } from '../src/components/kids/room/placement'

describe('regras de posicionamento do quarto', () => {
  test('não sobrepõe móveis ao procurar a primeira vaga no chão', () => {
    const items = [{ itemId: 'sofa', x: 0, y: 0, rot: 0 as const }]

    expect(freeFloorSpot(items, 1, 1)).toEqual({ x: 3, y: 0 })
    expect(isFreeAt(items, -1, false, undefined, 1, 1, 1, 1)).toBe(false)
  })

  test('mantém paredes independentes e procura o ponto mais alto disponível', () => {
    const items = [{ itemId: 'janela', x: 0, y: 3, wall: 'right' as const }]

    expect(freeWallSpot(items, 1, 1)).toEqual({ wall: 'right', u: 2, v: 3 })
    expect(isFreeAt(items, -1, true, 'left', 0, 3, 2, 2)).toBe(true)
  })
})
