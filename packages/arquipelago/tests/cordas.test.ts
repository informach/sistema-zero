import { describe, expect, test } from 'bun:test'
import { criarBalanco } from '../src/sistemas/cipo'
import {
  CORDAS,
  type Corda,
  type CorpoQueEmpurra,
  criarPontos,
  elo,
  passoDasCordas,
  pontoDaPegada,
  soltarCorda,
} from '../src/sistemas/cordas'
import { CORPO } from '../src/sistemas/corpo'
import type { Tronco } from '../src/sistemas/escalada'

const COMPRIMENTO = 4.5
const PIVO_Y = 6.26
const CHAO = 1

function corda(x: number, z: number): Corda {
  const pivo = { x, y: PIVO_Y, z }
  const { pontos, antes } = criarPontos(pivo, COMPRIMENTO)
  return {
    pivo,
    corda: COMPRIMENTO,
    pegada: 3.7,
    balanco: { ...criarBalanco(), comprimento: 3.7 },
    seguro: false,
    pontos,
    antes,
    chao: CHAO,
    esperandoOCorpoSair: false,
  }
}

/** Empurra a corda inteira para um lado (como se viesse balançando), parada. */
function deLado(c: Corda, angulo: number, rumo: number) {
  for (let i = 0; i < c.pontos.length; i++) {
    const r = (COMPRIMENTO * i) / CORDAS.elos
    const p = {
      x: c.pivo.x + Math.sin(rumo) * Math.sin(angulo) * r,
      y: c.pivo.y - Math.cos(angulo) * r,
      z: c.pivo.z + Math.cos(rumo) * Math.sin(angulo) * r,
    }
    Object.assign(c.pontos[i] ?? {}, p)
    Object.assign(c.antes[i] ?? {}, p)
  }
}

function rodar(
  cordas: Corda[],
  segundos: number,
  corpo: CorpoQueEmpurra | null = null,
  troncos: Tronco[] = [],
  aCada?: (t: number) => void,
) {
  const dt = 1 / 60
  for (let t = 0; t < segundos; t += dt) {
    aCada?.(t)
    passoDasCordas(cordas, corpo, troncos, dt)
  }
}

const ponta = (c: Corda) => c.pontos[CORDAS.elos] ?? { x: 0, y: 0, z: 0 }
const esticada = (c: Corda) => {
  let soma = 0
  for (let i = 0; i < c.pontos.length - 1; i++) {
    const p = c.pontos[i]
    const q = c.pontos[i + 1]
    if (p && q) soma += Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z)
  }
  return soma
}

/** O corpo de pé no chão (desenhado, sem inclinar), com os pés em `pe`. */
function corpoEm(x: number, z: number, pe = CHAO): CorpoQueEmpurra {
  const d = CORPO.desenho
  return {
    de: { x, y: pe + d.de, z },
    ate: { x, y: pe + d.ate, z },
    raio: d.raio,
    cabeca: { x, y: pe + d.cabeca, z },
    raioDaCabeca: d.raioDaCabeca,
  }
}

function moverCorpo(c: CorpoQueEmpurra, dx: number, dz: number) {
  for (const p of [c.de, c.ate, c.cabeca]) {
    p.x += dx
    p.z += dz
  }
}

/** A menor distância de um ponto da corda até o eixo do corpo (só na altura do tronco). */
function folgaDoCorpo(c: Corda, corpo: CorpoQueEmpurra): number {
  let menor = Number.POSITIVE_INFINITY
  for (const p of c.pontos) {
    if (p.y < corpo.de.y || p.y > corpo.ate.y) continue
    menor = Math.min(menor, Math.hypot(p.x - corpo.de.x, p.z - corpo.de.z))
  }
  return menor
}

