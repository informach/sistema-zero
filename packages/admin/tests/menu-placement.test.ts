import { describe, expect, test } from 'bun:test'
import { placeMenu, triggerOutOfView } from '../src/lib/menu-placement'

const phone = { width: 360, height: 640 }

describe('posição dos menus "Mais" e "Ações" na janela', () => {
  test('gatilho perto da borda esquerda: o menu alinhado à direita não sai pela esquerda', () => {
    const place = placeMenu({
      trigger: { top: 100, bottom: 144, left: 16, right: 100 },
      menu: { width: 288, height: 200 },
      viewport: phone,
    })
    expect(place.left).toBe(8)
  })

  test('gatilho perto da borda direita: o menu alinhado à esquerda não sai pela direita', () => {
    const place = placeMenu({
      trigger: { top: 100, bottom: 144, left: 300, right: 344 },
      menu: { width: 288, height: 200 },
      viewport: phone,
      align: 'start',
    })
    expect(place.left).toBe(360 - 8 - 288)
    expect(place.left + 288).toBeLessThanOrEqual(360 - 8)
  })

  test('com espaço, segue o alinhamento pedido', () => {
    const viewport = { width: 1200, height: 800 }
    const button = { top: 100, bottom: 144, left: 600, right: 700 }
    const menu = { width: 288, height: 200 }
    expect(placeMenu({ trigger: button, menu, viewport, align: 'end' }).left).toBe(700 - 288)
    expect(placeMenu({ trigger: button, menu, viewport, align: 'start' }).left).toBe(600)
  })

  test('menu mais largo que a tela: encosta na margem e a largura máxima cabe entre as duas', () => {
    const place = placeMenu({
      trigger: { top: 100, bottom: 144, left: 200, right: 300 },
      menu: { width: 500, height: 200 },
      viewport: phone,
    })
    expect(place.left).toBe(8)
    expect(place.maxWidth).toBe(360 - 16)
  })

  test('sem espaço embaixo, abre para cima e limita a altura ao que cabe em cima', () => {
    const place = placeMenu({
      trigger: { top: 560, bottom: 604, left: 200, right: 300 },
      menu: { width: 288, height: 300 },
      viewport: phone,
    })
    expect(place.top).toBeUndefined()
    expect(place.bottom).toBe(640 - 560 + 4)
    expect(place.maxHeight).toBe(560 - 4 - 8)
  })

  test('tela baixa: fica do lado com mais espaço e rola por dentro', () => {
    const place = placeMenu({
      trigger: { top: 40, bottom: 84, left: 200, right: 300 },
      menu: { width: 288, height: 900 },
      viewport: { width: 800, height: 400 },
    })
    expect(place.top).toBe(88)
    expect(place.maxHeight).toBe(400 - 84 - 4 - 8)
  })

  test('o gatilho fora da janela, em qualquer direção, conta como fora de vista', () => {
    const inside = { top: 100, bottom: 140, left: 100, right: 200 }
    expect(triggerOutOfView(inside, phone)).toBe(false)
    expect(triggerOutOfView({ ...inside, top: -60, bottom: -20 }, phone)).toBe(true)
    expect(triggerOutOfView({ ...inside, top: 700, bottom: 740 }, phone)).toBe(true)
    expect(triggerOutOfView({ ...inside, left: -150, right: -50 }, phone)).toBe(true)
    expect(triggerOutOfView({ ...inside, left: 400, right: 500 }, phone)).toBe(true)
  })
})
