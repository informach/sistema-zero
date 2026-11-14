import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROOM_ITEM_INFO } from '../src/lib/room-catalog'

/**
 * Os arquivos 3D do quarto (27/10/2026): cada peça do catálogo tem um GLB feito no Blender
 * (`scripts/room-blender/`) e uma miniatura PNG, nas DUAS comunidades (o quarto e as bandejas são
 * do member-shell, mas cada app serve o próprio `public/`). Peça nova sem arquivo cairia nas
 * primitivas antigas ou na caixa cinza; arquivo só num app deixaria o outro sem modelo.
 *
 * Também confere o contrato de posição do quarto direto nos GLBs (frente em +Z, 1 célula = 1):
 * peça de chão com a base no chão e dentro do seu footprint; peça de parede centrada, na frente
 * da parede (o quarto a pendura 0,14 à frente dela, então nada passa de z = -0,14) e dentro do seu
 * tamanho. A folga de 0,1 aceita um enfeite que passa um pouco do quadrado (a cortina da janela).
 */
const KIDS = join(import.meta.dir, '..', 'public', 'room3d')
const ADULT = join(import.meta.dir, '..', '..', 'community', 'public', 'room3d')
const ids = Object.keys(ROOM_ITEM_INFO)

interface Gltf {
  nodes?: { mesh?: number; translation?: number[]; rotation?: number[]; scale?: number[] }[]
  meshes?: { primitives: { attributes: { POSITION?: number } }[] }[]
  accessors?: { min?: number[]; max?: number[] }[]
  animations?: unknown[]
}

function readGltf(path: string): Gltf {
  const buf = readFileSync(path)
  expect(buf.toString('latin1', 0, 4)).toBe('glTF')
  const jsonLength = buf.readUInt32LE(12)
  return JSON.parse(buf.toString('utf8', 20, 20 + jsonLength)) as Gltf
}

/** Caixa das malhas de uma peça parada (uma malha só, sem transformação no nó). */
function bounds(g: Gltf) {
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (const node of g.nodes ?? []) {
    if (node.mesh === undefined) continue
    expect(node.translation ?? [0, 0, 0]).toEqual([0, 0, 0])
    for (const prim of g.meshes?.[node.mesh]?.primitives ?? []) {
      const acc = g.accessors?.[prim.attributes.POSITION ?? -1]
      for (let i = 0; i < 3; i++) {
        min[i] = Math.min(min[i] as number, acc?.min?.[i] ?? Infinity)
        max[i] = Math.max(max[i] as number, acc?.max?.[i] ?? -Infinity)
      }
    }
  }
  return { min, max }
}

describe('quarto 3D: arquivos das peças', () => {
  test('a varredura encontra as peças (anti-vácuo)', () => {
    expect(ids.length).toBeGreaterThanOrEqual(66)
    expect(ids).toContain('aquario')
    expect(ids).toContain('pet-gato')
  })

  test.each(ids)('%s tem GLB e miniatura iguais nas duas comunidades', (id) => {
    for (const file of [`items/${id}.glb`, `thumbs/${id}.png`]) {
      const kids = join(KIDS, file)
      const adult = join(ADULT, file)
      expect(existsSync(kids), `Kids sem ${file}`).toBe(true)
      expect(existsSync(adult), `adulto sem ${file}`).toBe(true)
      expect(
        readFileSync(kids).equals(readFileSync(adult)),
        `${file} diferente nos dois apps`,
      ).toBe(true)
    }
    expect(readFileSync(join(KIDS, `thumbs/${id}.png`)).toString('latin1', 1, 4)).toBe('PNG')
  })

  test.each(ids)('%s: animação só onde o catálogo espera', (id) => {
    const g = readGltf(join(KIDS, `items/${id}.glb`))
    const hasAnimation = (g.animations?.length ?? 0) > 0
    const expected = Boolean(ROOM_ITEM_INFO[id]?.animated) || id.startsWith('pet-')
    expect(hasAnimation, `${id}: animação no GLB ≠ catálogo`).toBe(expected)
  })

  const staticIds = ids.filter((id) => !ROOM_ITEM_INFO[id]?.animated && !id.startsWith('pet-'))
  test.each(staticIds)('%s fica no lugar certo do quarto', (id) => {
    const info = ROOM_ITEM_INFO[id]
    if (!info) throw new Error(id)
    const { min, max } = bounds(readGltf(join(KIDS, `items/${id}.glb`)))
    const [x0, y0, z0] = min as [number, number, number]
    const [x1, y1, z1] = max as [number, number, number]
    const tol = 0.1
    expect(Math.max(-x0, x1), `${id}: largura`).toBeLessThanOrEqual(info.w / 2 + tol)
    if (info.mount === 'wall') {
      expect(Math.max(-y0, y1), `${id}: altura na parede`).toBeLessThanOrEqual(info.h / 2 + tol)
      expect(z0, `${id}: atravessa a parede`).toBeGreaterThanOrEqual(-0.14)
    } else {
      expect(Math.abs(y0), `${id}: base no chão`).toBeLessThanOrEqual(0.02)
      expect(Math.max(-z0, z1), `${id}: profundidade`).toBeLessThanOrEqual(info.h / 2 + tol)
    }
  })
})
