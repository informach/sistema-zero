import { expect, test } from 'bun:test'
import { readBbmodelAppearance } from './bbmodelAppearance'
import { readBbmodelEnvelope } from './bbmodelEnvelope'
import { BBMODEL_INPUT_LIMITS, BbmodelInputError } from './bbmodelInput'
import { type BbmodelResourceRequest, readBbmodelResources } from './bbmodelResources'

function request(
  textures: Record<string, unknown>[],
  overrides: Partial<BbmodelResourceRequest> = {},
): BbmodelResourceRequest {
  const bytes = new TextEncoder().encode(
    JSON.stringify({ meta: { format_version: '5.0', model_format: 'free' }, textures }),
  )
  return {
    bytes,
    entryPath: 'model.bbmodel',
    version: '5.0',
    appearance: readBbmodelAppearance(readBbmodelEnvelope(bytes)),
    textureIndices: textures.map((_, i) => i),
    files: [],
    sourcePreference: 'prefer-embedded',
    ...overrides,
  }
}
function failure(input: BbmodelResourceRequest, reason: BbmodelInputError['reason'], path: string) {
  let error: unknown
  try {
    readBbmodelResources(input)
  } catch (caught) {
    error = caught
  }
  expect(error).toBeInstanceOf(BbmodelInputError)
  expect((error as BbmodelInputError).reason).toBe(reason)
  expect((error as BbmodelInputError).path).toBe(path)
}

test('does not confuse an invalid embedded URI with a previously selected local resource key', () => {
  failure(
    request(
      [
        { uuid: 'file', relative_path: 'texture.png' },
        { uuid: 'embedded', source: 'file:texture.png' },
      ],
      { files: [{ path: 'texture.png', bytes: new Uint8Array([1, 2, 3]) }] },
    ),
    'unsupported',
    'textures[1].source',
  )
})

test('does not request the entry file as its own image companion', () => {
  failure(
    request([{ uuid: 'self', relative_path: 'model.bbmodel' }]),
    'invalid',
    'textures[0].relative_path',
  )
})

test('source preference is explicit and only falls back when the preferred field is absent', () => {
  const textures = [
    {
      uuid: 'both',
      source: 'data:image/png,%01%02',
      relative_path: 'local.png',
      path: 'C:\\private\\local.png',
    },
  ]
  const input = request(textures, { files: [{ path: 'local.png', bytes: new Uint8Array([9]) }] })
  for (const sourcePreference of ['prefer-embedded', 'prefer-files'] as const) {
    const result = readBbmodelResources({ ...input, sourcePreference })
    expect(result.status).toBe('ready')
    if (result.status !== 'ready') throw new Error('Expected ready resources')
    const embedded = sourcePreference === 'prefer-embedded'
    expect(result.resources).toEqual([
      {
        path: embedded ? null : 'local.png',
        mimeType: embedded ? 'image/png' : null,
        bytes: new Uint8Array(embedded ? [1, 2] : [9]),
      },
    ])
    expect(result.textures).toEqual([
      {
        texture: 0,
        resource: 0,
        source: embedded ? 'embedded' : 'file',
        alternateAvailable: true,
        pathFieldIgnored: true,
      },
    ])
    expect(result.resourceBytes).toBe(embedded ? 2 : 1)
  }
  for (const sourcePreference of ['prefer-embedded', 'prefer-files'] as const) {
    const result = readBbmodelResources(
      request(
        [
          { uuid: 'only-file', source: '', relative_path: 'local.png' },
          { uuid: 'only-embedded', source: 'data:image/jpeg,%07', relative_path: '' },
        ],
        { files: input.files, sourcePreference },
      ),
    )
    expect(result.status).toBe('ready')
    if (result.status !== 'ready') throw new Error('Expected ready resources')
    expect(result.textures.map((texture) => [texture.source, texture.alternateAvailable])).toEqual([
      ['file', false],
      ['embedded', false],
    ])
  }
  failure(
    { ...input, sourcePreference: 'auto' as BbmodelResourceRequest['sourcePreference'] },
    'invalid',
    'options.sourcePreference',
  )
})

