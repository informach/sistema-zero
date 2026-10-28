import { describe, expect, test } from 'bun:test'
import type { ResultadoDoPercurso } from '@sistemazero/arquipelago-contracts'
import { dentroDaAgua, paraOMundo } from '../src/mundo/bosque'
import {
  type Balanco,
  CIPO,
  comprimentoDaPegada,
  corpoNoBalanco,
  criarBalanco,
  distanciaDaCorda,
  GRAVIDADE_DO_CIPO,
  maosNoBalanco,
  passoDoBalanco,
  pegarCipo,
  velocidadeAoSoltar,
} from '../src/sistemas/cipo'
import { CORPO } from '../src/sistemas/corpo'
import {
  alturaMaxima,
  alturaMinima,
  corpoNaEscalada,
  criarAgarrado,
  distanciaDaCasca,
  ESCALADA,
  grudar,
  passoDaEscalada,
  raioNaAltura,
  saltoDaEscalada,
  type Tronco,
} from '../src/sistemas/escalada'
import {
  type CorpoNaCorrida,
  criarCorrida,
  estrelasDaCorrida,
  formatarTempo,
  juntarResultado,
  PERCURSO_DAS_COPAS,
  type PontosDoPercurso,
  passoDaCorrida,
  quantasEstrelas,
  recomecarCorrida,
  tempoDaCorrida,
} from '../src/sistemas/percurso'

const PIVO = { x: 0, y: 6, z: 0 }
const ponto = () => ({ x: 0, y: 0, z: 0 })

function balancando(angulo: number, velocidade: number, comprimento = 3): Balanco {
  return { ...criarBalanco(), angulo, velocidade, comprimento }
}

/** A energia por massa do pêndulo (altura das mãos e velocidade). */
function energia(b: Balanco): number {
  const v = b.velocidade * b.comprimento
  return 0.5 * v * v - GRAVIDADE_DO_CIPO * b.comprimento * Math.cos(b.angulo)
}

