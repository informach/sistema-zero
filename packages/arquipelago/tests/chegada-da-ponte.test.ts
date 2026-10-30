import { describe, expect, test } from 'bun:test'
import { ILHAS, ilhasDoAnel } from '@sistemazero/arquipelago-contracts'
import { legendaDaChegada } from '../src/interface/chegada'
import {
  CHEGADA,
  DURACAO_COM_MENOS_MOVIMENTO,
  DURACAO_DA_CHEGADA,
  etapaDaChegada,
  falaDaChegada,
  ilhaParaChegar,
  palcoDaChegada,
  podeComecarAChegada,
  progressoDaChegada,
  vistaDaChegada,
  zappyNaChegada,
} from '../src/mundo/chegada-da-ponte'

const bosque = ILHAS.find((i) => i.id === 'bosque')!
const livre = {
  dentroDeCasa: false,
  menuAberto: false,
  painelAberto: null,
  ferramentaAberta: false,
  visita: null,
  correndo: false,
}

describe('a cena da subida de posto', () => {
  test('as três etapas, na ordem, e o fim', () => {
    expect(etapaDaChegada(0)).toBe('voo')
    expect(etapaDaChegada(CHEGADA.voo + 0.01)).toBe('ponte')
    expect(etapaDaChegada(CHEGADA.voo + CHEGADA.ponte + 0.01)).toBe('travessia')
    expect(etapaDaChegada(DURACAO_DA_CHEGADA)).toBe('fim')
    expect(etapaDaChegada(0, true)).toBe('ponte')
    expect(etapaDaChegada(DURACAO_COM_MENOS_MOVIMENTO, true)).toBe('fim')
  })

  test('a ponte só se monta depois do voo, de 0 a 1, e fica montada', () => {
    expect(progressoDaChegada(0)).toBe(0)
    expect(progressoDaChegada(CHEGADA.voo)).toBe(0)
    expect(progressoDaChegada(CHEGADA.voo + CHEGADA.ponte / 2)).toBeCloseTo(0.5)
    expect(progressoDaChegada(CHEGADA.voo + CHEGADA.ponte)).toBe(1)
    expect(progressoDaChegada(DURACAO_DA_CHEGADA + 5)).toBe(1)
    let antes = -1
    for (let t = 0; t <= DURACAO_DA_CHEGADA; t += 0.1) {
      const p = progressoDaChegada(t)
      expect(p).toBeGreaterThanOrEqual(antes)
      antes = p
    }
  })

  test('a próxima ilha é a de menor posto aberta e ainda não vista', () => {
    expect(ilhaParaChegar(1, [])).toBeNull()
    expect(ilhaParaChegar(2, [])?.id).toBe('bosque')
    expect(ilhaParaChegar(3, [])?.id).toBe('bosque')
    expect(ilhaParaChegar(3, ['bosque'])?.id).toBe('vila-doce')
    const todas = ilhasDoAnel().map((i) => i.id)
    expect(ilhaParaChegar(8, todas)).toBeNull()
  })

  test('só começa com o mundo livre e a criança fora de casa', () => {
    expect(podeComecarAChegada(livre)).toBe(true)
    expect(podeComecarAChegada({ ...livre, dentroDeCasa: true })).toBe(false)
    expect(podeComecarAChegada({ ...livre, menuAberto: true })).toBe(false)
    expect(podeComecarAChegada({ ...livre, painelAberto: 'diario' })).toBe(false)
    expect(podeComecarAChegada({ ...livre, ferramentaAberta: true })).toBe(false)
    expect(podeComecarAChegada({ ...livre, visita: { casa: 'x' } })).toBe(false)
    expect(podeComecarAChegada({ ...livre, correndo: true })).toBe(false)
  })

  test('a câmera não dá saltos entre as etapas e sempre olha para perto da ponte ou da ilha', () => {
    for (const ilha of ilhasDoAnel()) {
      const palco = palcoDaChegada(ilha)
      let antes = vistaDaChegada(palco, 0)
      for (let t = 0.05; t <= DURACAO_DA_CHEGADA; t += 0.05) {
        const v = vistaDaChegada(palco, t)
        const salto = Math.hypot(
          v.posicao.x - antes.posicao.x,
          v.posicao.y - antes.posicao.y,
          v.posicao.z - antes.posicao.z,
        )
        // 0,05 s por passo: nada anda mais que uns 40 m/s.
        expect(salto).toBeLessThan(2)
        antes = v
      }
      // Com menos movimento, a câmera fica parada a cena inteira.
      expect(vistaDaChegada(palco, 0, true)).toEqual(vistaDaChegada(palco, 3, true))
    }
  })

  test('o Zappy sai de perto da criança e termina o voo sobre a ilha', () => {
    const palco = palcoDaChegada(bosque)
    const origem = { x: 1, y: 2, z: 3 }
    expect(zappyNaChegada(palco, 0, origem)).toEqual(origem)
    const fim = zappyNaChegada(palco, CHEGADA.voo, origem)
    expect(Math.hypot(fim.x - palco.ilha.x, fim.z - palco.ilha.z)).toBeLessThan(0.01)
    expect(fim.y).toBeGreaterThan(palco.ilha.y)
  })

  test('a legenda e a fala seguem as regras do texto da casa', () => {
    const textos = [
      legendaDaChegada('Bosque dos Bichos', 'o', 'voo'),
      legendaDaChegada('Bosque dos Bichos', 'o', 'ponte'),
      legendaDaChegada('Vila Doce', 'a', 'travessia'),
      falaDaChegada(bosque, 'o'),
    ]
    for (const t of textos) {
      expect(t).not.toMatch(/[—–!]/)
      expect(t.endsWith('?')).toBe(false)
    }
    expect(textos[0]).toContain('o Bosque dos Bichos')
  })
})