test('a chosen malformed or missing source never silently switches to the alternate', () => {
  const invalidEmbedded = request(
    [{ uuid: 't', source: 'https://example.test/image.png', relative_path: 'ok.png' }],
    { files: [{ path: 'ok.png', bytes: new Uint8Array([1]) }] },
  )
  failure(invalidEmbedded, 'unsupported', 'textures[0].source')
  expect(
    readBbmodelResources({ ...invalidEmbedded, sourcePreference: 'prefer-files' }).status,
  ).toBe('ready')
  const missingLocal = request(
    [{ uuid: 't', source: 'data:image/png,%01', relative_path: 'missing.png' }],
    { sourcePreference: 'prefer-files' },
  )
  expect(readBbmodelResources(missingLocal)).toEqual({ status: 'missing', paths: ['missing.png'] })
  expect(
    readBbmodelResources({ ...missingLocal, sourcePreference: 'prefer-embedded' }).status,
  ).toBe('ready')
  failure(
    request([{ uuid: 'absolute-only', path: 'C:/private/image.png' }]),
    'unsupported',
    'textures[0]',
  )
  failure(request([{ uuid: 'empty' }]), 'unsupported', 'textures[0]')
  failure(
    request(
      [{ uuid: 'bad-path', source: 'data:image/png,', relative_path: '/private/image.png' }],
      { sourcePreference: 'prefer-files' },
    ),
    'unsupported',
    'textures[0].relative_path',
  )
})

test('deduplicates exact URI and normalized literal file independently, preserving first requested order', () => {
  const backing = Buffer.from([90, 7, 8, 91])
  const local = backing.subarray(1, 3)
  const input = request(
    [
      { uuid: 'a', source: 'data:image/png,%07%08' },
      { uuid: 'b', relative_path: './same.png' },
      { uuid: 'c', source: 'data:image/png,%07%08' },
      { uuid: 'd', relative_path: 'same.png' },
      { uuid: 'e', relative_path: 'other.png' },
    ],
    {
      textureIndices: [3, 2, 1, 0, 3, 4],
      files: [
        { path: 'same.png', bytes: local },
        { path: 'other.png', bytes: local },
      ],
    },
  )
  const result = readBbmodelResources(input)
  if (result.status !== 'ready') throw new Error('Expected ready resources')
  expect(result.textures.map(({ texture, resource }) => [texture, resource])).toEqual([
    [3, 0],
    [2, 1],
    [1, 0],
    [0, 1],
    [4, 2],
  ])
  expect(result.resourceBytes).toBe(6)
  expect(result.resources.map(({ bytes }) => Array.from(bytes))).toEqual([
    [7, 8],
    [7, 8],
    [7, 8],
  ])
  for (const resource of result.resources) {
    expect(resource.bytes.buffer === backing.buffer).toBe(false)
    expect(resource.bytes.constructor).toBe(Uint8Array)
    expect(resource.bytes.byteOffset).toBe(0)
    expect(resource.bytes.buffer.byteLength).toBe(2)
  }
  result.resources[0]!.bytes[0] = 22
  expect(backing).toEqual(Buffer.from([90, 7, 8, 91]))
  expect(result.resources[1]!.bytes[0]).toBe(7)
  expect(result.resources[2]!.bytes[0]).toBe(7)
  expect(input.textureIndices).toEqual([3, 2, 1, 0, 3, 4])
})

test('uses version-specific relative bases, keeps percent/case literal, and returns all unique missing paths without partial data', () => {
  for (const version of ['4.9', '4.10', '5.0'] as const) {
    const result = readBbmodelResources(
      request(
        [
          { uuid: 'a', relative_path: '..\\Color%20.png' },
          { uuid: 'b', relative_path: '../Color%20.png' },
          { uuid: 'ready', source: 'data:image/png,%01' },
          { uuid: 'c', relative_path: '../color%20.png' },
        ],
        {
          version,
          entryPath: 'folder/model.bbmodel',
          files: [{ path: 'Color .png', bytes: new Uint8Array([1]) }],
        },
      ),
    )
    const base = version === '4.9' ? 'folder/' : ''
    expect(result).toEqual({
      status: 'missing',
      paths: [`${base}Color%20.png`, `${base}color%20.png`],
    })
  }
  const input = request([
    { uuid: 'missing', relative_path: 'missing.png' },
    { uuid: 'invalid', source: 'data:image/png,%GG' },
  ])
  failure(input, 'invalid', 'textures[1].source')
  expect(readBbmodelResources({ ...input, textureIndices: [0] })).toEqual({
    status: 'missing',
    paths: ['missing.png'],
  })
})

