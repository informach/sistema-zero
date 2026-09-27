import { expect, test } from 'bun:test'
import { decodeBbmodelImageDataUri, inspectBbmodelImageDataUri } from './bbmodelImageDataUri'
import { BBMODEL_INPUT_LIMITS, BbmodelInputError } from './bbmodelInput'
import {
  type ImportDataUriPolicy,
  inspectImportDataPayload,
  inspectRasterDataUri,
} from './importDataUri'

function failure(read: () => unknown, reason: BbmodelInputError['reason']) {
  let error: unknown
  try {
    read()
  } catch (caught) {
    error = caught
  }
  expect(error).toBeInstanceOf(BbmodelInputError)
  expect((error as BbmodelInputError).reason).toBe(reason)
  expect((error as BbmodelInputError).path).toBe('source')
}

test('decodes all octets independently from UTF-8 and owns exact output buffers', () => {
  const bytes = Uint8Array.from({ length: 256 }, (_, i) => i)
  const payloads = [
    `,${Array.from(bytes, (value) => `%${value.toString(16).padStart(2, '0')}`).join('')}`,
    `;base64,${Buffer.from(bytes).toString('base64')}`,
    `;base64,${encodeURIComponent(Buffer.from(bytes).toString('base64'))}`,
  ]
  for (const payload of payloads) {
    const inspected = inspectBbmodelImageDataUri(`DATA:IMAGE/PNG${payload}`, 'source')
    expect(inspected.mimeType).toBe('image/png')
    expect(inspected.data.byteLength).toBe(256)
    const decoded = decodeBbmodelImageDataUri(inspected.data, 'source')
    expect(decoded).toEqual(bytes)
    expect(decoded.byteOffset).toBe(0)
    expect(decoded.buffer.byteLength).toBe(256)
    decoded[0] = 99
    expect(decodeBbmodelImageDataUri(inspected.data, 'source')[0]).toBe(0)
  }
  const literal = "Aa09-_.!~*'();/?:@&=+$,"
  const inspected = inspectBbmodelImageDataUri(`data:image/jpeg,${literal}`, 'source')
  expect(inspected.mimeType).toBe('image/jpeg')
  expect(decodeBbmodelImageDataUri(inspected.data, 'source')).toEqual(
    new TextEncoder().encode(literal),
  )
})

test('MIME inspection is not a raster decoder and permits empty or non-image bytes for the header stage', () => {
  for (const uri of ['data:image/png,', 'data:image/jpeg;base64,']) {
    const inspected = inspectBbmodelImageDataUri(uri, 'source')
    expect(inspected.data.byteLength).toBe(0)
    expect(decodeBbmodelImageDataUri(inspected.data, 'source')).toEqual(new Uint8Array(0))
  }
  expect(
    decodeBbmodelImageDataUri(
      inspectBbmodelImageDataUri('data:image/png,hello', 'source').data,
      'source',
    ),
  ).toEqual(new TextEncoder().encode('hello'))
})

test('does not execute or guess other MIME types, URI parameters or network paths', () => {
  for (const uri of [
    'https://example.test/a.png',
    'file:a.png',
    'javascript:never()',
    'data:text/html,%3Cscript%3E',
    'data:image/svg+xml,',
    'data:image/webp,',
    'data:image/jpg,',
    'data:image/png;charset=utf-8,',
    'data:image/png;base64;name=a.png,',
    ' data:image/png,',
  ])
    failure(() => inspectBbmodelImageDataUri(uri, 'source'), 'unsupported')
})

test('rejects malformed base64, escaped octets, whitespace and unescaped non-ASCII', () => {
  for (const payload of [
    'A',
    'AAA',
    'A===',
    '=AAA',
    'AAAA\n',
    'AA A',
    'AA-_',
    'AA%GG',
    'AA%C3',
    '====',
  ])
    failure(
      () => inspectBbmodelImageDataUri(`data:image/png;base64,${payload}`, 'source'),
      'invalid',
    )
  for (const payload of ['%', '%0', '%GG', '%0g', ' ', '\n', 'é', '\u0000', '#', '[', ']'])
    failure(() => inspectBbmodelImageDataUri(`data:image/png,${payload}`, 'source'), 'invalid')
})

test('bounds URI text before payload processing and lets each adapter enforce decoded-byte budgets', () => {
  failure(
    () =>
      inspectBbmodelImageDataUri(
        `data:image/png,${'A'.repeat(BBMODEL_INPUT_LIMITS.fileBytes)}`,
        'source',
      ),
    'budget',
  )
  const policy: ImportDataUriPolicy = {
    fileBytes: 32,
    byteBudget(length, path) {
      if (length > 4) throw new BbmodelInputError('budget', path, 'budget')
    },
    error: (reason, path, message) => new BbmodelInputError(reason, path, message),
  }
  expect(inspectImportDataPayload('%00%01%02%03', 'percent', 'source', policy).byteLength).toBe(4)
  expect(inspectImportDataPayload('AAECAw==', 'base64', 'source', policy).byteLength).toBe(4)
  failure(() => inspectImportDataPayload('AAAAA', 'percent', 'source', policy), 'budget')
  failure(() => inspectImportDataPayload('AAECAwQ=', 'base64', 'source', policy), 'budget')
  failure(() => inspectRasterDataUri('x'.repeat(33), 'source', policy), 'budget')
})
