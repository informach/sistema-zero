import { expect, test } from 'bun:test'
import {
  encodePintaRegionLayers,
  PINTA_REGION_CELL_COUNT,
  PINTA_REGION_LIMITS,
  type PintaRegionCells,
  parsePintaRegionBounds,
  parsePintaRegionLayers,
} from './pinta-regions'

const bounds = { col: 0, row: 0, cols: 64, rows: 64 }
function grid(col = 0, row = 0): PintaRegionCells {
  const cells = new Int16Array(1024).fill(-1)
  cells[0] = 0
  cells[1] = 32767
  return { kind: 'regions', version: 1, side: 32, chunks: [{ col, row, cells }] }
}

test('preserva todos os valores de célula, endian e representação JSON canônica', () => {
  const original = grid()
  const wire = encodePintaRegionLayers([original], bounds)
  expect(wire).not.toBeNull()
  expect(wire![0]!.encoding).toBe('i16le-base64-v1')
  expect(atob(wire![0]!.chunks[0]!.data).slice(0, 6)).toBe('\x00\x00\xff\x7f\xff\xff')
  const restored = parsePintaRegionLayers(JSON.parse(JSON.stringify(wire)), bounds)
  expect(restored).toEqual([original])
  expect(encodePintaRegionLayers(restored!, bounds)).toEqual(wire)
  expect(original.chunks[0]!.cells[1]).toBe(32767)
})

test('região vazia não aloca células e pode cobrir uma extensão lógica grande', () => {
  const empty: PintaRegionCells = { kind: 'regions', version: 1, side: 32, chunks: [] }
  expect(
    parsePintaRegionLayers([empty], { col: -5000, row: -5000, cols: 10000, rows: 10000 }),
  ).toEqual([empty])
  expect(parsePintaRegionLayers([], bounds)).toEqual([])
})

test('mantém buffers em memória e não compartilha buffers entre chunks decodificados', () => {
  const first = grid(),
    second = grid(1)
  const input = [{ ...first, chunks: [...first.chunks, ...second.chunks] }]
  const memory = parsePintaRegionLayers(input, bounds)
  expect(memory![0]).toBe(input[0])
  const wire = encodePintaRegionLayers(input, bounds)!
  const decoded = parsePintaRegionLayers(wire, bounds)!
  decoded[0]!.chunks[0]!.cells[0] = 5
  expect(decoded[0]!.chunks[1]!.cells[0]).toBe(0)
  expect(input[0]!.chunks[0]!.cells[0]).toBe(0)
})

test('coordenadas negativas e bordas não alinhadas preservam as células', () => {
  const cells = new Int16Array(1024).fill(-1)
  cells[1023] = 13
  const source: PintaRegionCells = {
    kind: 'regions',
    version: 1,
    side: 32,
    chunks: [{ col: -2, row: -1, cells }],
  }
  const area = { col: -33, row: -1, cols: 64, rows: 64 }
  expect(parsePintaRegionLayers(encodePintaRegionLayers([source], area), area)).toEqual([source])
  cells[0] = 7 // fora do retângulo declarado
  expect(encodePintaRegionLayers([source], area)).toBeNull()
})

test('rejeita chunks vazios, duplicados, malformados e células inválidas sem cortar dados', () => {
  const valid = grid()
  for (const chunk of [
    { col: 0, row: 0, cells: new Int16Array(1024).fill(-1) },
    { col: 0, row: 0, cells: new Int16Array(1023) },
    { col: 0, row: 0, cells: new Uint16Array(1024) },
    { col: 0, row: 0, cells: new Int16Array(1024).fill(-2) },
    { col: 0.5, row: 0, cells: valid.chunks[0]!.cells },
    { col: 1000000000, row: 0, cells: valid.chunks[0]!.cells },
    { ...valid.chunks[0], extra: 'formato não reconhecido' },
  ])
    expect(parsePintaRegionLayers([{ ...valid, chunks: [chunk] }], bounds)).toBeNull()
  expect(
    parsePintaRegionLayers([{ ...valid, chunks: [valid.chunks[0], valid.chunks[0]] }], bounds),
  ).toBeNull()
  expect(parsePintaRegionLayers([{ ...valid, chunks: Array(1) }], bounds)).toBeNull()
})

