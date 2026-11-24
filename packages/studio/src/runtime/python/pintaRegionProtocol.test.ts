import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { PGZERO_LIMITS, PGZERO_OP, PGZERO_OP_ARITY } from './pgzero/protocol'
import {
  checkPintaAffine,
  checkPintaReleaseAttachments,
  checkPintaTexturePng,
  isPintaTextureRequest,
  pintaTextureAttachments,
  readPintaTextureAttachment,
  readPintaTextureRequest,
} from './pintaRegionProtocol'
import { RAYLIB_LIMITS, RAYLIB_OP, RAYLIB_OP_ARITY } from './raylib/protocol'

const png = new Uint8Array(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a/1sAAAAASUVORK5CYII=',
    'base64',
  ),
)
const load = (entries: unknown) => JSON.stringify({ pintaLoad: entries })

test('Pinta texture requests carry only exact, bounded binary PNG attachments', () => {
  const raw = load([[1, 1, png.length]])
  expect(isPintaTextureRequest(raw)).toBe(true)
  expect(isPintaTextureRequest('{"w":1,"h":1,"keep":false}')).toBe(false)
  const bytes = new Uint8Array(png.length + 5)
  bytes.set(png, 2)
  const attachments = pintaTextureAttachments(raw, bytes.subarray(2, 2 + png.length), 1024)
  expect(attachments).toEqual([{ id: 0, bytes: png }])
  expect(attachments[0]?.bytes.buffer.byteLength).toBe(png.length)
  const request = readPintaTextureRequest(raw, 1024)
  if ('owner' in request) throw Error('Expected a texture load')
  expect(readPintaTextureAttachment(attachments, request)).toEqual(png)
  expect(() => pintaTextureAttachments(raw, bytes, 1024)).toThrow()
  expect(() => readPintaTextureAttachment([...attachments, ...attachments], request)).toThrow()
  expect(() => readPintaTextureAttachment([{ id: 1, bytes: png }], request)).toThrow()
})

test('regional admission rejects oversized tables, compressed bytes, and computed pixels', () => {
  for (const invalid of [
    [],
    [[0, 1, 59]],
    [[4097, 1, 59]],
    [[4096, 1025, 59]],
    [[4096, 1024, 59.5]],
    [[1, 1, 44]],
    [[1, 1, '59']],
    [
      [1, 1, 12 * 1024 * 1024],
      [1, 1, 59],
    ],
    Array.from({ length: 5 }, () => [4096, 1024, 59]),
    Array.from({ length: PGZERO_LIMITS.images + 1 }, () => [1, 1, 59]),
  ])
    expect(() => readPintaTextureRequest(load(invalid), PGZERO_LIMITS.images)).toThrow()
  expect(() =>
    readPintaTextureRequest(
      load(Array.from({ length: RAYLIB_LIMITS.textures + 1 }, () => [1, 1, 59])),
      RAYLIB_LIMITS.textures,
    ),
  ).toThrow()
  expect(() => readPintaTextureRequest('{"pintaLoad":[[1,1,60]],"path":"x.png"}', 1024)).toThrow()
  expect(() => readPintaTextureRequest('{"pintaLoad":[],"url":"a"}', 1024)).toThrow()
})

test('the renderer checks the actual PNG layout and shape before decode', () => {
  expect(() => checkPintaTexturePng(png, 1, 1)).not.toThrow()
  expect(() => checkPintaTexturePng(png, 2, 1)).toThrow()
  expect(() => checkPintaTexturePng(png.subarray(0, png.length - 1), 1, 1)).toThrow()
  const broken = png.slice()
  broken[0] = 0
  expect(() => checkPintaTexturePng(broken, 1, 1)).toThrow()
  for (const type of ['IHDR', 'acTL', 'fcTL', 'fdAT']) {
    const bytes = new Uint8Array(12 + png.length)
    bytes.set(png.subarray(0, 33))
    bytes.set(Buffer.from(type, 'ascii'), 37)
    bytes.set(png.subarray(33), 45)
    expect(() => checkPintaTexturePng(bytes, 1, 1)).toThrow()
  }
})

test('release uses a positive owner token and no binary attachment', () => {
  const raw = '{"pintaRelease":17}'
  expect(isPintaTextureRequest(raw)).toBe(true)
  expect(readPintaTextureRequest(raw, 1024)).toEqual({ owner: 17 })
  expect(pintaTextureAttachments(raw, new Uint8Array(), 1024)).toEqual([])
  expect(() => pintaTextureAttachments(raw, png, 1024)).toThrow()
  expect(() => checkPintaReleaseAttachments([{ id: 0, bytes: png }])).toThrow()
  for (const invalid of ['false', '0', '-2', '1.5', '9007199254740992', '"x"'])
    expect(() => readPintaTextureRequest(`{"pintaRelease":${invalid}}`, 1024)).toThrow()
})

test('affine records admit original crop pixels and finite matrices while refusing crop or alpha escapes', () => {
  const record = new Float64Array([1, 0, 1, 0, 2, 2, -4, 1, 2, 4, 14.25, 4.25, 0.5])
  const image = { width: 4, height: 2 }
  expect(() => checkPintaAffine(record, 0, image)).not.toThrow()
  for (const [index, value] of [
    [2, -1],
    [3, 0.1],
    [4, 4],
    [5, 0],
    [6, Number.NaN],
    [10, Infinity],
    [11, 1e90],
    [12, 1.1],
  ] as const) {
    const altered = record.slice()
    altered[index] = value
    expect(() => checkPintaAffine(altered, 0, image)).toThrow()
  }
})

test('engine opcodes remain unique and the texture records match the Python emitters', () => {
  for (const [ops, arity, python] of [
    [PGZERO_OP, PGZERO_OP_ARITY, './pgzero/py/pgzero/_sz.py'],
    [RAYLIB_OP, RAYLIB_OP_ARITY, './raylib/py/_szraylib/_rt.py'],
  ] as const) {
    const codes = Object.values(ops)
    expect(new Set<number>(codes).size).toBe(codes.length)
    expect(arity[ops.PINTA_AFFINE]).toBe(13)
    expect(arity[ops.PINTA_RELEASE]).toBe(1)
    const source = readFileSync(new URL(python, import.meta.url), 'utf8')
    expect(source).toContain(`OP_PINTA_AFFINE = ${ops.PINTA_AFFINE}\n`)
    expect(source).toContain(`OP_PINTA_RELEASE = ${ops.PINTA_RELEASE}\n`)
  }
})
