import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { isMoradaFile, MORADA_CATALOG, moradaFileUrl } from '@sistemazero/core/morada'
import { TROPHY_HINT, TROPHY_SHELF_ITEM_ID } from '../src/lib/room-catalog'

/** Os oito troféus autorais permanecem modelos reais no catálogo novo. */
describe('troféus do quarto — peças Morada', () => {
  const trophies = Object.keys(TROPHY_HINT).filter((id) => id !== TROPHY_SHELF_ITEM_ID)

  test('as oito conquistas continuam com modelos distintos, sem a estante antiga', () => {
    expect(trophies).toHaveLength(8)
    expect(trophies).toContain('trofeu-oficina-completa')
    const pieces = Object.values(MORADA_CATALOG.pieces).filter((piece) =>
      piece.tags.includes('trophy'),
    )
    expect(pieces.map((piece) => piece.id).sort()).toEqual(
      trophies.map((id) => `trophy/${id}`).sort(),
    )
    expect(new Set(pieces.map((piece) => piece.file)).size).toBe(8)
    expect(MORADA_CATALOG.pieces[`trophy/${TROPHY_SHELF_ITEM_ID}`]).toBeUndefined()
  })

  test.each(
    trophies,
  )('%s tem modelo e miniatura autorizados e a malha autoral é preservada', (id) => {
    const piece = MORADA_CATALOG.pieces[`trophy/${id}`]
    if (!piece) throw new Error(`Troféu ausente no catálogo Morada: ${id}`)
    expect(piece.kind).toBe('furniture')
    expect(piece.category).toBe('trofeus')
    expect(piece.size.every((dimension) => dimension > 0)).toBe(true)
    expect(piece.file).toMatch(/^models\/[a-f0-9]+\.glb$/)
    expect(isMoradaFile(piece.file)).toBe(true)
    expect(isMoradaFile(piece.thumb)).toBe(true)
    expect(moradaFileUrl(piece.file)).toStartWith('/api/morada3d/')
    // As fontes são artes autorais do Sistema Zero, disponíveis também no CI.
    const source = readFileSync(
      join(import.meta.dir, '..', '..', '..', 'art', 'trofeus', 'items', `${id}.glb`),
    )
    expect(source.subarray(0, 4).toString()).toBe('glTF')
    const gltf = JSON.parse(source.subarray(20, 20 + source.readUInt32LE(12)).toString()) as {
      meshes?: { primitives: { attributes: { POSITION?: number } }[] }[]
      accessors?: { count: number }[]
    }
    const positions = (gltf.meshes ?? [])
      .flatMap((mesh) => mesh.primitives)
      .flatMap((primitive) =>
        primitive.attributes.POSITION === undefined ? [] : [primitive.attributes.POSITION],
      )
    expect(positions.length).toBeGreaterThan(0)
    for (const position of positions)
      expect(gltf.accessors?.[position]?.count ?? 0).toBeGreaterThan(0)
  })
})
