import { describe, expect, it } from 'bun:test'
import type { TilemapObject } from '../core/project'
import { createMapObject } from './mapObjects'
import {
  insertObjectPoint,
  moveObjectPoint,
  objectBounds,
  objectContains,
  objectFromWorldPoints,
  objectHandleAt,
  objectHandlePoints,
  objectLocalPoint,
  objectSegmentAt,
  objectVertexAt,
  objectWorldPoint,
  removeObjectPoint,
  resizeObjectFromHandle,
} from './objectGeometry'

const perto = (a: number, b: number): void => expect(Math.abs(a - b)).toBeLessThan(1e-6)
const obj = (input: Parameters<typeof createMapObject>[0]): TilemapObject => createMapObject(input)
/** Triângulo torto de propósito: espelhar os pontos mudaria o que o toque acerta. */
const triangulo = (extra: Partial<TilemapObject> = {}): TilemapObject =>
  obj({
    shape: 'polygon',
    x: 10,
    y: 10,
    width: 40,
    height: 20,
    points: [
      { x: 0, y: 0 },
      { x: 40, y: 0 },
      { x: 0, y: 20 },
    ],
    ...extra,
  })

describe('objectContains e objectBounds', () => {
  it('retângulo, elipse e ponto', () => {
    const r = obj({ x: 10, y: 10, width: 20, height: 10 })
    expect(objectContains(r, 15, 15)).toBe(true)
    expect(objectContains(r, 31, 15)).toBe(false)
    expect(objectContains(r, 31, 15, 2)).toBe(true)
    const e = obj({ shape: 'ellipse', x: 0, y: 0, width: 20, height: 10 })
    expect(objectContains(e, 10, 5)).toBe(true)
    expect(objectContains(e, 1, 1)).toBe(false)
    const p = obj({ x: 8, y: 8 })
    expect(objectContains(p, 9, 8, 3)).toBe(true)
    expect(objectContains(p, 20, 8, 3)).toBe(false)
  })
  it('polígono: dentro, fora e na beirada com folga', () => {
    const t = triangulo()
    expect(objectContains(t, 15, 15)).toBe(true)
    expect(objectContains(t, 45, 28)).toBe(false)
    expect(objectBounds(t)).toEqual({ x: 10, y: 10, width: 40, height: 20 })
  })
  it('linha: só perto do traço, e o último ponto não se liga ao primeiro', () => {
    const l = obj({
      shape: 'polyline',
      x: 0,
      y: 0,
      width: 20,
      height: 20,
      points: [
        { x: 0, y: 0 },
        { x: 20, y: 0 },
        { x: 20, y: 20 },
      ],
    })
    expect(objectContains(l, 10, 1, 2)).toBe(true)
    expect(objectContains(l, 10, 10, 2)).toBe(false)
  })
  it('virar de lado não muda o contorno: o toque acerta o que está desenhado', () => {
    const normal = triangulo(),
      virado = triangulo({ flipX: true, flipY: true })
    // O desenho do contorno usa os pontos como estão; o lado cheio é o de cima à esquerda.
    for (const [x, y, dentro] of [
      [15, 13, true],
      [45, 28, false],
      [48, 11, true],
    ] as const) {
      expect(objectContains(normal, x, y)).toBe(dentro)
      expect(objectContains(virado, x, y)).toBe(dentro)
    }
    expect(objectBounds(virado)).toEqual(objectBounds(normal))
  })
  it('objeto girado: o ponto do mapa vai e volta do espaço do objeto', () => {
    const o = obj({ x: 50, y: 50, width: 20, height: 10, rotation: 90 })
    const w = objectWorldPoint(o, 20, 0)
    perto(w.x, 50)
    perto(w.y, 70)
    const l = objectLocalPoint(o, w.x, w.y)
    perto(l.x, 20)
    perto(l.y, 0)
    expect(objectContains(o, 45, 60)).toBe(true)
    expect(objectContains(o, 60, 55)).toBe(false)
    const b = objectBounds(o)
    perto(b.x, 40)
    perto(b.width, 10)
    perto(b.height, 20)
  })
})

