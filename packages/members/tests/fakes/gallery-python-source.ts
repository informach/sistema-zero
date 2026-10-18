import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import type { GalleryStudioSource, GallerySubmissionItem } from '@sistemazero/core/learning'
import { StudioGallerySourceService } from '../../src/application/learning/studio-gallery-source.service'
import { authoringFixture } from './studio-authoring-policy'
export const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jH1QAAAAASUVORK5CYII='
export async function galleryPythonSourceFixture(kind: 'classic' | 'pro' = 'pro', parts = true) {
  const { project, configuration } = await authoringFixture('python', kind)
  if (project.programmingLanguage !== 'python') throw new Error('Expected Python')
  project.python.entrypoint = 'main.py'
  if (project.kind === 'classic') {
    project.mode = 'bridge'
    project.files['main.py'] = 'while False:\n    pass\n'
  } else project.tree['main.py'] = { kind: 'file', content: 'while False:\n    pass\n' }
  const asset = {
    id: 'drawing',
    name: 'heroi',
    kind: 'image',
    source: 'library',
    libOrigin: 'pinta',
    libId: 'personal:drawing',
    libRevision: 3,
    dataUrl: PNG,
    license: { name: 'CC0', attribution: 'Fixture' },
  }
  project.assets = [asset]
  const assetBytes = Buffer.from(` ${JSON.stringify(asset)}\n`)
  const hash = createHash('sha256').update(assetBytes).digest('hex')
  const prefix = 'creations/owner/lesson-submissions/block/request/project-1'
  const item: GallerySubmissionItem = {
    itemId: project.id,
    revision: 1,
    name: project.name,
    kind: 'program',
    storageKey: `${prefix}/project.gz`,
    parts: parts ? [{ hash, storageKey: `${prefix}/parts/${hash}.gz` }] : [],
  }
  const { assets: _assets, ...program } = project
  const main = Buffer.from(
    JSON.stringify(
      parts ? { format: 'sz-studio-parts', version: 1, program, assets: [hash] } : project,
    ),
  )
  const objects = new Map([
    [`/bucket/${item.storageKey}`, gzipSync(main)],
    ...item.parts.map((part) => [`/bucket/${part.storageKey}`, gzipSync(assetBytes)] as const),
  ])
  const requests: string[] = []
  let handler: ((request: Request) => Promise<Response>) | undefined
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    async fetch(request): Promise<Response> {
      requests.push(new URL(request.url).pathname)
      if (handler) return handler(request)
      const object = objects.get(new URL(request.url).pathname)
      return new Response(object ?? null, {
        status: object ? 200 : 404,
        headers: { 'Content-Type': 'application/gzip' },
      })
    },
  })
  const base = new URL('/bucket/', server.url).href
  const reference: GalleryStudioSource = {
    format: 'sz-studio-gallery-source',
    version: 1,
    itemId: item.itemId,
    revision: item.revision,
    source: {
      storageKey: item.storageKey,
      url: `${new URL(item.storageKey, base).href}?temporary=private`,
    },
    parts: item.parts.map((part) => ({
      ...part,
      url: `${new URL(part.storageKey, base).href}?temporary=private`,
    })),
  }
  const service = new StudioGallerySourceService({ storageBaseURL: base, allowLoopbackHttp: true })
  return {
    project,
    asset,
    item,
    reference,
    requests,
    service,
    objects,
    configuration,
    bindItem(next: GallerySubmissionItem): GalleryStudioSource {
      objects.set(`/bucket/${next.storageKey}`, gzipSync(main))
      for (const part of next.parts) objects.set(`/bucket/${part.storageKey}`, gzipSync(assetBytes))
      return {
        format: 'sz-studio-gallery-source',
        version: 1,
        itemId: next.itemId,
        revision: next.revision,
        source: { storageKey: next.storageKey, url: new URL(next.storageKey, base).href },
        parts: next.parts.map((part) => ({ ...part, url: new URL(part.storageKey, base).href })),
      }
    },
    setHandler(next: typeof handler) {
      handler = next
    },
    close() {
      server.stop(true)
    },
  }
}
