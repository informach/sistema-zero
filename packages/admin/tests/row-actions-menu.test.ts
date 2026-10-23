import { describe, expect, test } from 'bun:test'
import { menuPlacement } from '../src/app/admin/usuarios/row-actions-menu'

const viewport = { width: 1000, height: 800 }

describe('menu "Ações" das contas: para onde abre', () => {
  test('com espaço embaixo, abre embaixo do botão', () => {
    const place = menuPlacement({ top: 100, bottom: 140, right: 900 }, 300, viewport)
    expect(place).toEqual({ top: 144, right: 100, maxHeight: 800 - 140 - 4 - 8 })
  })

  test('na última linha da tela, abre para cima', () => {
    const place = menuPlacement({ top: 700, bottom: 740, right: 900 }, 300, viewport)
    expect(place.top).toBeUndefined()
    expect(place.bottom).toBe(800 - 700 + 4)
    expect(place.maxHeight).toBe(700 - 4 - 8)
  })

  test('sem espaço nem em cima, fica embaixo e rola por dentro', () => {
    const place = menuPlacement({ top: 60, bottom: 100, right: 900 }, 2000, viewport)
    expect(place.top).toBe(104)
    expect(place.maxHeight).toBe(800 - 100 - 4 - 8)
  })
})