test('barreira de formato rejeita versões, campos e codificações desconhecidos', () => {
  const valid = grid()
  for (const patch of [
    { version: 2 },
    { side: 16 },
    { kind: 'future' },
    { encoding: 'future' },
    { extra: true },
  ])
    expect(parsePintaRegionLayers([{ ...valid, ...patch }], bounds)).toBeNull()
  expect(parsePintaRegionLayers(Array(1), bounds)).toBeNull()
  expect(parsePintaRegionLayers(Array(33).fill(valid), bounds)).toBeNull()
})

test('rejeita limites inválidos antes de ler dados de chunks', () => {
  let reads = 0
  const input = [
    {
      kind: 'regions',
      version: 1,
      side: 32,
      encoding: 'i16le-base64-v1',
      chunks: [
        {
          col: 0,
          row: 0,
          get data() {
            reads++
            throw Error('não deve ser lido')
          },
        },
      ],
    },
  ]
  for (const area of [
    null,
    {},
    { ...bounds, cols: 0 },
    { ...bounds, rows: 1.5 },
    { ...bounds, col: -10001 },
    { ...bounds, col: 9999 },
    { ...bounds, cols: 10001 },
    { ...bounds, cols: 1000000000 },
    { ...bounds, extra: true },
  ])
    expect(parsePintaRegionLayers(input, area)).toBeNull()
  expect(reads).toBe(0)
})

test('orçamento é global e precede decodificação e alocação de buffers', () => {
  let reads = 0
  const chunk = {
    col: 0,
    row: 0,
    get data() {
      reads++
      throw Error('decodificação prematura')
    },
  }
  const header = { kind: 'regions', version: 1, side: 32, encoding: 'i16le-base64-v1' }
  expect(
    parsePintaRegionLayers([{ ...header, chunks: Array(2049).fill(chunk) }], bounds),
  ).toBeNull()
  expect(
    parsePintaRegionLayers(
      [
        { ...header, chunks: Array(2048).fill(chunk) },
        { ...header, chunks: [chunk] },
      ],
      bounds,
    ),
  ).toBeNull()
  expect(reads).toBe(0)
  expect(PINTA_REGION_LIMITS.maxChunks * PINTA_REGION_CELL_COUNT * 2).toBe(4 * 1024 * 1024)
})

test('base64 deve ser exato e canônico, sem payload truncado, lixo ou células negativas', () => {
  const wire = encodePintaRegionLayers([grid()], bounds)!
  const valid = wire[0]!.chunks[0]!.data
  for (const data of [
    valid.slice(0, -1),
    `${valid}AAAA`,
    `${valid}\n`,
    valid.replace(/.$/, '!'),
    btoa(String.fromCharCode(254, 255).repeat(1024)),
    btoa('\xff\xff'.repeat(1024)),
  ])
    expect(
      parsePintaRegionLayers([{ ...wire[0], chunks: [{ col: 0, row: 0, data }] }], bounds),
    ).toBeNull()
  const tail = valid.slice(-2, -1)
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  const alternate = alphabet[alphabet.indexOf(tail) + 1]!
  expect(
    parsePintaRegionLayers(
      [{ ...wire[0], chunks: [{ col: 0, row: 0, data: `${valid.slice(0, -2)}${alternate}=` }] }],
      bounds,
    ),
  ).toBeNull()
})

