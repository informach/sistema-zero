import { describe, expect, test } from 'bun:test'
import { criarDocumentoVazio, type InstanciaDeCenario } from '@sistemazero/molda-cenarios-core/v2'
import { Matrix4, Vector3 } from 'three'
import {
  encaixar,
  fatorUniforme,
  idsEscondidos,
  luzDaHora,
  matrizDoObjeto,
  transformacaoDaMatriz,
} from '../src/matematica'

const objeto = (id: string, extra: Partial<InstanciaDeCenario> = {}): InstanciaDeCenario => ({
  id,
  nome: id,
  grupo: null,
  bloqueado: false,
  oculto: false,
  modelo: 'm',
  transformacao: {
    posicao: { x: 3, y: 99, z: -4 },
    rotacao: { x: 0, y: Math.PI / 2, z: 0 },
    escala: { x: 2, y: 1, z: 0.5 },
  },
  apoio: { tipo: 'terreno', deslocamento: 0.25, inclinar: false },
  colisao: 'caixa',
  ...extra,
})
const doc = criarDocumentoVazio('c', 'C')

describe('matriz do objeto', () => {
  test('quem pisa no chão fica na altura do chão mais o deslocamento, não na altura gravada', () => {
    const m = matrizDoObjeto(doc, objeto('a'), new Matrix4())
    expect(new Vector3().setFromMatrixPosition(m).toArray()).toEqual([3, 0.25, -4])
  })
  test('quem está solto fica na altura gravada', () => {
    const m = matrizDoObjeto(doc, objeto('a', { apoio: { tipo: 'absoluto' } }), new Matrix4())
    expect(new Vector3().setFromMatrixPosition(m).y).toBe(99)
  })
  test('ida e volta: a matriz devolve a mesma transformação, com escala por eixo', () => {
    const o = objeto('a', { apoio: { tipo: 'absoluto' } })
    const volta = transformacaoDaMatriz(matrizDoObjeto(doc, o, new Matrix4()))
    expect(volta.posicao).toEqual({ x: 3, y: 99, z: -4 })
    expect(volta.escala).toEqual({ x: 2, y: 1, z: 0.5 })
    expect(volta.rotacao.y).toBeCloseTo(Math.PI / 2, 4)
    expect(volta.rotacao.x).toBeCloseTo(0, 4)
  })
  test('girar em volta de um ponto leva a posição junto', () => {
    const o = objeto('a', {
      apoio: { tipo: 'absoluto' },
      transformacao: {
        posicao: { x: 2, y: 0, z: 0 },
        rotacao: { x: 0, y: 0, z: 0 },
        escala: { x: 1, y: 1, z: 1 },
      },
    })
    const antes = matrizDoObjeto(doc, o, new Matrix4())
    const quartoDeVolta = new Matrix4().makeRotationY(Math.PI / 2)
    const depois = transformacaoDaMatriz(new Matrix4().multiplyMatrices(quartoDeVolta, antes))
    expect(depois.posicao).toEqual({ x: 0, y: 0, z: -2 })
    expect(depois.rotacao.y).toBeCloseTo(Math.PI / 2, 4)
  })
})

describe('encaixe e tamanho', () => {
  test('encaixa na grade e deixa livre sem grade', () => {
    expect(encaixar(1.3, 0.5)).toBe(1.5)
    expect(encaixar(-0.2, 0.5)).toBe(0)
    expect(Object.is(encaixar(-0.2, 0.5), -0)).toBe(false)
    expect(encaixar(1.3, null)).toBe(1.3)
  })
  test('com vários objetos, vale o eixo que mais mudou', () => {
    expect(fatorUniforme(1, 1.6, 1.1)).toBe(1.6)
    expect(fatorUniforme(0.4, 1, 1.2)).toBe(0.4)
    expect(fatorUniforme(1, 1, 1)).toBe(1)
  })
})

describe('luz da hora', () => {
  test('meio-dia é o mais claro e a noite o mais escuro, sempre com a luz vindo de cima', () => {
    const dia = luzDaHora(12),
      noite = luzDaHora(0),
      tarde = luzDaHora(17.5)
    expect(dia.forcaDoSol).toBeGreaterThan(tarde.forcaDoSol)
    expect(tarde.forcaDoSol).toBeGreaterThan(noite.forcaDoSol)
    for (const luz of [dia, noite, tarde, luzDaHora(6), luzDaHora(18)]) {
      expect(luz.sol.y).toBeGreaterThan(0.1)
      expect(Math.hypot(luz.sol.x, luz.sol.y, luz.sol.z)).toBeCloseTo(1, 6)
    }
    expect(dia.forcaDoSol + dia.forcaDoCeu).toBeCloseTo(3.75, 2)
  })
  test('a hora dá a volta: 24 é 0 e 30 é 6', () => {
    expect(luzDaHora(24)).toEqual(luzDaHora(0))
    expect(luzDaHora(30)).toEqual(luzDaHora(6))
  })
})

describe('escondidos', () => {
  test('some o objeto escondido e tudo o que está num grupo escondido, em qualquer nível', () => {
    const grupo = (id: string, pai: string | null, oculto = false) => ({
      id,
      nome: id,
      grupo: pai,
      bloqueado: false,
      oculto,
    })
    const d = {
      ...doc,
      grupos: [grupo('vila', null, true), grupo('casa', 'vila'), grupo('praca', null)],
      instancias: [
        objeto('a', { grupo: 'casa' }),
        objeto('b', { grupo: 'praca' }),
        objeto('c', { oculto: true }),
        objeto('d'),
      ],
    }
    expect([...idsEscondidos(d)].sort()).toEqual(['a', 'c'])
  })
})
