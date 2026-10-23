import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { preparePythonExecutionSnapshot } from '@sistemazero/studio/server-python-snapshot'
import { StudioGallerySourceService } from '../../src/application/learning/studio-gallery-source.service'
import { PNG, galleryPythonSourceFixture as setup } from '../fakes/gallery-python-source'

test.each([
  'classic',
  'pro',
] as const)('loads exact %s files and Pinta assets over real gzip HTTP, inline and parts', async (kind) => {
  for (const parts of [false, true]) {
    const f = await setup(kind, parts)
    try {
      const loaded = await f.service.load(f.reference, f.item, AbortSignal.timeout(2000))
      expect(loaded).toMatchObject({
        id: f.project.id,
        programmingLanguage: 'python',
        kind,
        assets: [f.asset],
      })
      const snapshot = await preparePythonExecutionSnapshot(loaded)
      const image = snapshot.files.find((file) => file.kind === 'asset')
      const bytes = Buffer.from(PNG.split(',')[1]!, 'base64')
      expect(image?.bytes).toEqual(new Uint8Array(bytes))
      expect(image?.sha256).toBe(createHash('sha256').update(bytes).digest('hex'))
      expect(f.requests).toHaveLength(parts ? 2 : 1)
    } finally {
      f.close()
    }
  }
})

test('pins every URL to its exact authorized key before any fetch', async () => {
  const f = await setup()
  try {
    for (const url of [
      'http://169.254.169.254/metadata',
      'https://other.test/bucket/project.gz',
      f.reference.source.url.replace('/creations/owner/', '/creations/sibling/'),
      `${f.reference.source.url}#fragment`,
      'not-a-url',
    ]) {
      await expect(
        f.service.load(
          { ...f.reference, source: { ...f.reference.source, url } },
          f.item,
          AbortSignal.timeout(1000),
        ),
      ).rejects.toThrow()
    }
    await expect(
      f.service.load(
        {
          ...f.reference,
          parts: [{ ...f.reference.parts[0], url: 'https://other.test/asset.gz' }],
        },
        f.item,
        AbortSignal.timeout(1000),
      ),
    ).rejects.toThrow()
    await expect(
      f.service.load({ ...f.reference, revision: 2 }, f.item, AbortSignal.timeout(1000)),
    ).rejects.toThrow()
    expect(f.requests).toHaveLength(0)
  } finally {
    f.close()
  }
})

test('refuses redirects without following them and absence of configuration never fetches', async () => {
  const f = await setup()
  try {
    f.setHandler(
      async () =>
        new Response(null, {
          status: 302,
          headers: { Location: 'http://169.254.169.254/metadata' },
        }),
    )
    await expect(f.service.load(f.reference, f.item, AbortSignal.timeout(1000))).rejects.toThrow(
      'preservado',
    )
    expect(f.requests).toHaveLength(1)
    await expect(
      new StudioGallerySourceService().load(f.reference, f.item, AbortSignal.timeout(1000)),
    ).rejects.toThrow('preservado')
    expect(f.requests).toHaveLength(1)
  } finally {
    f.close()
  }
})

test('withdrawal during a real HTTP read rejects promptly and never downloads a late part', async () => {
  const f = await setup()
  const entered = Promise.withResolvers<void>(),
    release = Promise.withResolvers<void>()
  const controller = new AbortController()
  try {
    f.setHandler(async (request) => {
      entered.resolve()
      await release.promise
      return new Response(f.objects.get(new URL(request.url).pathname))
    })
    const pending = f.service.load(f.reference, f.item, controller.signal)
    await entered.promise
    controller.abort(new DOMException('Withdrawn', 'AbortError'))
    await expect(pending).rejects.toThrow('Withdrawn')
    release.resolve()
    await Bun.sleep(20)
    expect(f.requests).toHaveLength(1)
  } finally {
    controller.abort()
    release.resolve()
    f.close()
  }
})

test('the compressed byte quota cancels its stream before decompression', async () => {
  const f = await setup('pro', false)
  let cancelled = false,
    calls = 0
  const chunk = new Uint8Array(64 * 1024)
  const request = Object.assign(
    async () => {
      calls++
      return new Response(
        new ReadableStream<Uint8Array>({
          pull(controller) {
            controller.enqueue(chunk)
          },
          cancel() {
            cancelled = true
          },
        }),
      )
    },
    { preconnect: fetch.preconnect },
  )
  try {
    const base = new URL(f.reference.source.url)
    base.pathname = '/bucket/'
    base.search = ''
    const service = new StudioGallerySourceService({
      storageBaseURL: base.href,
      allowLoopbackHttp: true,
      request,
    })
    await expect(service.load(f.reference, f.item, AbortSignal.timeout(2000))).rejects.toThrow(
      'comprimida excede',
    )
    expect(cancelled).toBe(true)
    expect(calls).toBe(1)
  } finally {
    f.close()
  }
})
