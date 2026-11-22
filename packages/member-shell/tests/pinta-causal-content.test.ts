import { expect, mock, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { crc32, gzipSync } from 'node:zlib'
import { assetToJson, createAsset } from '@sistemazero/pinta/assets'

mock.module('server-only', () => ({}))

const { readPintaCausalBlob, PintaCausalUnverifiedContent } = await import(
  '../src/server/pinta-causal-content'
)
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
const sheet = createAsset({ kind: 'tileset', name: 'folha', tileSize: 16 })
const text = assetToJson(sheet)
const gzip = gzipSync(text)
const identity = { itemId: sheet.id, kind: sheet.kind, formatVersion: 6 }

function blob(bytes: Buffer, overrides: { mime?: string; length?: number; step?: number } = {}) {
  let read = 0
  let canceled = false
  const step = overrides.step ?? 7
  return {
    body: new ReadableStream<Uint8Array>({
      pull(controller) {
        if (read >= bytes.length) controller.close()
        else {
          controller.enqueue(bytes.subarray(read, read + step))
          read += step
        }
      },
      cancel() {
        canceled = true
      },
    }),
    contentType: overrides.mime ?? 'application/gzip',
    contentLength: overrides.length ?? bytes.length,
    canceled: () => canceled,
  }
}

test('the manifest and seal retain and hash the exact stored gzip chunks', async () => {
  const verified = await readPintaCausalBlob(blob(gzip), {
    ...identity,
    bytes: gzip.length,
    sha256: sha(gzip),
  })
  expect(verified.manifest).toMatchObject({ itemId: sheet.id, sheet: { count: 1, tileSize: 16 } })
  expect(verified.gzip).toEqual(gzip)
  expect(verified.sha256).toBe(sha(gzip))
})

test('the reader rejects changed bytes, excess bytes, short reads and wrong content type', async () => {
  const expected = { ...identity, bytes: gzip.length, sha256: sha(gzip) }
  const changed = Buffer.from(gzip)
  changed[changed.length - 2] = 222
  for (const untrusted of [
    blob(changed),
    blob(Buffer.concat([gzip, gzip]), { length: gzip.length }),
    blob(gzip.subarray(0, -1), { length: gzip.length }),
    blob(gzip, { mime: 'text/html' }),
  ])
    await expect(readPintaCausalBlob(untrusted, expected)).rejects.toBeInstanceOf(
      PintaCausalUnverifiedContent,
    )
})

test('correctly hashed content may still be invalid gzip, UTF-8, schema or over budget', async () => {
  const future = text.replace(/"version": 1/, '"version": 99')
  const malformedUtf8 = Buffer.from(text)
  malformedUtf8[4] = 255
  for (const input of [
    Buffer.from('not gzip'),
    gzipSync(malformedUtf8),
    gzipSync(future),
    gzipSync(Buffer.alloc(32 * 1024 * 1024 + 1, 32)),
  ])
    await expect(
      readPintaCausalBlob(blob(input, { step: 1024 }), {
        ...identity,
        bytes: input.length,
        sha256: sha(input),
      }),
    ).rejects.toBeInstanceOf(PintaCausalUnverifiedContent)
})

test('accepts a single browser-readable gzip and refuses extra members or trailing bytes', async () => {
  const named = Buffer.from(gzip.subarray(0, 10))
  named[3] = 10 // original file name and header CRC
  const header = Buffer.concat([named, Buffer.from('folha.pinta.json\0')])
  const checksum = Buffer.alloc(2)
  checksum.writeUInt16LE(crc32(header) & 0xffff)
  const oneMember = Buffer.concat([header, checksum, gzip.subarray(10)])
  expect(
    (
      await readPintaCausalBlob(blob(oneMember), {
        ...identity,
        bytes: oneMember.length,
        sha256: sha(oneMember),
      })
    ).manifest.itemId,
  ).toBe(sheet.id)

  const twoMembers = Buffer.concat([gzip, gzipSync(' ')])
  const trailing = Buffer.concat([gzip, Buffer.alloc(1)])
  for (const input of [twoMembers, trailing])
    await expect(
      readPintaCausalBlob(blob(input), {
        ...identity,
        bytes: input.length,
        sha256: sha(input),
      }),
    ).rejects.toBeInstanceOf(PintaCausalUnverifiedContent)
})

test('pre-abort cancels the blob body and never reports an invalid native document', async () => {
  const source = blob(gzip)
  const reason = new Error('canceled')
  await expect(
    readPintaCausalBlob(source, { ...identity, bytes: gzip.length }, AbortSignal.abort(reason)),
  ).rejects.toBe(reason)
  expect(source.canceled()).toBe(true)
})