describe('cipó (física das cordas)', () => {
  test('parado fica parado, pendurado reto, com o comprimento dele', () => {
    const c = corda(0, 0)
    rodar([c], 2)
    expect(ponta(c).x).toBeCloseTo(0, 4)
    expect(ponta(c).y).toBeCloseTo(PIVO_Y - COMPRIMENTO, 1)
    expect(esticada(c)).toBeCloseTo(COMPRIMENTO, 1)
    expect(c.balanco.angulo).toBeCloseTo(0, 3)
  })

  test('solto de lado, balança para o outro lado e para aos poucos', () => {
    const c = corda(0, 0)
    deLado(c, 0.8, Math.PI / 2)
    let menorX = Number.POSITIVE_INFINITY
    rodar([c], 2, null, [], () => {
      menorX = Math.min(menorX, ponta(c).x)
    })
    expect(menorX).toBeLessThan(-0.5)
    rodar([c], 14)
    expect(Math.abs(c.balanco.angulo)).toBeLessThan(0.03)
    // A corda não estica com o balanço (só uma folguinha das restrições).
    expect(esticada(c)).toBeLessThan(COMPRIMENTO * 1.02)
  })

  test('o corpo andando contra o cipó empurra: ele não entra no corpo e balança', () => {
    const c = corda(0, 0)
    const corpo = corpoEm(-1.5, 0)
    let menor = Number.POSITIVE_INFINITY
    rodar([c], 1.4, corpo, [], (t) => {
      moverCorpo(corpo, CORPO.andar / 60, 0)
      if (t > 0.05) menor = Math.min(menor, folgaDoCorpo(c, corpo))
    })
    expect(menor).toBeGreaterThan(CORPO.desenho.raio)
    // Empurrado para +x, para o lado em que o corpo ia.
    expect(c.balanco.angulo).toBeGreaterThan(0.05)
    expect(Math.sin(c.balanco.rumo)).toBeGreaterThan(0.5)
  })

  test('a cabeça também empurra: de cima de um deque, o cipó não entra nela', () => {
    const c = corda(0, 0)
    // Pés num deque alto: só a cabeça fica na altura da corda.
    const corpo = corpoEm(-1.2, 0, PIVO_Y - 3 - CORPO.desenho.cabeca)
    let menor = Number.POSITIVE_INFINITY
    rodar([c], 1.2, corpo, [], (t) => {
      moverCorpo(corpo, CORPO.andar / 60, 0)
      if (t < 0.05) return
      for (const p of c.pontos) {
        const o = corpo.cabeca
        menor = Math.min(menor, Math.hypot(p.x - o.x, p.y - o.y, p.z - o.z))
      }
    })
    expect(menor).toBeGreaterThan(CORPO.desenho.raioDaCabeca)
    expect(c.balanco.angulo).toBeGreaterThan(0.05)
  })

  test('seguro: a pegada fica nas mãos, a corda de cima fica esticada', () => {
    const c = corda(0, 0)
    c.seguro = true
    c.balanco.angulo = 0.5
    c.balanco.rumo = 0
    rodar([c], 1)
    const k = pontoDaPegada(c)
    const m = c.pontos[k]
    expect(m?.z).toBeCloseTo(Math.sin(0.5) * 3.7, 4)
    expect(m?.y).toBeCloseTo(PIVO_Y - Math.cos(0.5) * 3.7, 4)
    // Do pivô às mãos, quase reta: o meio fica perto da linha entre os dois.
    const meio = c.pontos[Math.round(k / 2)]
    expect(meio).toBeDefined()
    if (meio && m) {
      const f = Math.round(k / 2) / k
      const linhaZ = c.pivo.z + (m.z - c.pivo.z) * f
      expect(Math.abs(meio.z - linhaZ)).toBeLessThan(0.05)
    }
  })

  test('seguro: a barriga empurra a corda de baixo para a frente (ela cai ao longo do corpo)', () => {
    const c = corda(0, 0)
    c.seguro = true
    const k = pontoDaPegada(c)
    const maosY = PIVO_Y - 3.7
    // O corpo desenhado como no jogo (olhando para +z, a corda ao lado esquerdo do rosto, à
    // frente), inclinado 0,3 rad para trás em volta das mãos: a barriga vai para a frente.
    const d = CORPO.desenho
    const rel = { x: -0.24, z: -0.4 }
    const alturaDasMaos = 1.2
    const girar = (y: number) => {
      const a = -0.3
      const yy = y - alturaDasMaos
      return {
        x: rel.x,
        y: maosY + yy * Math.cos(a) - rel.z * Math.sin(a),
        z: yy * Math.sin(a) + rel.z * Math.cos(a),
      }
    }
    const corpo: CorpoQueEmpurra = {
      de: girar(d.de),
      ate: girar(d.ate),
      raio: d.raio,
      cabeca: girar(d.cabeca),
      raioDaCabeca: d.raioDaCabeca,
    }
    rodar([c], 1.5, corpo)
    // Os pontos abaixo das mãos saem para a frente, por fora da barriga.
    let paraFrente = 0
    let menor = Number.POSITIVE_INFINITY
    for (let i = k + 1; i <= CORDAS.elos; i++) {
      const p = c.pontos[i]
      if (!p) continue
      paraFrente = Math.max(paraFrente, p.z)
      const ux = corpo.ate.x - corpo.de.x
      const uy = corpo.ate.y - corpo.de.y
      const uz = corpo.ate.z - corpo.de.z
      const t = Math.max(
        0,
        Math.min(
          1,
          ((p.x - corpo.de.x) * ux + (p.y - corpo.de.y) * uy + (p.z - corpo.de.z) * uz) /
            (ux * ux + uy * uy + uz * uz),
        ),
      )
      menor = Math.min(
        menor,
        Math.hypot(
          p.x - (corpo.de.x + ux * t),
          p.y - (corpo.de.y + uy * t),
          p.z - (corpo.de.z + uz * t),
        ),
      )
    }
    expect(paraFrente).toBeGreaterThan(0.05)
    expect(menor).toBeGreaterThan(corpo.raio)
  })

  test('quem acabou de soltar não dá tranco no cipó até sair de perto', () => {
    const c = corda(0, 0)
    soltarCorda(c)
    const corpo = corpoEm(0, 0, PIVO_Y - COMPRIMENTO - 0.5)
    rodar([c], 0.5, corpo)
    expect(Math.abs(ponta(c).x)).toBeLessThan(1e-3)
    expect(c.esperandoOCorpoSair).toBe(true)
    moverCorpo(corpo, 3, 0)
    rodar([c], 1 / 60, corpo)
    expect(c.esperandoOCorpoSair).toBe(false)
  })

  test('bate no tronco e volta (não entra na casca)', () => {
    const tronco: Tronco = {
      base: { x: 1.5, y: CHAO, z: 0 },
      topo: { x: 1.5, y: 6.5, z: 0 },
      raioBase: 0.8,
      raioTopo: 0.5,
    }
    const c = corda(0, 0)
    deLado(c, 0.9, -Math.PI / 2)
    let foiParaOTronco = false
    rodar([c], 6, null, [tronco], () => {
      for (const p of c.pontos) {
        if (p.y < CHAO || p.y > 6.5) continue
        const raio = 0.8 + (0.5 - 0.8) * ((p.y - CHAO) / 5.5)
        expect(Math.hypot(p.x - 1.5, p.z)).toBeGreaterThan(raio + CORDAS.raio - 0.03)
      }
      if (ponta(c).x > 0.3) foiParaOTronco = true
    })
    expect(foiParaOTronco).toBe(true)
  })

  test('um cipó que bate em outro faz o outro balançar, sem um entrar no outro', () => {
    const a = corda(0, 0)
    deLado(a, 0.9, -Math.PI / 2)
    const b = corda(1.5, 0)
    let balancou = false
    rodar([a, b], 3, null, [], () => {
      if (b.balanco.angulo > 0.05) balancou = true
    })
    expect(balancou).toBe(true)
  })

  test('o cipó que a criança segura empurra os soltos e continua nas mãos', () => {
    const segura = corda(0, 0)
    segura.seguro = true
    segura.balanco.rumo = Math.PI / 2
    const solta = corda(1.5, 0)
    // A criança balança para o lado do outro cipó e passa por ele.
    rodar([segura, solta], 0.8, null, [], (t) => {
      segura.balanco.angulo = Math.min(0.9, t * 1.5)
    })
    const m = segura.pontos[pontoDaPegada(segura)]
    expect(m?.x).toBeCloseTo(Math.sin(0.9) * 3.7, 4)
    expect(solta.balanco.angulo).toBeGreaterThan(0.05)
    expect(Math.sin(solta.balanco.rumo)).toBeGreaterThan(0.5)
  })

  test('a ponta não passa do chão', () => {
    const c = corda(0, 0)
    c.chao = PIVO_Y - COMPRIMENTO + 0.5
    rodar([c], 2)
    for (const p of c.pontos) expect(p.y).toBeGreaterThanOrEqual(c.chao + CORDAS.raio - 1e-6)
    expect(elo(c)).toBeCloseTo(COMPRIMENTO / CORDAS.elos)
  })
})
