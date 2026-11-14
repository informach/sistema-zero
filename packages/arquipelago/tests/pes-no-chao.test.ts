import { describe, expect, test } from 'bun:test'
import { Bone, Group, Vector3 } from 'three'
import {
  AJUSTE_MAXIMO,
  acharPernas,
  assentarOsPes,
  PES_ATE,
  pesoDosPes,
  suavizarPeso,
} from '../src/personagem/pes-no-chao'

/**
 * Um quadril com duas pernas (coxa 0,3, canela 0,3, tornozelo a 0,05 do chão), em pé na origem do
 * grupo do desenho, com uma escala no meio (como a ponte do mundo) e os ossos crescendo para −y.
 */
function corpo() {
  const raiz = new Group()
  const escala = new Group()
  escala.scale.setScalar(2)
  raiz.add(escala)
  const quadril = new Bone()
  quadril.name = 'Hips'
  quadril.position.set(0, 0.65 / 2, 0)
  escala.add(quadril)
  for (const [lado, x] of [
    ['Left', 0.1],
    ['Right', -0.1],
  ] as const) {
    const coxa = new Bone()
    coxa.name = `${lado}UpLeg`
    coxa.position.set(x / 2, 0, 0)
    const canela = new Bone()
    canela.name = `${lado}Leg`
    // Joelho um pouco à frente, como na pose de pé.
    canela.position.set(0, -0.3 / 2, 0.02 / 2)
    const pe = new Bone()
    pe.name = `${lado}Foot`
    pe.position.set(0, -0.3 / 2, -0.02 / 2)
    quadril.add(coxa)
    coxa.add(canela)
    canela.add(pe)
  }
  raiz.updateMatrixWorld(true)
  return raiz
}

const pe = (raiz: Group, nome: string) =>
  (raiz.getObjectByName(nome) as Bone).getWorldPosition(new Vector3())

describe('os pés no chão', () => {
  test('o peso: parado no chão vale tudo; andando, no ar, nadando ou num modo, nada', () => {
    const chao = { velocidade: 0, noChao: true, velY: 0, nadando: false, especial: null }
    expect(pesoDosPes(chao)).toBe(1)
    expect(pesoDosPes({ ...chao, velocidade: PES_ATE })).toBe(0)
    expect(pesoDosPes({ ...chao, noChao: false })).toBe(0)
    expect(pesoDosPes({ ...chao, nadando: true })).toBe(0)
    expect(pesoDosPes({ ...chao, especial: 'escada' })).toBe(0)
    expect(suavizarPeso(0, 1, 1)).toBe(1)
    expect(suavizarPeso(0, 1, 0.05)).toBeCloseTo(0.5, 6)
  })

  test('num chão plano nada muda', () => {
    const raiz = corpo()
    const pernas = acharPernas(raiz)
    if (!pernas) throw new Error('sem pernas')
    const antes = pe(raiz, 'LeftFoot')
    assentarOsPes(pernas, raiz, () => 0, 1)
    expect(pe(raiz, 'LeftFoot').distanceTo(antes)).toBeLessThan(1e-4)
  })

  test('um pé num degrau mais baixo: ele desce até o chão dele e o quadril acompanha', () => {
    const raiz = corpo()
    const pernas = acharPernas(raiz)
    if (!pernas) throw new Error('sem pernas')
    const esquerdo = pe(raiz, 'LeftFoot')
    const direito = pe(raiz, 'RightFoot')
    const quadril = pe(raiz, 'Hips')
    // O chão do lado esquerdo (x > 0) está 0,2 abaixo.
    assentarOsPes(pernas, raiz, (x) => (x > 0 ? -0.2 : 0), 1)
    expect(pe(raiz, 'LeftFoot').y).toBeCloseTo(esquerdo.y - 0.2, 3)
    expect(pe(raiz, 'RightFoot').y).toBeCloseTo(direito.y, 3)
    expect(pe(raiz, 'Hips').y).toBeCloseTo(quadril.y - 0.2, 4)
  })

  test('chão longe demais embaixo do pé é beirada: nada muda; e meio peso faz meio ajuste', () => {
    const raiz = corpo()
    const pernas = acharPernas(raiz)
    if (!pernas) throw new Error('sem pernas')
    const quadril = pe(raiz, 'Hips').y
    assentarOsPes(pernas, raiz, (x) => (x > 0 ? -(AJUSTE_MAXIMO + 0.05) : 0), 1)
    expect(pe(raiz, 'Hips').y).toBeCloseTo(quadril, 4)
    expect(AJUSTE_MAXIMO).toBeGreaterThan(0.2)
    const outro = corpo()
    const p2 = acharPernas(outro)
    if (!p2) throw new Error('sem pernas')
    assentarOsPes(p2, outro, () => -0.2, 0.5)
    expect(pe(outro, 'Hips').y).toBeCloseTo(quadril - 0.1, 4)
  })
})
