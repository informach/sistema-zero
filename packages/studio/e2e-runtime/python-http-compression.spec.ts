import { createHash } from 'node:crypto'
import { request as httpRequest } from 'node:http'
import { gunzipSync } from 'node:zlib'
import { expect, type Response, test } from '@playwright/test'
import { StudioPythonDistributionSchema } from '@sistemazero/core/studio/python-runtime-distribution'
import type {} from '../../../experiments/studio-python-runtime/providerHost'

const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')

/** Separate functional wire proof, deliberately outside performance measurements. */
function readEncoded(url: string, limit: number) {
  return new Promise<Buffer>((resolve, reject) => {
    const request = httpRequest(
      url,
      {
        agent: false,
        headers: { 'Accept-Encoding': 'gzip' },
        signal: AbortSignal.timeout(10000),
      },
      (response) => {
        if (response.statusCode !== 200 || response.headers['content-encoding'] !== 'gzip') {
          response.resume()
          reject(new Error('Expected a real gzip response on the wire'))
          return
        }
        const chunks: Buffer[] = []
        let size = 0
        response.on('data', (chunk: Buffer) => {
          size += chunk.byteLength
          if (size > limit) request.destroy(new Error('Encoded response exceeded declared length'))
          else chunks.push(chunk)
        })
        response.once('error', reject)
        response.once('end', () => resolve(Buffer.concat(chunks, size)))
      },
    )
    request.once('error', reject)
    request.end()
  })
}

test('real Turtle execution downloads gzip modules whose encoded and decoded bytes match the release', async ({
  page,
  request,
}, testInfo) => {
  const distribution = await (await request.get('/distribution')).json()
  const manifest = StudioPythonDistributionSchema.parse(distribution.manifest)
  const configuration = await (await request.get('/configuration')).json()
  const directory = new URL('./', configuration.providerFrameURL).href
  const representations = new Map(manifest.httpRepresentations?.map((item) => [item.path, item]))
  expect(representations.size).toBeGreaterThan(0)
  const responses = new Map<string, Response>()
  page.on('response', (response) => {
    if (response.url().startsWith(directory)) {
      const path = response.url().slice(directory.length)
      if (representations.has(path)) responses.set(path, response)
    }
  })
  await page.goto('/provider')
  await page.waitForFunction(() => !!globalThis.providerProbe)
  try {
    await page.evaluate(() => globalThis.providerProbe.prepare('http-compression', 'turtleDrawing'))
    expect(
      await page.evaluate(() => globalThis.providerProbe.read('http-compression').status),
    ).toBe('ready')
    await page.evaluate(() => globalThis.providerProbe.run('http-compression'))
    await page.waitForFunction(() =>
      ['completed', 'failed'].includes(globalThis.providerProbe.read('http-compression').status),
    )
    const state = await page.evaluate(() => globalThis.providerProbe.read('http-compression'))
    expect(state.status, JSON.stringify(state)).toBe('completed')
    expect(
      state.events.flatMap((event) => (event.type === 'console' ? [event.text] : [])).join(''),
    ).toBe('drawing-ready (100.00,80.00) 90.0\n')
    const pixels = await page
      .frameLocator('iframe')
      .locator('canvas')
      .evaluate((element) => {
        if (!(element instanceof HTMLCanvasElement))
          throw new Error('Expected actual Turtle canvas')
        const context = element.getContext('2d')!
        return {
          size: [element.width, element.height],
          background: [...context.getImageData(10, 10, 1, 1).data],
          horizontal: [...context.getImageData(250, 150, 1, 1).data],
        }
      })
    expect(pixels).toEqual({
      size: [400, 300],
      background: [30, 144, 255, 255],
      horizontal: [255, 0, 0, 255],
    })
    for (const path of [
      'frame.mjs',
      'boot-reader.mjs',
      'worker.mjs',
      'pyodide.mjs',
      'pyodide.asm.mjs',
      'turtle-renderer.mjs',
    ])
      expect(responses.has(path), path).toBe(true)
    const downloads = []
    for (const [path, response] of responses) {
      const representation = representations.get(path)!
      const logical = manifest.files.find((file) => file.path === path)!
      const encoded = manifest.files.find((file) => file.path === representation.artifactPath)!
      expect(response.status()).toBe(200)
      const headers = await response.allHeaders()
      expect(headers['content-encoding']).toBe('gzip')
      expect(headers['content-length']).toBe(String(encoded.bytes))
      expect(headers.etag).toBe(`"${encoded.sha256}"`)
      expect(headers.vary).toBe('Accept-Encoding')
      const decoded = await response.body()
      expect(decoded.byteLength).toBe(logical.bytes)
      expect(digest(decoded)).toBe(logical.sha256)
      const wire = await readEncoded(directory + path, encoded.bytes)
      expect(wire.byteLength).toBe(encoded.bytes)
      expect(digest(wire)).toBe(encoded.sha256)
      expect(new Uint8Array(gunzipSync(wire, { maxOutputLength: logical.bytes }))).toEqual(
        new Uint8Array(decoded),
      )
      downloads.push({
        path,
        encodedBytes: wire.byteLength,
        encodedSha256: digest(wire),
        decodedBytes: decoded.byteLength,
        decodedSha256: digest(decoded),
      })
    }
    await testInfo.attach('http-compression-evidence', {
      body: JSON.stringify(
        {
          distribution,
          downloads,
          pixels,
          scope:
            'Functional browser decoding and separate native Node raw HTTP wire proof; no performance qualification.',
        },
        null,
        2,
      ),
      contentType: 'application/json',
    })
    await page.evaluate(() => globalThis.providerProbe.stop('http-compression'))
    expect(
      await page.evaluate(() => globalThis.providerProbe.read('http-compression').status),
    ).toBe('stopped')
  } finally {
    await page.evaluate(() => globalThis.providerProbe.dispose('http-compression'))
  }
})
