import { describe, expect, test } from 'bun:test'
import { isValidElement } from 'react'
import { FurniturePrimitive } from '../src/components/kids/room/furniture-models'
import { ROOM_ITEM_INFO, TROPHY_HINT, TROPHY_SHELF_ITEM_ID } from '../src/lib/room-catalog'

/**
 * Todo troféu do quarto tem modelo 3D PRÓPRIO. Um id sem `case` em `FurnitureModel` cai na
 * caixa neutra (`FallbackBox`) em silêncio: a criança ganharia a conquista e veria um cubo
 * cinza no lugar do troféu. A conformância com o members (`catalog-conformance`) garante que o
 * troféu EXISTE aqui; este teste garante que ele tem cara.
 */
describe('troféus do quarto — modelo 3D', () => {
  const trophies = Object.keys(TROPHY_HINT).filter((id) => id !== TROPHY_SHELF_ITEM_ID)

  test('a varredura encontra os troféus (anti-vácuo)', () => {
    expect(trophies.length).toBeGreaterThanOrEqual(8)
    expect(trophies).toContain('trofeu-oficina-completa')
  })

  test.each(trophies)('%s não cai na caixa neutra', (id) => {
    const info = ROOM_ITEM_INFO[id]
    expect(info, `troféu ${id} sem apresentação`).toBeDefined()
    const model = FurniturePrimitive({ itemId: id, w: info?.w ?? 1, h: info?.h ?? 1 })
    expect(isValidElement(model)).toBe(true)
    const type = (model as { type: unknown }).type
    expect(typeof type === 'function' ? type.name : String(type)).not.toBe('FallbackBox')
  })
})
