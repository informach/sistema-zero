import { expect, test } from 'bun:test'
import { createHash, randomUUID } from 'node:crypto'
import {
  UPLOAD_PART_BYTES,
  type UploadedPart,
  type UploadStart,
  type UploadView,
} from '@sistemazero/marketing-contracts'
import { z } from 'zod'
import { hashUpload, storageUploadUrl, transferBrowserFile } from './browser-upload'
import type { WorkbenchPort } from './port'

test('multipart web retoma sem repetir parte confirmada e confere SHA em blocos', async () => {
  const bytes = Buffer.alloc(UPLOAD_PART_BYTES + 913, 37),
    file = new Blob([bytes]),
    signal = new AbortController().signal
  const progress: string[] = []
  expect(await hashUpload(file, signal, (message) => progress.push(message))).toBe(
    createHash('sha256').update(bytes).digest('hex'),
  )
  expect(progress.length).toBe(2)
  const input: UploadStart = {
    operationId: randomUUID(),
    manifest: {
      schemaVersion: 1,
      id: randomUUID(),
      projectId: randomUUID(),
      name: 'video.mp4',
      size: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      mime: 'video/mp4',
      role: 'original',
      sourceAssetId: null,
      width: null,
      height: null,
      durationMs: null,
      codec: null,
      rotation: null,
    },
  }
  const parts: UploadedPart[] = [],
    sent: number[] = [],
    bodies: unknown[] = []
  let failed = false,
    completed = 0
  const view = (): UploadView => ({
    manifest: input.manifest,
    parts: [...parts],
    state: 'uploading',
    error: null,
    bytesReceived: false,
    partBytes: UPLOAD_PART_BYTES,
  })
  const request: WorkbenchPort['request'] = async (path, _method, body) => {
    if (path === '/assets') {
      bodies.push(body)
      return view()
    }
    if (path.endsWith('/complete')) {
      completed++
      return { ...view(), state: 'verifying', bytesReceived: true }
    }
    const part = z.object({ number: z.number(), md5: z.string() }).parse(body),
      size = Math.min(UPLOAD_PART_BYTES, bytes.length - (part.number - 1) * UPLOAD_PART_BYTES)
    return {
      url: `https://${'a'.repeat(32)}.r2.cloudflarestorage.com/${part.number}`,
      size,
      headers: { 'content-md5': part.md5, 'content-length': String(size) },
    }
  }
  const send = async (url: string, part: Uint8Array<ArrayBuffer>, md5: string) => {
    const number = Number(new URL(url).pathname.slice(1))
    expect(md5).toBe(createHash('md5').update(part).digest('base64'))
    if (number === 2 && !failed) {
      failed = true
      throw new Error('Rede caiu')
    }
    sent.push(number)
    parts.push({ number, size: part.length, etag: createHash('md5').update(part).digest('hex') })
  }
  await expect(transferBrowserFile(file, input, request, signal, () => {}, send)).rejects.toThrow(
    'Rede caiu',
  )
  expect(completed).toBe(0)
  expect((await transferBrowserFile(file, input, request, signal, () => {}, send)).state).toBe(
    'verifying',
  )
  expect(sent).toEqual([1, 2])
  expect(bodies).toEqual([input, input])
  expect(completed).toBe(1)
})
test('URLs de armazenamento não enviam arquivo a outro domínio ou credencial embutida', () => {
  expect(
    storageUploadUrl(`https://${'a'.repeat(32)}.r2.cloudflarestorage.com/file?signature=abc`),
  ).toContain('signature=abc')
  for (const url of [
    'http://127.0.0.1/file',
    'https://evil.test/file',
    `https://user:pass@${'a'.repeat(32)}.r2.cloudflarestorage.com/file`,
  ])
    expect(() => storageUploadUrl(url)).toThrow()
})
