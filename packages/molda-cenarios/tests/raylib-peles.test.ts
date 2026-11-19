import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { encodeGlbContainer, readGltfDocument } from '@sistemazero/molda/gltf'
import { normalizarPelesParaRaylib } from '../src/exportar/peles-raylib'

function duplicado(diferente = false, identidadeImplicita = false) {
  const original = new Uint8Array(
      readFileSync(
        new URL(
          '../../studio/scripts/raylib/scenes/assets/models/molda-pesos.glb',
          import.meta.url,
        ),
      ),
    ),
    r = readGltfDocument(original)
  if (r.status !== 'ready') throw Error('Fixture sem recursos')
  const d = r.document,
    json = structuredClone(d.source.json),
    skins = (json.skins as Record<string, unknown>[]).slice(0, 1),
    accessors = json.accessors as Record<string, unknown>[],
    originalSkin = skins[0]!,
    outro = structuredClone(originalSkin)
  outro.inverseBindMatrices = accessors.length
  accessors.push(structuredClone(accessors[originalSkin.inverseBindMatrices as number]!))
  const binarios = [...d.resources.buffers]
  if (identidadeImplicita) {
    const juntas = (outro.joints as number[]).length,
      original = binarios[0]!,
      bin = new Uint8Array(original.length + juntas * 64),
      v = new DataView(bin.buffer)
    bin.set(original)
    for (let i = 0; i < juntas * 16; i++)
      v.setFloat32(original.length + i * 4, (i % 16) % 5 === 0 ? 1 : 0, true)
    const views = json.bufferViews as Record<string, unknown>[]
    views.push({ buffer: 0, byteOffset: original.length, byteLength: juntas * 64 })
    accessors[outro.inverseBindMatrices as number] = {
      bufferView: views.length - 1,
      componentType: 5126,
      type: 'MAT4',
      count: juntas,
    }
    delete originalSkin.inverseBindMatrices
    const buffers = json.buffers as { byteLength: number }[]
    buffers[0]!.byteLength = bin.length
    binarios[0] = bin
  }
  if (diferente) outro.joints = [...(outro.joints as number[])].reverse()
  skins.push(outro)
  json.skins = skins
  const nodes = json.nodes as Record<string, unknown>[],
    origem = nodes.find((n) => n.skin === 0)!,
    clone = { ...structuredClone(origem), skin: 1 },
    indice = nodes.length
  for (const no of nodes) if (no.skin !== undefined) no.skin = 0
  nodes.push(clone)
  const scene = (json.scenes as { nodes: number[] }[])[json.scene as number]!
  scene.nodes.push(indice)
  return encodeGlbContainer(json, binarios)
}

test('Raylib consolida somente peles com juntas e matrizes idênticas, preservando BIN, clipes e origem', () => {
  const entrada = duplicado(),
    antes = entrada.slice(),
    r = normalizarPelesParaRaylib(entrada),
    a = readGltfDocument(entrada),
    b = readGltfDocument(r.bytes)
  if (a.status !== 'ready' || b.status !== 'ready') throw Error('GLB não reabriu')
  expect(r.pelesAntes).toBe(2)
  expect(r.pelesDepois).toBe(1)
  expect(a.document.skins).toHaveLength(2)
  expect(b.document.skins).toHaveLength(1)
  expect(b.document.resources.buffers[0]).toEqual(a.document.resources.buffers[0])
  expect(b.document.source.json.animations).toEqual(a.document.source.json.animations)
  expect(b.document.graph.nodes.filter((n) => n.skin !== null).every((n) => n.skin === 0)).toBe(
    true,
  )
  expect(entrada).toEqual(antes)
  expect(normalizarPelesParaRaylib(r.bytes).bytes).toBe(r.bytes)
})

test('Raylib recusa esqueletos diferentes em vez de descartar o segundo silenciosamente', () => {
  const entrada = duplicado(true),
    antes = entrada.slice()
  expect(() => normalizarPelesParaRaylib(entrada)).toThrow(/esqueletos diferentes/)
  expect(entrada).toEqual(antes)
})

test('bind pose omitida equivale a uma matriz identidade para cada junta', () => {
  const r = normalizarPelesParaRaylib(duplicado(false, true))
  expect(r.pelesDepois).toBe(1)
})
