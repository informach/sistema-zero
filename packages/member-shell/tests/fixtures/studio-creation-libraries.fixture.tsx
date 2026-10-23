import { afterEach, beforeEach, expect, mock, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import type { PintaImageDerivation } from '@sistemazero/core/studio/pinta-image'
import type { StudioPintaLibraryAdapter } from '@sistemazero/studio'

GlobalRegistrator.register({ settings: { disableIframePageLoading: true } })
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act, StrictMode } = await import('react')
const { createRoot } = await import('react-dom/client')
const asset = { id: 'drawing', name: 'desenho', dataUrl: 'data:image/png;base64,AAAA' }
const derivation: PintaImageDerivation = {
  recipe: {
    version: 1,
    algorithm: 'pinta-image-1',
    drawingId: 'drawing',
    selection: { kind: 'frame', animationId: 'andar', frameIndex: 1 },
    scale: 1,
  },
  provenance: { sourceSha256: 'a'.repeat(64), dependencies: [] },
  output: { mime: 'image/png', width: 1, height: 1, bytes: 3, sha256: 'b'.repeat(64) },
}
const image = { dataUrl: 'data:image/png;base64,BBBB', derivation }
const imageRequest = () => ({
  recipe: structuredClone(derivation.recipe),
  limits: {
    dimension: 4096,
    imagePixels: 4194304,
    totalImagePixels: 16777216,
    imageBytes: 16777216,
    dataUrlChars: 800000,
  },
})
let exportGate: Promise<void> = Promise.resolve()
let saveGate: Promise<void> = Promise.resolve()
let entered = Promise.withResolvers<void>()
let saving = Promise.withResolvers<void>()
const exports: Array<
  | {
      namespace?: string
      signal?: AbortSignal
      expectedProvenance?: PintaImageDerivation['provenance']
    }
  | undefined
> = []
const inspections: Array<{ id: string; namespace?: string; signal?: AbortSignal }> = []
const lists: Array<
  { namespace?: string; signal?: AbortSignal; includeImageSelection?: boolean } | undefined
> = []
const saves: Array<{ namespace: string; name: string }> = []
const savedValues: Array<typeof asset> = []
const imageRequests: unknown[] = []
let globalNamespaceWrites = 0
mock.module('@sistemazero/pinta/studio-library', () => ({
  setPintaStorageNamespace: () => {
    globalNamespaceWrites++
  },
  listGalleryForStudio: async (options?: {
    namespace?: string
    signal?: AbortSignal
    includeImageSelection?: boolean
  }) => {
    lists.push(options)
    return []
  },
  inspectImageForStudio: async (
    id: string,
    options?: { namespace?: string; signal?: AbortSignal },
  ) => {
    inspections.push({ id, ...options })
    entered.resolve()
    await exportGate
    return structuredClone(derivation.provenance)
  },
  exportAssetForStudio: async (
    _id: string,
    options?: { namespace?: string; signal?: AbortSignal },
  ) => {
    exports.push(options)
    entered.resolve()
    await exportGate
    return { ok: true, asset }
  },
  exportImageAndSourceForStudio: async (
    recipe: unknown,
    limits: unknown,
    options?: { namespace?: string; signal?: AbortSignal },
  ) => {
    imageRequests.push(structuredClone({ recipe, limits }))
    exports.push(options)
    entered.resolve()
    await exportGate
    return { ok: true, asset, image }
  },
  exportImageForStudio: async (
    recipe: unknown,
    limits: unknown,
    options?: { namespace?: string; signal?: AbortSignal },
  ) => {
    imageRequests.push(structuredClone({ recipe, limits }))
    exports.push(options)
    entered.resolve()
    await exportGate
    return image
  },
}))
mock.module('@sistemazero/studio/personal-assets', () => ({
  savePersonalAsset: async (value: typeof asset, options: { namespace: string }) => {
    saves.push({ namespace: options.namespace, name: value.name })
    savedValues.push(structuredClone(value))
    saving.resolve()
    await saveGate
    return { ok: true, name: 'desenho-2', updatedAt: 7 }
  },
}))
const { useStudioCreationLibraries } = await import(
  '../../src/components/creator/use-studio-creation-libraries'
)
const cleanups: Array<() => void> = []
beforeEach(() => {
  exportGate = saveGate = Promise.resolve()
  entered = Promise.withResolvers<void>()
  saving = Promise.withResolvers<void>()
  exports.length = lists.length = saves.length = inspections.length = globalNamespaceWrites = 0
  savedValues.length = imageRequests.length = 0
})
afterEach(async () => {
  await act(async () => {
    for (const cleanup of cleanups.splice(0)) cleanup()
  })
})