test('teto real de 2048 regiões conserva 4 MiB sem alocar as áreas vazias do mundo', () => {
  const single = encodePintaRegionLayers([grid()], bounds)![0]!.chunks[0]!.data
  const chunks = Array.from({ length: 2048 }, (_, index) => ({
    col: index % 64,
    row: Math.floor(index / 64),
    data: single,
  }))
  const result = parsePintaRegionLayers(
    [{ kind: 'regions', version: 1, side: 32, encoding: 'i16le-base64-v1', chunks }],
    { col: 0, row: 0, cols: 2048, rows: 1024 },
  )!
  expect(result[0]!.chunks).toHaveLength(2048)
  expect(result[0]!.chunks.reduce((sum, chunk) => sum + chunk.cells.byteLength, 0)).toBe(
    4 * 1024 * 1024,
  )
  expect(result[0]!.chunks[2047]!.cells[1]).toBe(32767)
})

test('codificação ordena os chunks por linha e coluna sem reordenar o documento', () => {
  const source = grid(1)
  source.chunks.push(...grid().chunks)
  const reversed = { ...source, chunks: [...source.chunks].reverse() }
  expect(encodePintaRegionLayers([source], bounds)).toEqual(
    encodePintaRegionLayers([reversed], bounds),
  )
  expect(source.chunks[0]!.col).toBe(1)
  expect(encodePintaRegionLayers([source], bounds)![0]!.chunks.map(({ col }) => col)).toEqual([
    0, 1,
  ])
})

test('o gravador também confere o orçamento global antes de acessar os buffers', () => {
  let reads = 0
  const chunk = {
    col: 0,
    row: 0,
    get cells(): Int16Array {
      reads++
      throw Error('leitura prematura')
    },
  }
  const first: PintaRegionCells = {
    kind: 'regions',
    version: 1,
    side: 32,
    chunks: Array(2048).fill(chunk),
  }
  expect(encodePintaRegionLayers([first, { ...first, chunks: [chunk] }], bounds)).toBeNull()
  expect(reads).toBe(0)
})

test('preserva todos os 32769 valores históricos sem interpretar as flags das peças', () => {
  const chunks = Array.from({ length: 33 }, (_, col) => ({
    col,
    row: 0,
    cells: Int16Array.from({ length: 1024 }, (_, index) => Math.min(32767, col * 1024 + index - 1)),
  }))
  const area = { col: 0, row: 0, cols: 33 * 32, rows: 32 }
  const source: PintaRegionCells = { kind: 'regions', version: 1, side: 32, chunks }
  const decoded = parsePintaRegionLayers(encodePintaRegionLayers([source], area), area)!
  expect(decoded).toEqual([source])
  expect(decoded[0]!.chunks[32]!.cells[0]).toBe(32767)
})

test('payload não-JSON ou futuro falha fechado e nunca lança ao chamador', () => {
  const source = grid()
  const bad = {
    ...source,
    get chunks(): PintaRegionCells['chunks'] {
      throw Error('acesso indisponível')
    },
  }
  expect(parsePintaRegionLayers([bad], bounds)).toBeNull()
  expect(encodePintaRegionLayers([bad], bounds)).toBeNull()
  expect(
    parsePintaRegionLayers([Object.assign(Object.create({ inherited: true }), source)], bounds),
  ).toBeNull()
  expect(parsePintaRegionLayers([{ ...source, [Symbol('future')]: true }], bounds)).toBeNull()
  expect(encodePintaRegionLayers(parsePintaRegionLayers([source], bounds)!, bounds)).not.toBeNull()
})

test('validador de extensão compartilhado é estrito e protege também acessores defeituosos', () => {
  expect(parsePintaRegionBounds(bounds)).toEqual(bounds)
  expect(parsePintaRegionBounds({ ...bounds, cols: 0 })).toBeNull()
  expect(parsePintaRegionBounds({ ...bounds, extra: true })).toBeNull()
  expect(
    parsePintaRegionBounds({
      ...bounds,
      get col() {
        throw Error('indisponível')
      },
    }),
  ).toBeNull()
})
