import { describe, expect, it } from 'bun:test'
import { PintaLocalStorageError } from '../core/localStorageErrors'
import {
  createPixelSpriteAsset,
  createTilemapAsset,
  isTileLayer,
  type PintaAsset,
  type TilemapAsset,
  type TilemapTileLayer,
} from '../core/project'
import { CELL_FLIP_D, CELL_FLIP_H, makeCell } from '../tiles/cell'
import { createMapSet } from '../tiles/sets'
import {
  decodeLocalChunkDocument,
  encodeLocalChunkDocument,
  localChunkKeys,
  planLocalStorageWrites,
} from './localChunkStorage'

function fixture(cols = 256, rows = 256): TilemapAsset & { layers: TilemapTileLayer[] } {
  const map = createTilemapAsset({ name: 'chunks', tilesetId: 'pecas', cols, rows })
  const first = map.layers[0]
  if (!first || !isTileLayer(first)) throw new Error('Falta a camada de peças')
  return {
    ...map,
    layers: [
      {
        ...first,
        id: 'chao',
        front: true,
        offsetX: 0.25,
        properties: { score: { type: 'int', value: 0 } },
        cells: Int16Array.from({ length: cols * rows }, (_, index) =>
          makeCell(index % 256, index % 2 ? CELL_FLIP_D | CELL_FLIP_H : 0),
        ),
      },
    ],
  }
}
const keyOf = (map: TilemapAsset) => `pinta:local:document:${map.id}`
const document = <T extends PintaAsset | null>(asset: T) => ({
  version: 1,
  capability: 7,
  revision: 'revisao-1',
  asset,
})
function physical(map: TilemapAsset) {
  const key = keyOf(map),
    original = document(map)
  const encoded = encodeLocalChunkDocument(key, original, new Map())
  const records = new Map<string, unknown>(encoded.chunks)
  records.set(key, encoded.document)
  return { key, original, encoded, records }
}

