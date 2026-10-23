import { describe, expect, test } from 'bun:test'
import { placeMenu } from '../src/lib/menu-placement'

const viewport = { width: 1000, height: 800 }
const trigger = (top: number, bottom: number) => ({ top, bottom, left: 800, right: 900 })
const menu = (height: number) => ({ width: 256, height })

describe('menu "Ações" das contas: para onde abre', () => {
  test('com espaço embaixo, abre embaixo do botão, alinhado à direita dele', () => {
    const place = placeMenu({ trigger: trigger(100, 140), menu: menu(300), viewport })
    expect(place).toEqual({
      top: 144,
      left: 900 - 256,
      maxHeight: 800 - 140 - 4 - 8,
      maxWidth: 1000 - 16,
    })
  })

  test('na última linha da tela, abre para cima', () => {
    const place = placeMenu({ trigger: trigger(700, 740), menu: menu(300), viewport })
    expect(place.top).toBeUndefined()
    expect(place.bottom).toBe(800 - 700 + 4)
    expect(place.maxHeight).toBe(700 - 4 - 8)
  })

  test('sem espaço nem em cima, fica embaixo e rola por dentro', () => {
    const place = placeMenu({ trigger: trigger(60, 100), menu: menu(2000), viewport })
    expect(place.top).toBe(104)
    expect(place.maxHeight).toBe(800 - 100 - 4 - 8)
  })
})