describe('cipó (pêndulo)', () => {
  test('as mãos seguram onde os pés passam livres do chão, sem passar do fim da corda', () => {
    // Pivô a 5,26 do chão: 5,26 − 0,35 − 0,9 − 1 = 3,01.
    expect(comprimentoDaPegada(6.26, 1, 4.5, CORPO.doCentroAoPe)).toBeCloseTo(3.01, 5)
    // Corda curta: segura no fim dela.
    expect(comprimentoDaPegada(6.26, 1, 2.2, CORPO.doCentroAoPe)).toBe(2.2)
    // Galho baixo demais: nunca menos que o mínimo.
    expect(comprimentoDaPegada(3, 1, 4.5, CORPO.doCentroAoPe)).toBe(CIPO.comprimentoMinimo)
    // No ponto mais baixo, os pés ficam a `folgaDosPes` do chão.
    const b = balancando(0, 0, comprimentoDaPegada(6.26, 1, 4.5, CORPO.doCentroAoPe))
    const corpo = corpoNoBalanco(b, { x: 0, y: 6.26, z: 0 }, ponto())
    expect(corpo.y - CORPO.doCentroAoPe - 1).toBeCloseTo(CIPO.folgaDosPes, 5)
  })

  test('solto, ele balança sozinho e para aos poucos', () => {
    const b = balancando(0.8, 0)
    let maior = 0
    for (let i = 0; i < 60; i++) {
      passoDoBalanco(b, 0, 0, 1 / 60, false)
      maior = Math.max(maior, Math.abs(b.angulo))
    }
    expect(b.angulo).toBeLessThan(0.8)
    for (let i = 0; i < 60 * 15; i++) passoDoBalanco(b, 0, 0, 1 / 60, false)
    expect(Math.abs(b.angulo)).toBeLessThan(0.02)
    expect(maior).toBeLessThanOrEqual(0.8)
  })

  test('segurando sem pedir nada, quase não perde embalo (e nunca ganha)', () => {
    const b = balancando(0.6, 0)
    const antes = energia(b)
    for (let i = 0; i < 120; i++) passoDoBalanco(b, 0, 0, 1 / 60, true)
    const depois = energia(b)
    expect(depois).toBeLessThanOrEqual(antes + 1e-6)
    expect(depois).toBeGreaterThan(antes - Math.abs(antes) * 0.1)
  })

  test('pedir para a frente bombeia: cada ida sobe mais, até o ângulo máximo', () => {
    const b = balancando(0, 0)
    // O rumo 0 aponta para +z; pedir +z é pedir para a frente.
    const picos: number[] = []
    let anterior = 0
    for (let i = 0; i < 60 * 8; i++) {
      passoDoBalanco(b, 0, 1, 1 / 60, true)
      if (anterior > 0 && b.velocidade <= 0 && b.angulo > 0) picos.push(b.angulo)
      anterior = b.velocidade
    }
    expect(picos.length).toBeGreaterThan(2)
    expect(picos[1] ?? 0).toBeGreaterThan(picos[0] ?? 0)
    expect(Math.max(...picos)).toBeLessThanOrEqual(CIPO.anguloMaximo + 1e-9)
  })

  test('pedir o contrário do balanço não freia (só a volta bombeia)', () => {
    const b = balancando(0, 2)
    const c = balancando(0, 2)
    for (let i = 0; i < 10; i++) {
      passoDoBalanco(b, 0, -1, 1 / 60, true)
      passoDoBalanco(c, 0, 0, 1 / 60, true)
    }
    expect(b.velocidade).toBeCloseTo(c.velocidade, 6)
  })

  test('pedir de lado vira o plano do balanço devagar', () => {
    const b = balancando(0.3, 0)
    for (let i = 0; i < 60; i++) passoDoBalanco(b, 1, 0, 1 / 60, true)
    // O rumo 0 olha para +z; pedir +x vira para lá, a `giroDoBalanco` por segundo.
    expect(b.rumo).toBeGreaterThan(0.5)
    expect(b.rumo).toBeLessThan(CIPO.giroDoBalanco + 1e-9)
  })

  test('um quadro longo dá o mesmo balanço que vários curtos', () => {
    const longo = balancando(0.5, 0)
    const curto = balancando(0.5, 0)
    passoDoBalanco(longo, 0, 0, 0.1, true)
    for (let i = 0; i < 12; i++) passoDoBalanco(curto, 0, 0, 0.1 / 12, true)
    expect(longo.angulo).toBeCloseTo(curto.angulo, 3)
  })

  test('pegar parado começa sem tranco; pegar voando já sai balançando', () => {
    const b = criarBalanco()
    const corpo = { x: 0.2, y: 2.9, z: 0.05 }
    pegarCipo(b, PIVO, { ...corpo, y: corpo.y + 1 }, ponto(), Math.PI / 2, 3)
    expect(b.velocidade).toBe(0)
    expect(b.rumo).toBeCloseTo(Math.PI / 2, 5)
    expect(Math.abs(b.angulo)).toBeLessThan(0.1)
    const voando = criarBalanco()
    pegarCipo(voando, PIVO, { x: 0.3, y: 4, z: 0 }, { x: 5, y: 1, z: 0 }, 0, 3)
    expect(voando.rumo).toBeCloseTo(Math.PI / 2, 5)
    expect(voando.velocidade).toBeGreaterThan(1.5)
  })

  test('as mãos ficam na corda e o corpo logo abaixo delas', () => {
    const b = balancando(0.4, 0)
    b.rumo = 1.1
    const maos = maosNoBalanco(b, PIVO, ponto())
    expect(Math.hypot(maos.x - PIVO.x, maos.y - PIVO.y, maos.z - PIVO.z)).toBeCloseTo(3, 6)
    expect(distanciaDaCorda(b, PIVO, 4.5, maos)).toBeCloseTo(0, 6)
    const corpo = corpoNoBalanco(b, PIVO, ponto())
    expect(maos.y - corpo.y).toBeCloseTo(CIPO.maosAcimaDoCentro, 6)
  })

  test('soltar no meio da ida lança para a frente e para cima', () => {
    const b = balancando(0.3, 2.2)
    const v = velocidadeAoSoltar(b, ponto())
    expect(v.z).toBeGreaterThan(5)
    expect(v.y).toBeGreaterThan(CIPO.subidaAoSoltar)
    // A velocidade do balanço vezes o impulso, mais o pulinho para cima.
    const tangente = b.velocidade * b.comprimento * CIPO.impulsoAoSoltar
    expect(Math.hypot(v.x, v.y - CIPO.subidaAoSoltar, v.z)).toBeCloseTo(tangente, 6)
  })

  test('de um cipó dá para pegar o próximo (1,5 adiante) bombeando e soltando', () => {
    const b = balancando(0, 0)
    // Bombeia para +z por alguns segundos e solta no meio da ida.
    for (let i = 0; i < 60 * 4; i++) passoDoBalanco(b, 0, 1, 1 / 60, true)
    let guardas = 0
    while (!(b.velocidade > 0 && b.angulo > 0.2) && guardas++ < 600) {
      passoDoBalanco(b, 0, 1, 1 / 60, true)
    }
    const corpo = corpoNoBalanco(b, PIVO, ponto())
    const v = velocidadeAoSoltar(b, ponto())
    const proximo = { x: 0, y: PIVO.y, z: 1.5 + 0.32 }
    const parado = criarBalanco()
    let pegou = false
    for (let t = 0; t < 1.2 && !pegou; t += 1 / 120) {
      const maos = {
        x: corpo.x + v.x * t,
        y: corpo.y + CIPO.maosAcimaDoCentro + v.y * t - 0.5 * GRAVIDADE_DO_CIPO * t * t,
        z: corpo.z + v.z * t,
      }
      pegou = distanciaDaCorda(parado, proximo, 4.5, maos) < CIPO.raioDaPegadaNoAr
    }
    expect(pegou).toBe(true)
  })
})

