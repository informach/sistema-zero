import { describe, expect, test } from 'bun:test'
import { MORADA_CATALOG } from './catalog.generated'
import { isMoradaFile, moradaBucketKey } from './files'

describe('biblioteca Morada importada', () => {
  const pieces = Object.values(MORADA_CATALOG.pieces)
  test('traz os móveis, construção, fazenda e somente gatos/cachorros de estimação', () => {
    expect(pieces.filter((p) => p.id.startsWith('moveis/'))).toHaveLength(2455)
    expect(pieces.filter((p) => p.kind === 'construction')).toHaveLength(459)
    expect(pieces.filter((p) => p.id.startsWith('cidade/fazenda/'))).toHaveLength(160)
    const pets = pieces.filter((p) => p.kind === 'pet')
    expect(pets).toHaveLength(24)
    expect(pets.every((p) => p.species === 'cat' || p.species === 'dog')).toBe(true)
    expect(
      pets.every((p) =>
        ['parado', 'andar', 'correr'].every((id) => p.animations.some((a) => a.id === id)),
      ),
    ).toBe(true)
  })
  test('só oito troféus preservam arte anterior; estante usa Morada', () => {
    expect(pieces.filter((p) => p.id.startsWith('trophy/'))).toHaveLength(8)
    expect(pieces.some((p) => p.id === 'trophy/estante-trofeus')).toBe(false)
  })
  test('todo recurso é permitido explicitamente, sem caminho público antigo', () => {
    for (const p of pieces) {
      expect(isMoradaFile(p.file)).toBe(true)
      expect(isMoradaFile(p.thumb)).toBe(true)
      expect(p.file.startsWith('models/')).toBe(true)
      for (const m of p.materials)
        for (const file of [m.map, m.emissiveMap]) if (file) expect(isMoradaFile(file)).toBe(true)
      expect(p.size.every((n) => Number.isFinite(n) && n >= 0)).toBe(true)
    }
    expect(isMoradaFile('../avatar/secret.glb')).toBe(false)
    expect(isMoradaFile('models/unknown.glb')).toBe(false)
    expect(moradaBucketKey('models/a.glb')).toBe('morada/models/a.glb')
  })
  test('paredes com porta não têm caixa única fechando o vão', () => {
    const p = MORADA_CATALOG.pieces['construcao/porta_2m']
    expect(p).toBeDefined()
    expect(
      p?.colliders.some(
        (b) =>
          Math.abs(b.center[0] - 1) < b.size[0] / 2 && Math.abs(b.center[1] - 1) < b.size[1] / 2,
      ),
    ).toBe(false)
  })
})
