import { expect, test } from 'bun:test'
import { readBbmodelEnvelope } from './bbmodelEnvelope'
import { BBMODEL_INPUT_LIMITS, BbmodelInputError } from './bbmodelInput'

const encode = (text: string) => new TextEncoder().encode(text)
const minimal = '{"meta":{"format_version":"5.0","model_format":"free"}}'
const bytesFor = (value: unknown) => encode(JSON.stringify(value))

function failure(bytes: Uint8Array, reason: BbmodelInputError['reason'], path: string) {
  let error: unknown
  try {
    readBbmodelEnvelope(bytes)
  } catch (caught) {
    error = caught
  }
  expect(error).toBeInstanceOf(BbmodelInputError)
  expect((error as BbmodelInputError).reason).toBe(reason)
  expect((error as BbmodelInputError).path).toBe(path)
}

test('distinguishes the three published format revisions without rewriting hierarchy, paths or expressions', () => {
  // Hand-authored format fixtures, not output of the production reader or a Blockbench runtime.
  for (const version of ['4.9', '4.10', '5.0'] as const) {
    const source = {
      meta: { format_version: version, model_format: 'free', box_uv: false },
      name: 'Braço 雪 🚀',
      resolution: { width: 16, height: 16 },
      elements: [{ uuid: 'piece', type: 'cube', from: [-2, 0, 0], to: [2, 8, 2] }],
      ...(version === '5.0' ? { groups: [{ uuid: 'group', origin: [0, 2, 0] }] } : {}),
      outliner: [
        {
          uuid: 'group',
          ...(version === '5.0' ? {} : { origin: [0, 2, 0] }),
          children: ['piece'],
        },
      ],
      textures: [{ relative_path: '../color.png', uv_width: 32, uv_height: 16 }],
      animations: [
        {
          animators: {
            group: {
              keyframes: [
                {
                  channel: 'rotation',
                  time: 0,
                  data_points: [{ x: '-10', y: 'query.life_time', z: '0' }],
                },
              ],
            },
          },
        },
      ],
    }
    const input = bytesFor(source)
    const before = input.slice()
    const result = readBbmodelEnvelope(input)
    expect(result.format).toBe('bbmodel')
    expect(result.version).toBe(version)
    expect(result.modelFormat).toBe('free')
    expect(result.json).toEqual(source)
    expect(input).toEqual(before)
    expect(result.json).not.toBe(source)
  }
})

test('separates malformed versions from unsupported revisions and never infers missing format metadata', () => {
  const input = (version: unknown) =>
    bytesFor({ meta: { format_version: version, model_format: 'free' } })
  for (const version of [
    undefined,
    null,
    true,
    4.9,
    '5',
    '5.',
    '5.a',
    'v5.0',
    '+5.0',
    '5e0.0',
    '5.0.0.0',
    '5.0\n',
    '5.0\r',
    '5.0\u2028',
    '5.0\u2029',
    '5.0 ',
    ' 5.0',
  ])
    failure(input(version), 'invalid', 'meta.format_version')
  for (const version of [
    '4.8',
    '4.11',
    '5.1',
    '6.0',
    '4.9.0',
    '5.0.1',
    '04.09',
    `5.${'9'.repeat(5000)}`,
  ])
    failure(input(version), 'unsupported', 'meta.format_version')
  for (const source of [{}, { meta: null }, { meta: [] }, { meta: true }])
    failure(bytesFor(source), 'invalid', 'meta')
  failure(
    bytesFor({ meta: { format: '4.9', model_format: 'free' } }),
    'invalid',
    'meta.format_version',
  )
  for (const modelFormat of [undefined, null, false, 1, '', {}])
    failure(
      bytesFor({ meta: { format_version: '5.0', model_format: modelFormat } }),
      'invalid',
      'meta.model_format',
    )
  const format = 'p'.repeat(BBMODEL_INPUT_LIMITS.formatNameChars)
  expect(
    readBbmodelEnvelope(bytesFor({ meta: { format_version: '5.0', model_format: format } }))
      .modelFormat,
  ).toBe(format)
  failure(
    bytesFor({ meta: { format_version: '5.0', model_format: `${format}p` } }),
    'budget',
    'meta.model_format',
  )
})