async function harness() {
  const element = document.createElement('div')
  document.body.append(element)
  const root = createRoot(element)
  let current: StudioPintaLibraryAdapter | undefined
  function Host({ viewer, owned }: { viewer: string; owned: boolean }) {
    current = useStudioCreationLibraries(viewer, owned, false).pintaLibrary
    return null
  }
  let mounted = true
  const unmount = () => {
    if (mounted) {
      mounted = false
      root.unmount()
      element.remove()
    }
  }
  cleanups.push(unmount)
  const render = async (viewer: string, owned = true) => {
    await act(async () => {
      root.render(
        <StrictMode>
          <Host viewer={viewer} owned={owned} />
        </StrictMode>,
      )
    })
  }
  await render('profile-a')
  return { render, unmount, adapter: () => current! }
}

for (const derived of [false, true]) {
  for (const change of ['profile', 'profile-aba', 'possession', 'unmount', 'cancel'] as const) {
    test(`host refuses a pending ${derived ? 'derived' : 'canonical'} import after ${change} without saving into another profile`, async () => {
      const release = Promise.withResolvers<void>()
      exportGate = release.promise
      const h = await harness()
      const controller = new AbortController()
      const pending = h
        .adapter()
        .import('drawing', {
          signal: controller.signal,
          ...(derived ? { image: imageRequest() } : {}),
        })
        .then(
          () => null,
          (error: unknown) => error,
        )
      await entered.promise
      if (change === 'profile' || change === 'profile-aba') {
        await h.render('profile-b')
        if (change === 'profile-aba') await h.render('profile-a')
      } else if (change === 'possession') await h.render('profile-a', false)
      else if (change === 'unmount') await act(async () => h.unmount())
      else controller.abort()
      release.resolve()
      expect(await pending).toBeInstanceOf(DOMException)
      expect(saves).toEqual([])
    })
  }
}

test('host captures the explicit namespace and preserves canonical personal-library output in StrictMode', async () => {
  const h = await harness()
  await h.adapter().list()
  const result = await h.adapter().import('drawing')
  expect(lists[0]?.namespace).toBe('profile-a')
  expect(exports[0]?.namespace).toBe('profile-a')
  expect(globalNamespaceWrites).toBe(0)
  expect(saves).toEqual([{ namespace: 'profile-a', name: 'desenho' }])
  expect(result).toEqual({ ok: true, asset: { ...asset, name: 'desenho-2', libRevision: 7 } })
})

test('preview captures its input and namespace without saving or importing a canonical asset', async () => {
  const release = Promise.withResolvers<void>()
  exportGate = release.promise
  const h = await harness(),
    request = imageRequest(),
    before = structuredClone(request)
  const preview = h.adapter().previewImage
  expect(preview).toBeFunction()
  if (!preview) throw new Error('Portable image preview is required')
  const pending = preview(request.recipe, request.limits)
  await entered.promise
  request.recipe.scale = 2
  release.resolve()
  expect(await pending).toEqual(image)
  expect(imageRequests).toEqual([before])
  expect(exports[0]?.namespace).toBe('profile-a')
  expect(saves).toEqual([])
  expect(savedValues).toEqual([])
})

test('selection facts are opt-in and do not materialize in historical gallery requests', async () => {
  const h = await harness()
  await h.adapter().list()
  await h.adapter().list({ includeImageSelection: true })
  expect(lists[0]).not.toHaveProperty('includeImageSelection')
  expect(lists[1]?.includeImageSelection).toBe(true)
  expect(saves).toEqual([])
})

test('sync inspection captures the profile and never exports or saves', async () => {
  const h = await harness()
  const inspect = h.adapter().inspectImage
  if (!inspect) throw new Error('Portable image inspection is required')
  expect(await inspect('drawing')).toEqual(derivation.provenance)
  expect(inspections.map(({ id, namespace }) => ({ id, namespace }))).toEqual([
    { id: 'drawing', namespace: 'profile-a' },
  ])
  expect(exports).toEqual([])
  expect(saves).toEqual([])
  expect(globalNamespaceWrites).toBe(0)
})