describe('alças e tamanho', () => {
  it('sem giro: puxar o canto de baixo à direita deixa o de cima parado', () => {
    const o = obj({ x: 10, y: 10, width: 20, height: 10 })
    expect(objectHandleAt(o, 30, 20, 3)).toBe('se')
    expect(objectHandleAt(o, 20, 15, 3)).toBeNull()
    expect(resizeObjectFromHandle(o, 'se', { x: 50, y: 40 })).toEqual({
      x: 10,
      y: 10,
      width: 40,
      height: 30,
    })
    // Passar do canto parado troca os lados.
    expect(resizeObjectFromHandle(o, 'se', { x: 0, y: 0 })).toEqual({
      x: 0,
      y: 0,
      width: 10,
      height: 10,
    })
  })
  it('girado: o canto do outro lado continua no mesmo lugar do mapa', () => {
    const o = obj({ x: 50, y: 50, width: 20, height: 10, rotation: 30 })
    const antes = objectHandlePoints(o).nw
    const next = { ...o, ...resizeObjectFromHandle(o, 'se', objectWorldPoint(o, 35, 25)) }
    perto(next.width, 35)
    perto(next.height, 25)
    const depois = objectHandlePoints(next).nw
    perto(depois.x, antes.x)
    perto(depois.y, antes.y)
    // Puxando o canto de cima à esquerda, quem fica parado é o de baixo à direita.
    const fixo = objectHandlePoints(o).se
    const outro = { ...o, ...resizeObjectFromHandle(o, 'nw', objectWorldPoint(o, -10, -5)) }
    perto(outro.width, 30)
    perto(outro.height, 15)
    perto(objectHandlePoints(outro).se.x, fixo.x)
    perto(objectHandlePoints(outro).se.y, fixo.y)
  })
  it('os pontos do polígono esticam junto', () => {
    const next = resizeObjectFromHandle(triangulo(), 'se', { x: 90, y: 50 })
    expect(next.points).toEqual([
      { x: 0, y: 0 },
      { x: 80, y: 0 },
      { x: 0, y: 40 },
    ])
  })
})

describe('pontos da forma', () => {
  it('acha o ponto e o trecho tocados', () => {
    const t = triangulo()
    expect(objectVertexAt(t, 49, 11, 3)).toBe(1)
    expect(objectVertexAt(t, 30, 30, 3)).toBe(-1)
    // No meio do lado de cima: o ponto novo entra na posição 1.
    expect(objectSegmentAt(t, 30, 10, 2)).toBe(1)
    // O lado que fecha o triângulo (último → primeiro).
    expect(objectSegmentAt(t, 10, 20, 2)).toBe(3)
    const linha = obj({ ...t, shape: 'polyline' })
    expect(objectSegmentAt(linha, 10, 20, 2)).toBe(-1)
  })
  it('pôr, mover e tirar um ponto arruma a caixa sem tirar os outros do lugar', () => {
    const t = triangulo()
    const com = { ...t, ...insertObjectPoint(t, 1, { x: 30, y: 0 }, 256)! }
    expect(com.points).toHaveLength(4)
    expect(com.y).toBe(0)
    expect(com.height).toBe(30)
    // O primeiro ponto continua em (10, 10) no mapa.
    expect(objectWorldPoint(com, com.points![0]!.x, com.points![0]!.y)).toEqual({ x: 10, y: 10 })
    const movido = { ...t, ...moveObjectPoint(t, 2, { x: 5, y: 40 })! }
    expect(movido.x).toBe(5)
    expect(movido.width).toBe(45)
    expect(movido.points![2]).toEqual({ x: 0, y: 30 })
    expect(removeObjectPoint(t, 0)).toBeNull()
    expect(removeObjectPoint(com, 1)?.points).toHaveLength(3)
    expect(insertObjectPoint(t, 1, { x: 0, y: 0 }, 3)).toBeNull()
    const linha = obj({ ...t, shape: 'polyline' })
    expect(removeObjectPoint(linha, 0)?.points).toHaveLength(2)
  })
  it('forma nova a partir dos toques', () => {
    expect(
      objectFromWorldPoints([
        { x: 30, y: 20 },
        { x: 10, y: 40 },
        { x: 50, y: 60 },
      ]),
    ).toEqual({
      x: 10,
      y: 20,
      width: 40,
      height: 40,
      points: [
        { x: 20, y: 0 },
        { x: 0, y: 20 },
        { x: 40, y: 40 },
      ],
    })
  })
})