test('does not load unselected textures but preflights every selected file and every index', () => {
  const input = request([{ uuid: 'not-used', source: 'javascript:never()' }], {
    textureIndices: [],
  })
  expect(readBbmodelResources(input)).toEqual({
    status: 'ready',
    textures: [],
    resources: [],
    resourceBytes: 0,
  })
  const file = { path: 'unused.png', bytes: new Uint8Array([1]) }
  failure({ ...input, files: [file, { ...file, path: './unused.png' }] }, 'invalid', 'files')
  failure({ ...input, files: [{ ...file, path: 'model.bbmodel' }] }, 'invalid', 'files')
  failure({ ...input, files: new Array(1) }, 'invalid', 'files')
  failure(
    { ...input, files: [{ ...file, bytes: new Uint8Array(new SharedArrayBuffer(1)) }] },
    'unsupported',
    'unused.png',
  )
  failure(
    { ...input, files: [{ ...file, bytes: new Uint8Array(BBMODEL_INPUT_LIMITS.fileBytes + 1) }] },
    'budget',
    'unused.png',
  )
  failure({ ...input, bytes: new Uint8Array(0) }, 'invalid', 'file')
  failure({ ...input, bytes: new Uint8Array(new SharedArrayBuffer(1)) }, 'unsupported', 'file')
  for (const textureIndices of [
    [-1],
    [1],
    [0.5],
    [Number.MAX_SAFE_INTEGER],
    [NaN],
    new Array<number>(1),
  ])
    failure({ ...input, textureIndices }, 'invalid', 'textures')
  failure(
    { ...input, textureIndices: new Array(BBMODEL_INPUT_LIMITS.textures + 1) },
    'budget',
    'textures',
  )
  expect(
    readBbmodelResources({
      ...input,
      textureIndices: new Array<number>(BBMODEL_INPUT_LIMITS.textures).fill(0),
      appearance: request([{ uuid: 't', source: 'data:image/png,' }]).appearance,
    }).status,
  ).toBe('ready')
})

test('applies exact resource and selected-file count budgets before materialization', () => {
  const textures = Array.from({ length: BBMODEL_INPUT_LIMITS.resources + 1 }, (_, i) => ({
    uuid: `t${i}`,
    relative_path: `${i}.png`,
  }))
  const files = textures
    .slice(0, -1)
    .map((_, i) => ({ path: `${i}.png`, bytes: new Uint8Array(0) }))
  const input = request(textures, { textureIndices: files.map((_, i) => i), files })
  const result = readBbmodelResources(input)
  if (result.status !== 'ready') throw new Error('Expected ready resources')
  expect(result.resources.length).toBe(BBMODEL_INPUT_LIMITS.resources)
  expect(result.resourceBytes).toBe(0)
  failure({ ...input, textureIndices: textures.map((_, i) => i) }, 'budget', 'resources')
  failure(
    { ...input, files: [...files, { path: 'extra.png', bytes: new Uint8Array(0) }] },
    'budget',
    'files',
  )
})

test('bounds encoded resources separately from all selected bytes, including unused files', () => {
  const max = BBMODEL_INPUT_LIMITS.fileBytes
  const bytes = new Uint8Array(max)
  const input = request(
    [
      { uuid: 'file', relative_path: 'large.png' },
      { uuid: 'uri', source: 'data:image/png,%01' },
    ],
    { textureIndices: [0], files: [{ path: 'large.png', bytes }] },
  )
  const result = readBbmodelResources(input)
  if (result.status !== 'ready') throw new Error('Expected ready resources')
  expect(result.resourceBytes).toBe(max)
  expect(result.resources[0]!.bytes.byteLength).toBe(max)
  expect(result.resources[0]!.bytes.buffer === bytes.buffer).toBe(false)
  failure({ ...input, textureIndices: [0, 1] }, 'budget', 'resources')
  const remaining = BBMODEL_INPUT_LIMITS.selectedFileBytes - max - input.bytes.byteLength
  const selected = {
    ...input,
    textureIndices: [],
    files: [...input.files, { path: 'unused.png', bytes: new Uint8Array(remaining) }],
  }
  expect(readBbmodelResources(selected)).toEqual({
    status: 'ready',
    textures: [],
    resources: [],
    resourceBytes: 0,
  })
  failure(
    {
      ...selected,
      files: [...selected.files, { path: 'one-more.png', bytes: new Uint8Array([0]) }],
    },
    'budget',
    'files',
  )
})
