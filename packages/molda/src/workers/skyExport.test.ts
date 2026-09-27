import { describe, expect, test } from 'bun:test'
import { createSkyAsset } from '../core/model'
import { exportSkyHdr } from '../export/skyHdr'
import { SKY_PRESET_IDS } from '../sky/params'
import { exportSkyHdrInWorker } from './skyExport'
import { readSkyExportReply, type SkyExportReply } from './skyExportProtocol'

describe('sky export worker (real separate runtime, no renderer)', () => {
  test.each([
    ...SKY_PRESET_IDS,
  ])('%s is byte-identical to the synchronous encoder', async (preset) => {
    const asset = createSkyAsset({ name: 'ceu', preset })
    const original = structuredClone(asset)
    const size = { width: 64, height: 32 }
    const progress: string[] = []
    const result = await exportSkyHdrInWorker(asset, {
      size,
      revision: 7,
      onProgress: (phase) => progress.push(phase),
    })
    expect(result).toEqual(exportSkyHdr(asset, size))
    expect(asset).toEqual(original)
    expect(progress).toEqual(['rendering', 'encoding'])
  })

  test('cancels while the real worker is rendering', async () => {
    const controller = new AbortController()
    const progress: string[] = []
    const promise = exportSkyHdrInWorker(createSkyAsset({ name: 'cancelar' }), {
      signal: controller.signal,
      onProgress: (phase) => {
        progress.push(phase)
        controller.abort()
      },
    })
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
    expect(progress).toEqual(['rendering'])
  })

  test('rejects oversized requests and mismatched document or revision replies', async () => {
    await expect(
      exportSkyHdrInWorker(createSkyAsset({ name: 'limite' }), {
        size: { width: 1025, height: 512 },
      }),
    ).rejects.toThrow(RangeError)
    const token = { documentId: 'sky-1', revision: 42 }
    const message: SkyExportReply = { ...token, type: 'progress', progress: 'encoding' }
    expect(readSkyExportReply(message, token)).toEqual(message)
    expect(readSkyExportReply({ ...message, revision: 41 }, token)).toBeNull()
    expect(readSkyExportReply({ ...message, documentId: 'sky-2' }, token)).toBeNull()
    expect(readSkyExportReply({ ...token, type: 'result', result: { ok: true } }, token)).toBeNull()
  })
})
