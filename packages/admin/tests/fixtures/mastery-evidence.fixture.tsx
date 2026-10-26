import { afterEach, expect, mock, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import type { GallerySubmission } from '@sistemazero/core/learning'
import { assetToJson, createAsset, type PintaAsset } from '@sistemazero/pinta/assets'
import type { EditableStudioProject } from '@sistemazero/studio'
import moldaAssets from '../../../studio/playground/moldaDemoAssets.json'
import { documentFixture } from '../../../studio/src/state/fixtures/projectDocuments'

const platform = {
  Response,
  Request,
  Headers,
  AbortController,
  AbortSignal,
  ReadableStream,
  TransformStream,
  DecompressionStream,
}
if (typeof document === 'undefined') GlobalRegistrator.register()
Object.assign(globalThis, platform)
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const received: { pinta?: PintaAsset; studio?: EditableStudioProject; reviewScope?: unknown } = {}
mock.module('@/components/pinta/pinta-embed', () => ({
  PintaEmbed: ({ initialAsset }: { initialAsset: PintaAsset }) => {
    received.pinta = initialAsset
    return <div />
  },
}))
mock.module('@/components/studio/studio-embed', () => ({
  StudioEmbed: (props: { initialProject: EditableStudioProject; masteryReviewScope?: unknown }) => {
    received.studio = props.initialProject
    received.reviewScope = props.masteryReviewScope
    return <div />
  },
}))

const originalFetch = globalThis.fetch
const requests: string[] = []
const asset = createAsset({
  kind: 'vector-background',
  name: 'Jardim preservado',
  width: 480,
  height: 360,
})
const snapshot: GallerySubmission = {
  kind: 'gallery-delivery',
  version: 1,
  tool: 'pinta',
  requestId: 'lesson-request',
  items: [
    {
      itemId: 'drawing-one',
      revision: 2,
      kind: asset.kind,
      name: asset.name,
      storageKey: 'private/frozen/main.gz',
      parts: [],
    },
  ],
}
const reviewerId = '20000000-0000-4000-8000-000000000002'
const submissionId = '20000000-0000-4000-8000-000000000001'
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MasteryProjectEvidence } = await import(
  '../../src/app/admin/professor/maestrias/project-evidence'
)

afterEach(() => {
  globalThis.fetch = originalFetch
  requests.length = 0
  delete received.pinta
  delete received.studio
  delete received.reviewScope
  document.body.replaceChildren()
})

test('opens the drawing from the immutable mastery gallery ticket instead of parsing the envelope as a project', async () => {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input)
    requests.push(url)
    if (url === `/api/members/journey/masteries/submissions/${submissionId}/gallery/drawing-one`)
      return Response.json({ url: 'https://snapshot.invalid/frozen.gz', parts: [] })
    if (url === 'https://snapshot.invalid/frozen.gz')
      return new Response(gzipSync(assetToJson(asset)))
    throw new Error(`Unexpected URL ${url}`)
  }) as typeof fetch
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  try {
    await act(async () => {
      root.render(
        <MasteryProjectEvidence
          payload={{ project: snapshot }}
          reviewerId={reviewerId}
          submissionId={submissionId}
        />,
      )
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    await act(async () => new Promise((resolve) => setTimeout(resolve, 20)))
    expect(container.textContent).toContain('Jardim preservado')
    expect(container.querySelector('[role="alert"]')?.textContent ?? null).toBeNull()
    expect(received.pinta?.name).toBe('jardim-preservado')
    expect(requests).toHaveLength(2)
  } finally {
    await act(async () => root.unmount())
  }
})