describe('chunks físicos da autoridade local', () => {
  it('conserva todas as células, flags e metadados sem colocar o buffer no cabeçalho', () => {
    const map = fixture(),
      stored = physical(map)
    expect(stored.encoded.chunks.size).toBe(64)
    expect(localChunkKeys(stored.key, stored.encoded.document)).toHaveLength(64)
    expect((stored.encoded.document as { version: number }).version).toBe(2)
    expect(decodeLocalChunkDocument(stored.key, stored.encoded.document, stored.records)).toEqual(
      stored.original,
    )
    expect(map.layers[0]!.cells).toBeInstanceOf(Int16Array)
  })

  it('mantém o envelope anterior nos projetos pequenos', () => {
    const map = fixture(8, 8),
      original = document(map)
    const encoded = encodeLocalChunkDocument(keyOf(map), original, new Map())
    expect(encoded.document).toBe(original)
    expect(encoded.chunks.size).toBe(0)
  })

  it('recorta as arestas sem criar células ou perder posições', () => {
    const stored = physical(fixture(129, 255))
    expect(stored.encoded.chunks.size).toBe(40)
    expect([...stored.encoded.chunks.values()].reduce((sum, cells) => sum + cells.length, 0)).toBe(
      129 * 255,
    )
    expect(decodeLocalChunkDocument(stored.key, stored.encoded.document, stored.records)).toEqual(
      stored.original,
    )
  })

  it('uma casa alterada grava um chunk e o cabeçalho; ler não regrava o documento', () => {
    const stored = physical(fixture())
    const logical = new Map(stored.records)
    logical.set(
      stored.key,
      decodeLocalChunkDocument(stored.key, stored.encoded.document, stored.records),
    )
    expect(planLocalStorageWrites(logical, new Map(logical), stored.records).puts.size).toBe(0)
    const next = structuredClone(stored.original)
    next.revision = 'revisao-2'
    const first = next.asset!.layers[0]!
    if (!isTileLayer(first)) throw new Error('Falta a camada de peças')
    first.cells[255 * 256 + 255] = 7
    const changed = new Map(logical)
    changed.set(stored.key, next)
    const writes = planLocalStorageWrites(logical, changed, stored.records)
    expect(writes.puts.size).toBe(2)
    expect(writes.deletes.size).toBe(0)
    const chunks = [...writes.puts].filter(([key]) => key !== stored.key)
    expect(chunks).toHaveLength(1)
    expect((chunks[0]![1] as Int16Array).byteLength).toBe(2048)
    const committed = new Map([...stored.records, ...writes.puts])
    expect(decodeLocalChunkDocument(stored.key, committed.get(stored.key), committed)).toEqual(next)
  })

  it('uma lápide retira somente os chunks do próprio documento', () => {
    const stored = physical(fixture()),
      other = physical(fixture())
    const disk = new Map([...stored.records, ...other.records])
    const logical = new Map(disk)
    logical.set(stored.key, decodeLocalChunkDocument(stored.key, disk.get(stored.key), disk))
    logical.set(other.key, decodeLocalChunkDocument(other.key, disk.get(other.key), disk))
    const next = new Map(logical)
    next.set(stored.key, document(null))
    const writes = planLocalStorageWrites(logical, next, disk)
    expect(writes.puts.size).toBe(1)
    expect(writes.deletes.size).toBe(64)
    for (const key of writes.deletes) expect(other.records.has(key)).toBe(false)
  })

  it('não usa o espelho quando falta um chunk', () => {
    const stored = physical(fixture())
    stored.records.delete(localChunkKeys(stored.key, stored.encoded.document)[0]!)
    expect(() =>
      decodeLocalChunkDocument(stored.key, stored.encoded.document, stored.records),
    ).toThrow(PintaLocalStorageError)
  })

  it('conserva protocolos físicos desconhecidos para a barreira de versão', () => {
    const future = { version: 3, storage: 'future', asset: fixture() }
    expect(localChunkKeys('pinta:local:document:x', future)).toEqual([])
    expect(decodeLocalChunkDocument('pinta:local:document:x', future, new Map())).toBe(future)
  })

  it('chunks vazios não ocupam registros; preencher e apagar uma casa muda só aquele chunk', () => {
    const map = fixture()
    map.layers[0]!.cells.fill(-1)
    const empty = physical(map)
    expect(empty.encoded.chunks.size).toBe(0)
    expect(localChunkKeys(empty.key, empty.encoded.document)).toEqual([])
    expect(decodeLocalChunkDocument(empty.key, empty.encoded.document, empty.records)).toEqual(
      empty.original,
    )
    const next = structuredClone(empty.original)
    const floor = next.asset.layers[0]!
    if (!isTileLayer(floor)) throw new Error('Falta a camada de peças')
    floor.cells[100] = makeCell(3, CELL_FLIP_D)
    const logical = new Map([[empty.key, empty.original]])
    const added = planLocalStorageWrites(logical, new Map([[empty.key, next]]), empty.records)
    expect(added.puts.size).toBe(2)
    const disk = new Map([...empty.records, ...added.puts])
    const removed = planLocalStorageWrites(new Map([[empty.key, next]]), logical, disk)
    expect(removed.puts.size).toBe(1)
    expect(removed.deletes.size).toBe(1)
  })

  it('células iguais em um novo buffer só gravam a revisão, sem regravar chunks', () => {
    const stored = physical(fixture()),
      next = structuredClone(stored.original)
    next.revision = 'outra-revisao'
    const writes = planLocalStorageWrites(
      new Map([[stored.key, stored.original]]),
      new Map([[stored.key, next]]),
      stored.records,
    )
    expect([...writes.puts.keys()]).toEqual([stored.key])
    expect(writes.deletes.size).toBe(0)
  })

  it('conserva o mapa interno e as referências de um conjunto', () => {
    const map = fixture()
    delete map.layers[0]!.offsetX
    const set = createMapSet(map, { col: 0, row: 0, cols: 256, rows: 256 }, 16, 'Vila')
    const original = document(set),
      key = `pinta:local:document:${set.id}`
    const encoded = encodeLocalChunkDocument(key, original, new Map())
    const records = new Map<string, unknown>(encoded.chunks)
    records.set(key, encoded.document)
    expect(encoded.chunks.size).toBe(64)
    expect(decodeLocalChunkDocument(key, encoded.document, records)).toEqual(original)
  })

  it('encolher abaixo do limiar volta ao envelope denso e libera todos os chunks antigos', () => {
    const stored = physical(fixture())
    const small = fixture(8, 8)
    small.id = stored.original.asset.id
    const next = document(small)
    const writes = planLocalStorageWrites(
      new Map([[stored.key, stored.original]]),
      new Map([[stored.key, next]]),
      stored.records,
    )
    expect(writes.puts.get(stored.key)).toBe(next)
    expect(writes.deletes.size).toBe(64)
  })

  it('reduzir linhas conserva os chunks ainda referenciados e libera os demais', () => {
    const stored = physical(fixture()),
      next = structuredClone(stored.original)
    next.asset.rows = 128
    const floor = next.asset.layers[0]!
    if (!isTileLayer(floor)) throw new Error('Falta a camada de peças')
    floor.cells = floor.cells.slice(0, 256 * 128)
    const writes = planLocalStorageWrites(
      new Map([[stored.key, stored.original]]),
      new Map([[stored.key, next]]),
      stored.records,
    )
    expect(writes.puts.size).toBe(1)
    expect(writes.deletes.size).toBe(32)
    const disk = new Map([...stored.records, ...writes.puts])
    for (const key of writes.deletes) disk.delete(key)
    expect(decodeLocalChunkDocument(stored.key, disk.get(stored.key), disk)).toEqual(next)
  })

  for (const corrupt of [
    undefined,
    new Int16Array(1023),
    new Uint16Array(1024),
    new Int16Array(1024).fill(-2),
  ])
    it('recusa chunk ausente, truncado, com tipo ou célula inválida', () => {
      const stored = physical(fixture())
      stored.records.set(localChunkKeys(stored.key, stored.encoded.document)[0]!, corrupt)
      expect(() =>
        decodeLocalChunkDocument(stored.key, stored.encoded.document, stored.records),
      ).toThrow(PintaLocalStorageError)
    })

  for (const value of [0, 257, 1_000_000_000, '256'])
    it('recusa dimensões físicas inválidas antes de reconstruir os buffers', () => {
      const stored = physical(fixture())
      const raw = structuredClone(stored.encoded.document) as { asset: { cols: unknown } }
      raw.asset.cols = value
      expect(() => localChunkKeys(stored.key, raw)).toThrow(PintaLocalStorageError)
      expect(() => decodeLocalChunkDocument(stored.key, raw, stored.records)).toThrow(
        PintaLocalStorageError,
      )
    })

  it('não permite referenciar o chunk de outro documento', () => {
    const stored = physical(fixture()),
      foreign = physical(fixture())
    const raw = structuredClone(stored.encoded.document) as {
      asset: { layers: Array<{ cells: { keys: string[] } }> }
    }
    raw.asset.layers[0]!.cells.keys[0] = localChunkKeys(foreign.key, foreign.encoded.document)[0]!
    expect(() => localChunkKeys(stored.key, raw)).toThrow(PintaLocalStorageError)
  })

  it('não converte cabeçalho físico sem camadas em um mapa vazio', () => {
    const stored = physical(fixture())
    const raw = structuredClone(stored.encoded.document) as { asset: { layers: unknown[] } }
    raw.asset.layers = []
    expect(() => localChunkKeys(stored.key, raw)).toThrow(PintaLocalStorageError)
    expect(() => decodeLocalChunkDocument(stored.key, raw, stored.records)).toThrow(
      PintaLocalStorageError,
    )
  })

  it('preserva identificadores antigos longos usando armazenamento denso', () => {
    const map = fixture()
    map.layers[0]!.id = 'a'.repeat(513)
    const original = document(map),
      encoded = encodeLocalChunkDocument(keyOf(map), original, new Map())
    expect(encoded.document).toBe(original)
    expect(encoded.chunks.size).toBe(0)
  })

  for (const target of ['asset', 'layer'])
    it(`preserva Unicode legado não emparelhado no ID de ${target}`, () => {
      const map = fixture()
      if (target === 'asset') map.id = 'legado-\ud800'
      else map.layers[0]!.id = 'legado-\ud800'
      const original = document(map)
      const encoded = encodeLocalChunkDocument(keyOf(map), original, new Map())
      expect(encoded.document).toBe(original)
      expect(encoded.chunks.size).toBe(0)
    })

  it('preserva grupos, objetos, propriedades e versões de arte no cabeçalho', () => {
    const map: TilemapAsset = fixture()
    const sprite = createPixelSpriteAsset({ name: 'arvore', frameSize: 16 })
    map.resources = [{ sourceId: 'arte-original', capturedAt: 123, asset: sprite }]
    map.physics = 'precise'
    map.layers.unshift({
      id: 'grupo',
      kind: 'group',
      name: 'Vila',
      visible: true,
      opacity: 0.75,
      parallaxX: 0.5,
      properties: { zero: { type: 'int', value: 0 } },
    })
    map.layers[1]!.parentId = 'grupo'
    map.layers.push({
      id: 'lugares',
      kind: 'objects',
      name: 'Lugares',
      visible: true,
      parentId: 'grupo',
      properties: { enabled: false },
      objects: [
        {
          id: 'arvore',
          name: 'Árvore',
          type: 'vegetacao',
          shape: 'art',
          x: 32.5,
          y: 16.25,
          width: 16,
          height: 16,
          rotation: 30,
          flipX: true,
          collision: true,
          art: { assetId: sprite.id, animationId: sprite.animations[0]!.id },
          properties: {
            empty: '',
            score: { type: 'int', value: 0 },
            owner: { type: 'object', value: 'arvore' },
          },
        },
      ],
    })
    const stored = physical(map)
    expect(stored.encoded.chunks.size).toBe(64)
    expect(decodeLocalChunkDocument(stored.key, stored.encoded.document, stored.records)).toEqual(
      stored.original,
    )
  })
})