describe('escalada do tronco', () => {
  const tronco: Tronco = {
    base: { x: 0, y: 1, z: 0 },
    topo: { x: 0.2, y: 6.5, z: 0 },
    raioBase: 0.86,
    raioTopo: 0.5,
  }
  const maos = CIPO.maosAcimaDoCentro
  const pe = CORPO.doCentroAoPe

  test('a casca afina e o tronco entorta para o topo', () => {
    expect(raioNaAltura(tronco, 1)).toBeCloseTo(0.86)
    expect(raioNaAltura(tronco, 6.5)).toBeCloseTo(0.5)
    expect(raioNaAltura(tronco, 100)).toBeCloseTo(0.5)
  })

  test('grudar põe o corpo encostado na casca, do lado em que chegou', () => {
    const a = criarAgarrado()
    grudar(tronco, { x: 1.4, y: 1.9, z: 0 }, a, pe, maos)
    expect(a.lado).toBeCloseTo(Math.PI / 2, 5)
    const corpo = corpoNaEscalada(tronco, a, CORPO.raio, ponto())
    expect(distanciaDaCasca(tronco, corpo, CORPO.raio)).toBeCloseTo(ESCALADA.folga, 2)
  })

  test('sobe e desce dentro da faixa: dos pés no chão até as mãos abaixo do topo', () => {
    const a = criarAgarrado()
    grudar(tronco, { x: 1.4, y: 1.9, z: 0 }, a, pe, maos)
    for (let i = 0; i < 600; i++) passoDaEscalada(tronco, a, 1, 0, 1 / 60, CORPO.raio, pe, maos)
    expect(a.altura).toBeCloseTo(alturaMaxima(tronco, maos), 6)
    expect(a.altura + maos).toBeCloseTo(tronco.topo.y - ESCALADA.abaixoDoTopo, 6)
    for (let i = 0; i < 600; i++) {
      if (passoDaEscalada(tronco, a, -1, 0, 1 / 60, CORPO.raio, pe, maos) === 'desceu') break
    }
    expect(a.altura).toBeCloseTo(alturaMinima(tronco, pe), 6)
  })

  test('descer no pé do tronco solta no chão', () => {
    const a = { lado: 0, altura: alturaMinima(tronco, pe) }
    expect(passoDaEscalada(tronco, a, -1, 0, 1 / 60, CORPO.raio, pe, maos)).toBe('desceu')
    expect(passoDaEscalada(tronco, a, 1, 0, 1 / 60, CORPO.raio, pe, maos)).toBeNull()
  })

  test('de lado dá a volta no tronco na velocidade da casca', () => {
    const a = { lado: 0, altura: 3 }
    passoDaEscalada(tronco, a, 0, 1, 1, CORPO.raio, pe, maos)
    const r = raioNaAltura(tronco, 3) + CORPO.raio + ESCALADA.folga
    expect(a.lado).toBeCloseTo(ESCALADA.deLado / r, 6)
  })

  test('pular solta para fora, ou para onde a criança pede (se for para longe do tronco)', () => {
    const a = { lado: Math.PI / 2, altura: 3 }
    const fora = saltoDaEscalada(a, 0, 0, ponto())
    expect(fora.x).toBeCloseTo(ESCALADA.saltoParaFora)
    expect(fora.y).toBe(ESCALADA.saltoParaCima)
    const pedido = saltoDaEscalada(a, 0.7, 0.7, ponto())
    expect(pedido.z).toBeGreaterThan(1)
    // Pedir para dentro do tronco não vale: sai para fora.
    const contra = saltoDaEscalada(a, -1, 0, ponto())
    expect(contra.x).toBeCloseTo(ESCALADA.saltoParaFora)
  })
})

