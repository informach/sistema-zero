import { describe, expect, test } from 'bun:test'
import { criarControle } from '../src/controles/controle'
import {
  aplicarPedido,
  BOTOES,
  type LeituraDoGamepad,
  lerPedido,
  semZonaMorta,
  ZONA_MORTA,
} from '../src/controles/gamepad'

/** Um controle com os analógicos e os botões apertados pedidos. */
function pad(axes: number[], apertados: number[] = []): LeituraDoGamepad {
  return {
    axes,
    buttons: Array.from({ length: 17 }, (_, i) => ({
      pressed: apertados.includes(i),
      value: apertados.includes(i) ? 1 : 0,
    })),
  }
}

describe('o controle físico', () => {
  test('a zona morta ignora o analógico quase no centro e reescala o resto', () => {
    expect(semZonaMorta(0.1, 0.05)).toEqual({ x: 0, y: 0 })
    const fim = semZonaMorta(1, 0)
    expect(fim.x).toBeCloseTo(1)
    const meio = semZonaMorta(ZONA_MORTA + (1 - ZONA_MORTA) / 2, 0)
    expect(meio.x).toBeCloseTo(0.5)
  })

  test('o analógico esquerdo anda (para cima é frente) e todo empurrado corre', () => {
    const p = lerPedido(pad([0, -1, 0, 0]))
    expect(p.andarZ).toBeCloseTo(1)
    expect(p.correr).toBe(true)
    const devagar = lerPedido(pad([0, -0.5, 0, 0]))
    expect(devagar.correr).toBe(false)
    expect(lerPedido(pad([0, -0.5, 0, 0], [BOTOES.gatilhoDireito])).correr).toBe(true)
  })

  test('cada aperto conta uma vez: pular, usar, recentrar e o menu', () => {
    const c = criarControle()
    let menus = 0
    const abrir = () => menus++
    const solto = lerPedido(pad([0, 0, 0, 0]))
    const tudo = lerPedido(
      pad([0, 0, 0, 0], [BOTOES.pular, BOTOES.usar, BOTOES.recentrar, BOTOES.menu]),
    )
    aplicarPedido(c, tudo, solto, abrir)
    aplicarPedido(c, tudo, tudo, abrir)
    expect(c.pulos).toBe(1)
    expect(c.usar).toBe(1)
    expect(c.recentrar).toBe(1)
    expect(menus).toBe(1)
    expect(c.pular).toBe(true)
    aplicarPedido(c, solto, tudo, abrir)
    expect(c.pular).toBe(false)
  })

  test('parado, não briga com o teclado; ao soltar, para', () => {
    const c = criarControle()
    c.eixoZ = 1 // o teclado pediu frente
    const solto = lerPedido(pad([0, 0, 0, 0]))
    aplicarPedido(c, solto, solto, () => {})
    expect(c.eixoZ).toBe(1)
    const andando = lerPedido(pad([1, 0, 0, 0]))
    aplicarPedido(c, andando, solto, () => {})
    expect(c.eixoX).toBeCloseTo(1)
    aplicarPedido(c, solto, andando, () => {})
    expect(c.eixoX).toBe(0)
  })

  test('o analógico direito vai para a câmera', () => {
    const c = criarControle()
    aplicarPedido(c, lerPedido(pad([0, 0, 1, 0])), null, () => {})
    expect(c.cameraX).toBeCloseTo(1)
    expect(c.cameraY).toBe(0)
  })
})
