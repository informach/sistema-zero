import { describe, expect, test } from 'bun:test'
import {
  ATRAS_DO_ZAPPY,
  DURACAO_DA_ESPIADA,
  diferencaDeAngulo,
  ESPERA_PARA_OLHAR_PARA_ELA,
  giroPara,
  INCLINACAO_MAXIMA,
  inclinacaoNaCurva,
  LADO_DO_ZAPPY,
  lugarAoLado,
  MERGULHO_MAXIMO,
  mergulho,
  PERIODO_DA_ESPIADA,
  PRIMEIRA_ESPIADA,
  paraOndeOlhar,
  RAPIDEZ_EM_VOLTA,
  suavizarAngulo,
} from '../src/sistemas/zappy'

const centro = { x: 0, z: 0 }
/** Para onde aponta o giro `d` no chão (a convenção do avatar e do modelo). */
const frente = (d: number) => ({ x: Math.sin(d), z: Math.cos(d) })
/** A direita de quem olha para `d`. */
const direita = (d: number) => ({ x: -Math.cos(d), z: Math.sin(d) })
const ponto = (p: { x: number; z: number }, d: { x: number; z: number }) => p.x * d.x + p.z * d.z

describe('ângulos', () => {
  test('a diferença é sempre o caminho mais curto', () => {
    expect(diferencaDeAngulo(0, Math.PI / 2)).toBeCloseTo(Math.PI / 2)
    expect(diferencaDeAngulo(Math.PI * 0.9, -Math.PI * 0.9)).toBeCloseTo(Math.PI * 0.2)
    expect(diferencaDeAngulo(-Math.PI * 0.9, Math.PI * 0.9)).toBeCloseTo(-Math.PI * 0.2)
    expect(diferencaDeAngulo(0, Math.PI * 4 + 0.1)).toBeCloseTo(0.1)
  })

  test('suavizar chega perto sem passar do alvo e atravessa o ±π pelo lado curto', () => {
    let a = Math.PI * 0.9
    for (let i = 0; i < 120; i++) a = suavizarAngulo(a, -Math.PI * 0.9, RAPIDEZ_EM_VOLTA, 1 / 60)
    expect(Math.abs(diferencaDeAngulo(a, -Math.PI * 0.9))).toBeLessThan(0.01)
    const umPasso = suavizarAngulo(0, 1, RAPIDEZ_EM_VOLTA, 1 / 60)
    expect(umPasso).toBeGreaterThan(0)
    expect(umPasso).toBeLessThan(1)
  })
})

describe('onde o Zappy voa', () => {
  test('à direita e um pouco atrás de onde ela olha, em qualquer direção', () => {
    for (const d of [0, Math.PI / 2, Math.PI, -Math.PI / 2, 0.7, -2.4]) {
      const lugar = lugarAoLado(centro, d)
      expect(ponto(lugar, direita(d))).toBeCloseTo(LADO_DO_ZAPPY)
      expect(ponto(lugar, frente(d))).toBeCloseTo(-ATRAS_DO_ZAPPY)
    }
  })

  test('virando de costas, ele passa para o outro lado da tela dando a volta, sem atravessar', () => {
    // Olhando para a câmera atrás dela (+z → -z): o lugar muda de lado.
    expect(lugarAoLado(centro, 0).x).toBeLessThan(0)
    expect(lugarAoLado(centro, Math.PI).x).toBeGreaterThan(0)
    // No meio da virada, o lugar continua longe do corpo (gira em volta, a mesma distância).
    const raio = Math.hypot(LADO_DO_ZAPPY, ATRAS_DO_ZAPPY)
    let emVolta = 0
    for (let i = 0; i < 90; i++) {
      emVolta = suavizarAngulo(emVolta, Math.PI, RAPIDEZ_EM_VOLTA, 1 / 60)
      const l = lugarAoLado(centro, emVolta)
      expect(Math.hypot(l.x, l.z)).toBeCloseTo(raio)
    }
  })

  test('acompanha o corpo dela onde ela estiver', () => {
    const l = lugarAoLado({ x: 10, z: -4 }, 0)
    expect(l.x).toBeCloseTo(10 - LADO_DO_ZAPPY)
    expect(l.z).toBeCloseTo(-4 - ATRAS_DO_ZAPPY)
  })
})

describe('para onde ele olha', () => {
  test('andando, olha o caminho (frente, costas ou lados: o giro dela)', () => {
    expect(paraOndeOlhar(4.2, 0)).toBe('caminho')
    expect(paraOndeOlhar(4.2, 30)).toBe('caminho')
  })

  test('acabou de parar, ainda olha o caminho; depois vira para ela', () => {
    expect(paraOndeOlhar(0, ESPERA_PARA_OLHAR_PARA_ELA / 2)).toBe('caminho')
    expect(paraOndeOlhar(0, ESPERA_PARA_OLHAR_PARA_ELA + 0.1)).toBe('ela')
  })

  test('parada, espia a câmera de tempos em tempos e volta a olhar para ela', () => {
    expect(paraOndeOlhar(0, PRIMEIRA_ESPIADA - 0.1)).toBe('ela')
    expect(paraOndeOlhar(0, PRIMEIRA_ESPIADA + 0.1)).toBe('camera')
    expect(paraOndeOlhar(0, PRIMEIRA_ESPIADA + DURACAO_DA_ESPIADA + 0.1)).toBe('ela')
    expect(paraOndeOlhar(0, PRIMEIRA_ESPIADA + PERIODO_DA_ESPIADA + 0.1)).toBe('camera')
    // Na maior parte do tempo parado, olha para ela.
    let paraEla = 0
    for (let s = PRIMEIRA_ESPIADA; s < PRIMEIRA_ESPIADA + PERIODO_DA_ESPIADA; s += 0.05) {
      if (paraOndeOlhar(0, s) === 'ela') paraEla++
    }
    expect(paraEla / (PERIODO_DA_ESPIADA / 0.05)).toBeGreaterThan(0.7)
  })

  test('o giro para olhar um ponto segue a convenção do modelo', () => {
    expect(giroPara(centro, { x: 0, z: 5 })).toBeCloseTo(0)
    expect(giroPara(centro, { x: 5, z: 0 })).toBeCloseTo(Math.PI / 2)
    const d = giroPara({ x: 1, z: 1 }, { x: -2, z: 5 })
    const f = frente(d)
    expect(f.x).toBeCloseTo(-3 / 5)
    expect(f.z).toBeCloseTo(4 / 5)
  })
})

describe('inclinação e mergulho', () => {
  test('inclina para dentro da curva, com teto, e reto não inclina', () => {
    expect(inclinacaoNaCurva(0)).toBeCloseTo(0)
    // Girar para a esquerda (giro crescendo) baixa a asa esquerda: rotação negativa em z.
    expect(inclinacaoNaCurva(2)).toBeLessThan(0)
    expect(inclinacaoNaCurva(-2)).toBeGreaterThan(0)
    expect(inclinacaoNaCurva(100)).toBeCloseTo(-INCLINACAO_MAXIMA)
    expect(inclinacaoNaCurva(-100)).toBeCloseTo(INCLINACAO_MAXIMA)
  })

  test('mergulha mais quanto mais rápido ela vai, até o máximo', () => {
    expect(mergulho(0, 7)).toBe(0)
    expect(mergulho(3.5, 7)).toBeCloseTo(MERGULHO_MAXIMO / 2)
    expect(mergulho(20, 7)).toBeCloseTo(MERGULHO_MAXIMO)
    expect(mergulho(3, 0)).toBe(0)
  })
})