describe('percurso nas copas', () => {
  const deque = (x: number, y: number, z: number) => ({
    x,
    y,
    z,
    raio: 2,
    volta: { x: x + 1, y, z },
    rumoDaVolta: 0,
  })
  const pontos: PontosDoPercurso = {
    largada: { x: 0, y: 1, z: 0 },
    rumoDaLargada: 0,
    deques: [deque(0, 5, 5), deque(5, 5, 5), deque(10, 5, 5)],
    chegada: { x: 12, y: 1, z: 0 },
    vagalumes: [
      { x: 0, y: 3, z: 2 },
      { x: 5, y: 6, z: 5 },
    ],
    centro: { x: 0, y: 1, z: 0 },
    raioDaIlha: 13,
  }
  const no = (x: number, pes: number, z: number, noChaoDaIlha = false): CorpoNaCorrida => ({
    x,
    y: pes + CORPO.doCentroAoPe,
    z,
    pes,
    noChaoDaIlha,
  })

  test('deques na ordem, vagalumes, e a chegada só depois do último deque', () => {
    const c = criarCorrida(1000, 2)
    expect(passoDaCorrida(c, no(12, 1, 0), pontos, 1500)).toBeNull()
    expect(passoDaCorrida(c, no(0, 2.1, 2), pontos, 2000)).toEqual({ tipo: 'vagalume', indice: 0 })
    expect(passoDaCorrida(c, no(0.5, 5, 5), pontos, 3000)).toEqual({ tipo: 'deque', indice: 0 })
    expect(passoDaCorrida(c, no(5, 5, 5), pontos, 4000)).toEqual({ tipo: 'deque', indice: 1 })
    expect(passoDaCorrida(c, no(10, 5, 5), pontos, 5000)).toEqual({ tipo: 'deque', indice: 2 })
    expect(passoDaCorrida(c, no(12, 1, 0.5, true), pontos, 21_000)).toEqual({ tipo: 'chegou' })
    expect(c.tempoMs).toBe(20_000)
    expect(passoDaCorrida(c, no(12, 1, 0.5, true), pontos, 22_000)).toBeNull()
  })

  test('cair depois do primeiro deque volta ao último deque alcançado; antes, não conta', () => {
    const c = criarCorrida(0, 2)
    // Caiu da escada (antes do primeiro deque): segue a corrida, sem voltar.
    expect(passoDaCorrida(c, no(1, 1, 1, true), pontos, 100)).toBeNull()
    passoDaCorrida(c, no(0, 5, 5), pontos, 200)
    passoDaCorrida(c, no(5, 5, 5), pontos, 300)
    expect(passoDaCorrida(c, no(7, 1, 2, true), pontos, 400)).toEqual({ tipo: 'caiu', deque: 1 })
    // Continua correndo: a volta é com corte suave, nunca para a largada.
    expect(c.situacao).toBe('correndo')
    expect(c.deque).toBe(1)
  })

  test('sair da ilha ou se afastar da largada antes de subir desiste, sem castigo', () => {
    const longe = criarCorrida(0, 2)
    expect(passoDaCorrida(longe, no(0, 1, 9, true), pontos, 100)).toEqual({ tipo: 'desistiu' })
    const fora = criarCorrida(0, 2)
    passoDaCorrida(fora, no(0, 5, 5), pontos, 100)
    expect(passoDaCorrida(fora, no(15, 5, 0), pontos, 200)).toEqual({ tipo: 'desistiu' })
    expect(estrelasDaCorrida(fora)).toEqual({ chegada: false, tempo: false, vagalumes: false })
    expect(juntarResultado(undefined, fora)).toBeUndefined()
  })

  test('as três estrelas: chegar, abaixo do tempo-alvo e todos os vagalumes', () => {
    const c = criarCorrida(0, 2)
    c.situacao = 'chegou'
    c.tempoMs = PERCURSO_DAS_COPAS.tempoAlvoMs
    c.pegos.fill(true)
    expect(estrelasDaCorrida(c)).toEqual({ chegada: true, tempo: true, vagalumes: true })
    c.tempoMs += 1
    c.pegos[1] = false
    expect(estrelasDaCorrida(c)).toEqual({ chegada: true, tempo: false, vagalumes: false })
    expect(quantasEstrelas(estrelasDaCorrida(c))).toBe(1)
  })

  test('o melhor resultado guarda cada estrela para sempre e o menor tempo', () => {
    const antes: ResultadoDoPercurso = {
      estrelas: { chegada: true, tempo: false, vagalumes: true },
      melhorTempoMs: 25_000,
    }
    const c = criarCorrida(0, 2)
    c.situacao = 'chegou'
    c.tempoMs = 19_000
    expect(juntarResultado(antes, c)).toEqual({
      estrelas: { chegada: true, tempo: true, vagalumes: true },
      melhorTempoMs: 19_000,
    })
    c.tempoMs = 40_000
    expect(juntarResultado(antes, c)?.melhorTempoMs).toBe(25_000)
    expect(juntarResultado(undefined, c)).toEqual({
      estrelas: { chegada: true, tempo: false, vagalumes: false },
      melhorTempoMs: 40_000,
    })
  })

  test('recomeçar zera a mesma corrida (sem alocar) e o cronômetro corre', () => {
    const c = criarCorrida(0, 2)
    passoDaCorrida(c, no(0, 2.1, 2), pontos, 10)
    const pegos = c.pegos
    recomecarCorrida(c, 5000)
    expect(c.pegos).toBe(pegos)
    expect(c.pegos).toEqual([false, false])
    expect(tempoDaCorrida(c, 7500)).toBe(2500)
  })

  test('o tempo aparece com minutos, segundos e décimos', () => {
    expect(formatarTempo(0)).toBe('0:00,0')
    expect(formatarTempo(23_456)).toBe('0:23,4')
    expect(formatarTempo(83_999)).toBe('1:23,9')
  })
})

describe('referencial da ilha', () => {
  test('levar para o mundo gira como o grupo da ilha (o rotation.y do three)', () => {
    const p = paraOMundo({ x: 1, y: 2, z: 0 }, { x: 10, y: 0, z: 20 }, Math.PI / 2, ponto())
    expect(p.x).toBeCloseTo(10, 6)
    expect(p.y).toBe(2)
    expect(p.z).toBeCloseTo(19, 6)
  })

  test('a elipse do lago gira junto com a ilha', () => {
    const lago = { x: 0, z: 0, raioX: 2, raioZ: 1, giro: 0 }
    expect(dentroDaAgua(lago, 1.8, 0)).toBe(true)
    expect(dentroDaAgua(lago, 0, 1.2)).toBe(false)
    const girado = { ...lago, giro: Math.PI / 2 }
    // Girada 90°, a parte comprida aponta para −z (o +x do modelo).
    const ponta = paraOMundo({ x: 1.8, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, Math.PI / 2, ponto())
    expect(dentroDaAgua(girado, ponta.x, ponta.z)).toBe(true)
    expect(dentroDaAgua(girado, 1.8, 0)).toBe(false)
  })
})
