import { describe, expect, test } from 'bun:test'
import { criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import {
  alcancaOCristalRaro,
  CRISTAL_RARO,
  FALA_DO_CRISTAL_RARO,
  pegarOCristalRaro,
  temOCristalRaro,
} from '../src/sistemas/cristal-raro'
import { ITENS, itensParaDar } from '../src/sistemas/itens'

describe('o cristal raro da caverna do Pico', () => {
  test('pegar põe o cristal rosa na mochila uma vez só', () => {
    const s = criarSalvamentoInicial(new Date('2026-10-29T12:00:00Z'))
    expect(temOCristalRaro(s)).toBe(false)
    const depois = pegarOCristalRaro(s)
    expect(temOCristalRaro(depois)).toBe(true)
    expect(depois.inventario[CRISTAL_RARO.item]).toBe(1)
    expect(pegarOCristalRaro(depois)).toBe(depois)
  })

  test('é uma lembrança: não se come nem se dá de presente', () => {
    const item = ITENS[CRISTAL_RARO.item]
    expect(item?.lembranca).toBe(true)
    expect(item?.comida).toBeUndefined()
    const s = pegarOCristalRaro(criarSalvamentoInicial(new Date('2026-10-29T12:00:00Z')))
    expect(itensParaDar(s.inventario).some(({ item }) => item.id === CRISTAL_RARO.item)).toBe(false)
  })

  test('alcança de pé no alto da saliência, não de baixo dela', () => {
    const cristal = { x: -24, y: 3.65, z: 2.3 }
    expect(alcancaOCristalRaro(cristal, { x: -23.2, y: 3.65, z: 2.3 })).toBe(true)
    expect(alcancaOCristalRaro(cristal, { x: -23.2, y: 1, z: 2.3 })).toBe(false)
    expect(alcancaOCristalRaro(cristal, { x: -21, y: 3.65, z: 2.3 })).toBe(false)
  })

  test('a fala segue as regras de texto', () => {
    expect(FALA_DO_CRISTAL_RARO).not.toMatch(/[—!]/)
    expect(FALA_DO_CRISTAL_RARO.split('.')[0]?.endsWith('?')).toBe(false)
  })
})