for (const language of ['javascript', 'python'] as const) {
  test(`opens a ${language} Pro gallery project with the frozen Molda asset and its review scope`, async () => {
    const project = documentFixture(language, 'pro')
    project.assets = []
    delete project.coverAssetName
    if (project.kind === 'pro' && language === 'javascript')
      project.proMeta.templateId = 'vanilla-js'
    const model = {
      id: 'molda-model',
      name: moldaAssets.model.name,
      kind: 'model3d',
      dataUrl: moldaAssets.model.dataUrl,
      originalFileName: 'nave.glb',
      source: 'library',
      libId: 'personal:ship',
      libOrigin: 'molda',
    }
    const bytes = JSON.stringify(model)
    const hash = createHash('sha256').update(bytes).digest('hex')
    const manifest = { format: 'sz-studio-parts', version: 1, program: project, assets: [hash] }
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input)
      requests.push(url)
      if (url.startsWith('/api/'))
        return Response.json({
          url: 'https://snapshot.invalid/game.gz',
          parts: [{ hash, url: 'https://snapshot.invalid/model.gz' }],
        })
      if (url.endsWith('/game.gz')) return new Response(gzipSync(JSON.stringify(manifest)))
      if (url.endsWith('/model.gz')) return new Response(gzipSync(bytes))
      throw new Error(`Unexpected URL ${url}`)
    }) as typeof fetch
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    try {
      await act(async () =>
        root.render(
          <MasteryProjectEvidence
            payload={{ project: { ...snapshot, tool: 'studio' } }}
            reviewerId={reviewerId}
            submissionId={submissionId}
          />,
        ),
      )
      await act(async () => new Promise((resolve) => setTimeout(resolve, 80)))
      expect(container.querySelector('[role="alert"]')?.textContent ?? null).toBeNull()
      expect(received.studio?.programmingLanguage).toBe(language)
      expect(received.studio?.kind).toBe('pro')
      expect(received.studio?.assets?.[0]?.dataUrl).toBe(model.dataUrl)
      expect(received.reviewScope).toEqual({ userId: reviewerId, submissionId })
      expect(requests).toHaveLength(3)
      if (language === 'python') {
        const source = container.querySelector('section[aria-label="Arquivos da versão enviada"]')!
        expect(source.textContent).toContain('src/main.py')
        expect(source.textContent).toContain('src/helper.py')
        const helper = Array.from(source.querySelectorAll('details')).find((item) =>
          item.querySelector('summary')?.textContent?.startsWith('src/helper.py'),
        )!
        await act(async () => helper.querySelector('summary')!.click())
        expect(helper.open).toBe(true)
        expect(helper.querySelector('code')?.textContent).toBe('n = 42')
        expect(
          source.querySelector('input, textarea, [contenteditable="true"], [inert]') === null,
        ).toBe(true)
      }
    } finally {
      await act(async () => root.unmount())
    }
  })
}

test('changing the reviewed submission ignores a late ticket and loads only the selected immutable copy', async () => {
  let release: ((response: Response) => void) | undefined
  let firstSignal: AbortSignal | undefined
  const nextId = '20000000-0000-4000-8000-000000000003'
  globalThis.fetch = (async (input: RequestInfo | URL, options?: RequestInit) => {
    const url = String(input)
    requests.push(url)
    if (url.includes(submissionId)) {
      firstSignal = options?.signal ?? undefined
      return new Promise<Response>((resolve) => {
        release = resolve
      })
    }
    if (url.includes(nextId))
      return Response.json({ url: 'https://snapshot.invalid/current.gz', parts: [] })
    if (url.endsWith('/current.gz')) return new Response(gzipSync(assetToJson(asset)))
    throw new Error('A late copy must never be read')
  }) as typeof fetch
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  try {
    await act(async () =>
      root.render(
        <MasteryProjectEvidence
          payload={{ project: snapshot }}
          reviewerId={reviewerId}
          submissionId={submissionId}
        />,
      ),
    )
    await act(async () =>
      root.render(
        <MasteryProjectEvidence
          payload={{ project: snapshot }}
          reviewerId={reviewerId}
          submissionId={nextId}
        />,
      ),
    )
    await act(async () => {
      release?.(Response.json({ url: 'https://snapshot.invalid/late.gz', parts: [] }))
      await new Promise((resolve) => setTimeout(resolve, 30))
    })
    expect(firstSignal?.aborted).toBe(true)
    expect(requests.some((url) => url.includes('/late.gz'))).toBe(false)
    expect(received.pinta?.name).toBe('jardim-preservado')
    expect(container.querySelector('[role="alert"]')?.textContent ?? null).toBeNull()
  } finally {
    await act(async () => root.unmount())
  }
})

test('a failed ticket offers retry without enabling download or switching to a mutable gallery', async () => {
  let rejected = true
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input)
    requests.push(url)
    if (url.startsWith('/api/'))
      return rejected
        ? Response.json(
            { error: { message: 'Cópia temporariamente indisponível.' } },
            { status: 503 },
          )
        : Response.json({ url: 'https://snapshot.invalid/frozen.gz', parts: [] })
    return new Response(gzipSync(assetToJson(asset)))
  }) as typeof fetch
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  try {
    await act(async () =>
      root.render(
        <MasteryProjectEvidence
          payload={{ project: snapshot }}
          reviewerId={reviewerId}
          submissionId={submissionId}
        />,
      ),
    )
    await act(async () => new Promise((resolve) => setTimeout(resolve, 20)))
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      'Cópia temporariamente indisponível.',
    )
    const download = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Baixar trabalho aberto'),
    )!
    expect(download.disabled).toBe(true)
    rejected = false
    const retry = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Tentar novamente',
    )!
    await act(async () => retry.click())
    await act(async () => new Promise((resolve) => setTimeout(resolve, 30)))
    expect(container.querySelector('[role="alert"]')?.textContent ?? null).toBeNull()
    expect(download.disabled).toBe(false)
    expect(requests.filter((url) => url.startsWith('/api/'))).toEqual([requests[0]!, requests[0]!])
  } finally {
    await act(async () => root.unmount())
  }
})
