import { expect, mock, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { CreateBucketCommand, S3Client } from '@aws-sdk/client-s3'
import { assetToJson, createAsset } from '@sistemazero/pinta/assets'

mock.module('server-only', () => ({}))
const { r2CreateObjectUgc, r2GetObjectUgc, r2PresignGetUgc, r2PresignPutUgc } = await import(
  '../src/server/r2'
)
const { readPintaCausalBlob } = await import('../src/server/pinta-causal-content')

const endpoint = process.env.R2_S3_ENDPOINT
const bucket = process.env.R2_UGC_BUCKET
const origin = 'http://127.0.0.1:5577'
const format = 'application/gzip'

if (endpoint !== 'http://127.0.0.1:5578' || !bucket?.startsWith('pinta-causal-qa-'))
  throw new Error('This probe is restricted to its disposable loopback store.')

test('conditional presigned upload, CORS preflight, retained gzip and server-only seal against real MinIO', async () => {
  const s3 = new S3Client({
    endpoint,
    region: 'auto',
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })
  try {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }))
    const sheet = createAsset({ kind: 'tileset', name: 'terra-qa', tileSize: 16 })
    const gzip = gzipSync(assetToJson(sheet))
    const expected = {
      itemId: sheet.id,
      kind: sheet.kind,
      formatVersion: 6,
      bytes: gzip.byteLength,
      sha256: createHash('sha256').update(gzip).digest('hex'),
    }
    const prefix = [
      'creations',
      crypto.randomUUID(),
      'pinta',
      sheet.id,
      'units',
      crypto.randomUUID(),
    ].join('/')
    const uploadKey = prefix + '/1.upload.gz'
    const sealedKey = prefix + '/1.sealed.gz'
    const url = await r2PresignPutUgc({
      key: uploadKey,
      contentType: format,
      contentLength: gzip.byteLength,
      criarUmaVez: true,
    })
    const preflight = await fetch(url, {
      method: 'OPTIONS',
      headers: {
        origin,
        'access-control-request-method': 'PUT',
        'access-control-request-headers': 'content-type,if-none-match',
      },
    })
    expect(preflight.ok).toBe(true)
    expect(preflight.headers.get('access-control-allow-origin')).toBe(origin)
    const methods = preflight.headers.get('access-control-allow-methods')?.toLowerCase() ?? ''
    const headers = preflight.headers.get('access-control-allow-headers')?.toLowerCase() ?? ''
    expect(methods).toContain('put')
    expect(
      headers === '*' || (headers.includes('content-type') && headers.includes('if-none-match')),
    ).toBe(true)

    const send = async (body: Buffer, conditional: boolean) => {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          origin,
          'content-type': format,
          ...(conditional ? { 'if-none-match': '*' } : {}),
        },
        body,
      })
      const responseBody = await response.text()
      if (response.status >= 400)
        console.log(
          'S3 disposition',
          response.status,
          /<Code>([^<]+)<\/Code>/.exec(responseBody)?.[1],
        )
      return {
        status: response.status,
        allowOrigin: response.headers.get('access-control-allow-origin'),
      }
    }
    expect((await send(gzip, false)).status).toBeGreaterThanOrEqual(400)
    expect(await r2GetObjectUgc(uploadKey)).toBeNull()
    expect(await send(gzip, true)).toEqual({ status: 200, allowOrigin: origin })
    expect(await send(gzip, true)).toEqual({ status: 412, allowOrigin: origin })

    const different = Buffer.from(gzip)
    different[different.length - 1] ^= 0xff
    expect((await send(different, true)).status).toBe(412)
    const object = await r2GetObjectUgc(uploadKey)
    expect(object).not.toBeNull()
    const verified = await readPintaCausalBlob(object!, expected)
    expect(verified.gzip).toEqual(gzip)
    expect(verified.sha256).toBe(expected.sha256)
    expect(verified.manifest.sheet).toEqual({ tileSize: 16, count: 1 })

    expect(
      await r2CreateObjectUgc({ key: sealedKey, body: verified.gzip, contentType: format }),
    ).toBe(true)
    expect(await r2CreateObjectUgc({ key: sealedKey, body: different, contentType: format })).toBe(
      false,
    )
    const download = await r2PresignGetUgc(sealedKey, {
      responseContentType: format,
      responseContentDisposition: 'attachment; filename="terra-qa.pinta.json.gz"',
    })
    const attached = await fetch(download, { headers: { origin } })
    expect(attached.status).toBe(200)
    expect(attached.headers.get('access-control-allow-origin')).toBe(origin)
    expect(attached.headers.get('content-disposition')).toBe(
      'attachment; filename="terra-qa.pinta.json.gz"',
    )
    expect(
      createHash('sha256')
        .update(Buffer.from(await attached.arrayBuffer()))
        .digest('hex'),
    ).toBe(expected.sha256)
  } finally {
    s3.destroy()
  }
}, 20_000)
