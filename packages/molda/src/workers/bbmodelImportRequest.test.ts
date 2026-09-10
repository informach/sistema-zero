import { expect, test } from 'bun:test'
import { BBMODEL_INPUT_LIMITS } from '../import/bbmodelInput'
import { type BbmodelImportRequest, readBbmodelImportRequest } from './bbmodelImportRequest'

function request(): BbmodelImportRequest {
  return {
    documentId: 'bb-target',
    revision: 4,
    requestId: 2,
    identity: { id: 'bb-target', name: 'Minha criação', createdAt: 1, updatedAt: 2 },
    entryPath: 'model.bbmodel',
    bytes: Uint8Array.of(1, 2, 3),
    files: [{ path: 'paint.png', bytes: Uint8Array.of(4, 5, 6) }],
    options: {
      sourcePreference: 'prefer-embedded',
      nodeMaterials: {
        untextured: 'uniform',
        color: [0.5, 0.25, 0.75, 1],
      },
    },
  }
}

test('bbmodel requests own exact byte ranges and nested options without parsing source content or detaching buffers', () => {
  const input = request(),
    backing = Buffer.from([99, ...input.bytes, 88])
  input.bytes = backing.subarray(1, backing.length - 1)
  const borrowed = readBbmodelImportRequest(input),
    snapshot = readBbmodelImportRequest(input, true)
  expect(borrowed.bytes).toBe(input.bytes)
  expect(borrowed.files[0]!.bytes).toBe(input.files[0]!.bytes)
  expect(snapshot.bytes).toEqual(Uint8Array.of(1, 2, 3))
  expect(snapshot.bytes.buffer.byteLength).toBe(3)
  expect(snapshot.bytes.buffer).not.toBe(input.bytes.buffer)
  expect(snapshot.files[0]!.bytes.buffer).not.toBe(input.files[0]!.bytes.buffer)
  expect(snapshot.options.nodeMaterials!.color).not.toBe(input.options.nodeMaterials!.color)
  input.bytes.fill(0)
  input.files[0]!.bytes.fill(0)
  input.options.nodeMaterials!.color![0] = 1
  input.identity.name = 'Outra criação'
  expect(snapshot.bytes).toEqual(Uint8Array.of(1, 2, 3))
  expect(snapshot.files[0]!.bytes).toEqual(Uint8Array.of(4, 5, 6))
  expect(snapshot.options.nodeMaterials!.color).toEqual([0.5, 0.25, 0.75, 1])
  expect(snapshot.identity.name).toBe('Minha criação')
  expect(backing.byteLength).toBe(5)
})

test('bbmodel request boundaries reject extra fields, invalid ownership, shared memory, paths and aggregate budgets', () => {
  const input = request(),
    max = new Uint8Array(BBMODEL_INPUT_LIMITS.fileBytes),
    invalid: unknown[] = [
      null,
      [],
      { ...input, extra: true },
      { ...input, documentId: '' },
      { ...input, revision: -1 },
      { ...input, requestId: 1.5 },
      { ...input, revision: Number.MAX_SAFE_INTEGER + 1 },
      { ...input, identity: { ...input.identity, id: 'different' } },
      { ...input, identity: { ...input.identity, thumb: 'old' } },
      { ...input, identity: { ...input.identity, updatedAt: Infinity } },
      { ...input, options: { ...input.options, extra: true } },
      { ...input, options: { ...input.options, surfaces: null } },
      { ...input, options: { ...input.options, sourcePreference: 'auto' } },
      { ...input, bytes: [] },
      { ...input, bytes: new Uint8Array() },
      { ...input, bytes: new Uint8Array(new SharedArrayBuffer(2)) },
      { ...input, files: [{ path: 'a', bytes: new Uint8Array(new SharedArrayBuffer(1)) }] },
      { ...input, files: [{ path: 'a', bytes: max, extra: true }] },
      {
        ...input,
        files: [
          { path: 'a', bytes: max },
          { path: './a', bytes: max },
        ],
      },
      { ...input, files: [{ path: input.entryPath, bytes: max }] },
      { ...input, entryPath: '../model.bbmodel' },
      { ...input, entryPath: 'https:model.bbmodel' },
      { ...input, bytes: new Uint8Array(BBMODEL_INPUT_LIMITS.fileBytes + 1) },
      {
        ...input,
        files: [
          { path: 'a', bytes: max },
          { path: 'b', bytes: max },
        ],
      },
      { ...input, files: Array(BBMODEL_INPUT_LIMITS.resources + 1).fill(null) },
    ]
  for (const row of invalid) expect(() => readBbmodelImportRequest(row, true)).toThrow()
})

test('bbmodel empty entry and invalid nested choices fail before reading companion bytes for a snapshot', () => {
  const empty = { ...request(), bytes: new Uint8Array() }
  Object.defineProperty(empty, 'files', {
    get() {
      throw new Error('Companions must not be read')
    },
  })
  expect(() => readBbmodelImportRequest(empty, true)).toThrow(
    'Escolha um arquivo com bytes, não vazio.',
  )
  const input = request()
  Object.defineProperty(input.files[0]!, 'bytes', {
    get() {
      throw new Error('No file read yet')
    },
  })
  expect(() =>
    readBbmodelImportRequest(
      {
        ...input,
        options: { ...input.options, images: { rgba16: 'auto' } },
      },
      true,
    ),
  ).toThrow('Escolha se permite converter os canais de 16 para 8 bits.')
})

test('bbmodel request count and total-byte limits accept their exact boundaries and count aliased files independently', () => {
  const input = request(),
    max = new Uint8Array(BBMODEL_INPUT_LIMITS.fileBytes)
  input.files = [
    { path: 'a', bytes: max },
    { path: 'b', bytes: max.subarray(input.bytes.byteLength) },
  ]
  expect(readBbmodelImportRequest(input).files).toHaveLength(2)
  input.files = Array.from({ length: BBMODEL_INPUT_LIMITS.resources }, (_, i) => ({
    path: `file_${i}`,
    bytes: Uint8Array.of(i % 255),
  }))
  expect(readBbmodelImportRequest(input).files).toHaveLength(BBMODEL_INPUT_LIMITS.resources)
})