test('sync preview captures expected provenance before its first await', async () => {
  const h = await harness(),
    request = imageRequest(),
    expected = structuredClone(derivation.provenance)
  const preview = h.adapter().previewImage
  if (!preview) throw new Error('Portable image preview is required')
  const pending = preview(request.recipe, request.limits, { expectedProvenance: expected })
  expected.sourceSha256 = 'c'.repeat(64)
  expect(await pending).toEqual(image)
  expect(exports[0]?.expectedProvenance).toEqual(derivation.provenance)
  expect(saves).toEqual([])
})

for (const change of ['profile', 'profile-aba', 'possession', 'unmount', 'cancel'] as const) {
  test(`read-only inspection refuses a late result after ${change}`, async () => {
    const release = Promise.withResolvers<void>()
    exportGate = release.promise
    const h = await harness(),
      controller = new AbortController()
    const inspect = h.adapter().inspectImage
    if (!inspect) throw new Error('Portable image inspection is required')
    const pending = inspect('drawing', { signal: controller.signal }).then(
      () => null,
      (error: unknown) => error,
    )
    await entered.promise
    if (change === 'profile' || change === 'profile-aba') {
      await h.render('profile-b')
      if (change === 'profile-aba') await h.render('profile-a')
    } else if (change === 'possession') await h.render('profile-a', false)
    else if (change === 'unmount') await act(async () => h.unmount())
    else controller.abort()
    release.resolve()
    expect(await pending).toBeInstanceOf(DOMException)
    expect(inspections[0]?.namespace).toBe('profile-a')
    expect(exports).toEqual([])
    expect(saves).toEqual([])
  })
}

for (const change of ['profile', 'profile-aba', 'possession', 'unmount', 'cancel'] as const) {
  test(`read-only preview refuses a late result after ${change}`, async () => {
    const release = Promise.withResolvers<void>()
    exportGate = release.promise
    const h = await harness(),
      request = imageRequest(),
      controller = new AbortController()
    const preview = h.adapter().previewImage
    expect(preview).toBeFunction()
    if (!preview) throw new Error('Portable image preview is required')
    const pending = preview(request.recipe, request.limits, { signal: controller.signal }).then(
      () => null,
      (error: unknown) => error,
    )
    await entered.promise
    if (change === 'profile' || change === 'profile-aba') {
      await h.render('profile-b')
      if (change === 'profile-aba') await h.render('profile-a')
    } else if (change === 'possession') await h.render('profile-a', false)
    else if (change === 'unmount') await act(async () => h.unmount())
    else controller.abort()
    release.resolve()
    expect(await pending).toBeInstanceOf(DOMException)
    expect(saves).toEqual([])
  })
}

for (const derived of [false, true]) {
  test(`an already requested canonical save stays in its captured profile, but its late ${derived ? 'derived' : 'canonical'} result is revoked`, async () => {
    const release = Promise.withResolvers<void>()
    saveGate = release.promise
    const h = await harness()
    const pending = h
      .adapter()
      .import('drawing', derived ? { image: imageRequest() } : undefined)
      .then(
        () => null,
        (error: unknown) => error,
      )
    await saving.promise
    await h.render('profile-b')
    release.resolve()
    expect(await pending).toBeInstanceOf(DOMException)
    expect(saves).toEqual([{ namespace: 'profile-a', name: 'desenho' }])
    expect(savedValues).toEqual([asset])
  })
}

test('image selection is captured before awaiting; library keeps canonical bytes and caller receives only the PNG', async () => {
  const release = Promise.withResolvers<void>()
  exportGate = release.promise
  const h = await harness(),
    request = imageRequest(),
    before = structuredClone(request)
  const pending = h.adapter().import('drawing', { image: request })
  await entered.promise
  request.recipe.scale = 2
  request.limits.imageBytes = 1
  release.resolve()
  const result = await pending
  expect(imageRequests).toEqual([before])
  expect(exports[0]?.namespace).toBe('profile-a')
  expect(savedValues).toEqual([asset])
  expect(result).toEqual({
    ok: true,
    asset: {
      id: 'drawing',
      name: 'desenho-2',
      dataUrl: image.dataUrl,
      width: 1,
      height: 1,
      pintaImage: derivation,
      libRevision: 7,
    },
  })
})

test('selection for a different drawing is refused before export or any personal save', async () => {
  const h = await harness(),
    request = imageRequest()
  request.recipe.drawingId = 'another'
  const error = await h
    .adapter()
    .import('drawing', { image: request })
    .then(
      () => null,
      (error: unknown) => error,
    )
  expect(error).toBeInstanceOf(Error)
  expect(exports).toEqual([])
  expect(savedValues).toEqual([])
})