test('keeps plugin ids, scripts, URLs, prototype-like keys and editor state as owned inert JSON', () => {
  const raw =
    '{"meta":{"format_version":"5.0","model_format":"plugin:unknown"},"textures":[{"path":"C:\\\\private.png","source":"https://example.invalid/no-fetch"}],"editor_state":{"save_path":"do-not-write.bbmodel"},"unknown":{"__proto__":{"polluted":true},"constructor":"data","script":"throw new Error()","molang":"query.life_time + 1","number":1e400}}'
  const result = readBbmodelEnvelope(encode(raw))
  expect(result.modelFormat).toBe('plugin:unknown')
  expect(result.json).toEqual(JSON.parse(raw))
  const unknown = result.json.unknown as Record<string, unknown>
  expect(Object.hasOwn(unknown, '__proto__')).toBe(true)
  expect(Object.getPrototypeOf(unknown)).toBe(Object.prototype)
  expect(Object.hasOwn(Object.prototype, 'polluted')).toBe(false)
  // Envelope preserves JSON.parse's numeric semantics; numeric model fields need later readers.
  expect(unknown.number).toBe(Infinity)
  unknown.script = 'changed in the result only'
  expect(readBbmodelEnvelope(encode(raw)).json).toEqual(JSON.parse(raw))
})

test('uses fatal UTF-8, BOM and JSON grammar; recognizes but never decompresses the lz container', () => {
  const text =
    '\ufeff{"meta":{"format_version":"4.9","format_version":"5.0","model_format":"free"},"name":"雪 🚀","escaped":"\\"\\\\[]{}:,"}'
  expect(readBbmodelEnvelope(encode(text)).json).toEqual(JSON.parse(text.slice(1)))
  for (const raw of [
    'null',
    '[]',
    'true',
    `${minimal}x`,
    `${minimal}\0`,
    minimal.replace('}}', ',}}'),
    '{',
  ])
    failure(encode(raw), 'invalid', 'json')
  failure(new Uint8Array(), 'invalid', 'file')
  failure(new Uint8Array([0xff, 0xfe, 123, 0, 125, 0]), 'invalid', 'json')
  const malformed = encode(minimal)
  malformed[3] = 0xff
  failure(malformed, 'invalid', 'json')
  for (const prefix of ['', '\ufeff', ' \t\r\n', '\ufeff \t'])
    failure(encode(`${prefix}<lz>not-decoded`), 'unsupported', 'file')
  expect(readBbmodelEnvelope(encode(minimal.replace('}}', '},"note":"<lz>data"}'))).format).toBe(
    'bbmodel',
  )
})

test('respects Buffer subranges and detached/shared input; retains no source byte storage', () => {
  const source = encode(minimal)
  for (const storage of [new Uint8Array(source.length + 20), Buffer.alloc(source.length + 20)]) {
    storage.fill(0xff)
    storage.set(source, 7)
    const input = storage.subarray(7, 7 + source.length)
    const parsed = readBbmodelEnvelope(input)
    expect(input).toEqual(source)
    input.fill(0)
    expect(parsed.json).toEqual(JSON.parse(minimal))
    expect(storage[0]).toBe(0xff)
  }
  failure(new Uint8Array(new SharedArrayBuffer(8)), 'unsupported', 'file')
  const detached = new Uint8Array(source)
  structuredClone(detached.buffer, { transfer: [detached.buffer] })
  failure(detached, 'invalid', 'file')
})

test('bounds bytes, depth and structural allocations before decoding or parsing', () => {
  failure(new Uint8Array(BBMODEL_INPUT_LIMITS.fileBytes + 1), 'budget', 'file')
  const padded = new Uint8Array(BBMODEL_INPUT_LIMITS.fileBytes).fill(0x20)
  // Also exercises the whitespace signature scan over a maximal file without per-byte allocations.
  padded.set(encode(minimal), padded.length - minimal.length)
  expect(readBbmodelEnvelope(padded).version).toBe('5.0')
  const nested = (count: number) =>
    encode(`${minimal.slice(0, -1)},"extra":${'['.repeat(count)}0${']'.repeat(count)}}`)
  expect(readBbmodelEnvelope(nested(BBMODEL_INPUT_LIMITS.jsonDepth - 1)).format).toBe('bbmodel')
  failure(nested(BBMODEL_INPUT_LIMITS.jsonDepth), 'budget', 'json')
  // Fixed prefix contains nine structural tokens: root/meta, four colons, two commas, array.
  const large = (count: number) =>
    encode(`${minimal.slice(0, -1)},"extra":[${'0,'.repeat(count)}0]}`)
  expect(
    (readBbmodelEnvelope(large(BBMODEL_INPUT_LIMITS.jsonStructure - 9)).json.extra as unknown[])
      .length,
  ).toBe(BBMODEL_INPUT_LIMITS.jsonStructure - 8)
  failure(large(BBMODEL_INPUT_LIMITS.jsonStructure - 8), 'budget', 'json')
  failure(encode('['.repeat(BBMODEL_INPUT_LIMITS.jsonDepth + 1)), 'budget', 'json')
  failure(encode(','.repeat(BBMODEL_INPUT_LIMITS.jsonStructure + 1)), 'budget', 'json')
  expect(
    readBbmodelEnvelope(
      bytesFor({
        meta: { format_version: '5.0', model_format: 'free' },
        extra: '\\"[]{}:,'.repeat(200000),
      }),
    ).version,
  ).toBe('5.0')
})
