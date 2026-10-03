import { describe, expect, test } from 'bun:test'
import { type TrailArtArea, trailArtPlacement } from '../src/components/kids/trail-layout'

function expectFree(area: TrailArtArea) {
  const result = trailArtPlacement(area, 'left')
  const left = result.side === 'left' ? 0 : area.width - area.artWidth
  const right = left + area.artWidth
  const bottom = result.top + area.artHeight
  expect(left).toBeGreaterThanOrEqual(0)
  expect(right).toBeLessThanOrEqual(area.width)
  expect(result.top).toBeGreaterThanOrEqual(0)
  expect(bottom).toBeLessThanOrEqual(area.height + result.extraHeight + 0.001)
  for (const obstacle of area.obstacles) {
    expect(
      right + 12 <= obstacle.left + 0.001 ||
        left >= obstacle.left + obstacle.width + 12 - 0.001 ||
        bottom + 12 <= obstacle.top + 0.001 ||
        result.top >= obstacle.top + obstacle.height + 12 - 0.001,
    ).toBe(true)
  }
  return result
}

describe('posição do Rive com tamanho real', () => {
  test('250 px cabem ao lado de uma unidade curta no desktop, sem aumentar a trilha', () => {
    const area = {
      width: 640,
      height: 240,
      artWidth: 250,
      artHeight: (250 * 8) / 9,
      obstacles: [
        { left: 264, top: 0, width: 112, height: 108 },
        { left: 332, top: 120, width: 112, height: 110 },
      ],
    }
    expect(expectFree(area)).toMatchObject({ side: 'left', extraHeight: 0 })
  })

  test('o lado livre vence a preferência, incluindo o espaço da legenda e do balão', () => {
    const area = {
      width: 640,
      height: 400,
      artWidth: 250,
      artHeight: 223,
      obstacles: [
        { left: 80, top: -40, width: 210, height: 300 },
        { left: 70, top: 270, width: 112, height: 130 },
      ],
    }
    expect(expectFree(area)).toMatchObject({ side: 'right', extraHeight: 0 })
  })

  test('sem espaço lateral, reserva altura depois do baú sem invadir a próxima unidade', () => {
    const area = {
      width: 280,
      height: 208,
      artWidth: 130,
      artHeight: (130 * 8) / 9,
      obstacles: [
        { left: 84, top: 0, width: 112, height: 92 },
        { left: 84, top: 104, width: 112, height: 120 },
      ],
    }
    const result = expectFree(area)
    expect(result.top).toBe(236)
    expect(result.extraHeight).toBeGreaterThan(0)
  })

  test('as duas laterais respeitam a preferência somente quando têm o mesmo espaço', () => {
    const area = {
      width: 640,
      height: 300,
      artWidth: 250,
      artHeight: 223,
      obstacles: [{ left: 264, top: 0, width: 112, height: 300 }],
    }
    expect(trailArtPlacement(area, 'right').side).toBe('right')
    expect(trailArtPlacement(area, 'left').side).toBe('left')
  })

  test('a caixa inteira cabe em diferentes fases da curva, larguras e quantidades de aulas', () => {
    for (const width of [256, 280, 326, 366, 480, 640]) {
      for (const rows of [2, 3, 5, 9]) {
        for (let phase = 0; phase < 12; phase++) {
          const mobile = width < 480
          const rowHeight = mobile ? 104 : 120
          const artWidth = mobile ? Math.min(160, Math.max(130, width * 0.45)) : 250
          expectFree({
            width,
            height: rows * rowHeight,
            artWidth,
            artHeight: (artWidth * 8) / 9,
            obstacles: Array.from({ length: rows }, (_, i) => ({
              left: width / 2 + Math.sin(((phase + i) * Math.PI) / 6) * 2 * (mobile ? 36 : 68) - 56,
              top: i * rowHeight - (i === 0 ? 40 : 0),
              width: 112,
              height: i === 0 ? rowHeight + 32 : rowHeight - 8,
            })),
          })
        }
      }
    }
  })
})
